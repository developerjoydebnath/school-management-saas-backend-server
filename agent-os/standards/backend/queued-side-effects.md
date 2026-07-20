# Queued Side Effects

## Rule

Mail sending, SMS sending, push notifications, webhooks, and similar side-effect work must never block the main business workflow.

The API must complete the core database transaction first, return the business response immediately, and enqueue the side-effect work for background execution.

## Mail Delivery

All mail delivery must go through the backend mail queue module. Do not call `nodemailer.createTransport()` or `sendMail()` directly from feature services or controllers.

Required flow:

1. Complete the business operation, such as creating a school, submitting an admission application, marking an application eligible, approving an application, or recording a payment.
2. Enqueue the mail job through `MailQueueService`.
3. Return the API response without waiting for SMTP delivery.
4. Let the queue processor deliver the message using the resolved platform or school mail configuration.

```typescript
const result = await this.mailQueueService.enqueue({
  scope: 'platform',
  to: recipientEmail,
  subject,
  html,
});

if (!result.queued) {
  this.logger.warn(`Mail not queued: ${result.reason}`);
}
```

## BullMQ

BullMQ is the standard queue driver for mail and similar background work.

- Use BullMQ when queue configuration is enabled.
- Do not build custom in-request async mail senders inside feature services.
- Do not make user-facing workflows fail only because mail, SMS, or notification configuration is missing.
- If mail is not configured, skip the mail job safely and log/report the skipped reason.
- If queue infrastructure is temporarily unavailable, the primary workflow should still complete unless the queue job itself is the requested operation.

## Configuration Source

Mail credentials must come from the configured mail settings tables, not from `.env` SMTP values.

- Platform/software-triggered mail uses platform mail configuration.
- School/tenant-triggered mail uses school mail configuration when enabled and verified.
- If a school uses the system/default mail option, resolve the platform mail configuration without exposing platform credentials to the school.

Environment variables may still be used for infrastructure settings such as Redis host/port, application base URLs, and local development feature flags. They must not be treated as the source of truth for editable SMTP credentials.

## User Experience

Do not keep admins, school staff, students, or parents waiting while mail or notification delivery happens.

Good behavior:

- "School created successfully" returns immediately after DB work finishes.
- Welcome email is queued in the background.
- If mail is skipped, the workflow still succeeds and logs or returns a secondary warning where appropriate.

Bad behavior:

- A school creation request waits for SMTP delivery.
- An admission approval fails because mail is not configured.
- A feature service creates its own nodemailer transporter from `.env`.

## Why

Mail/SMS gateways are external systems and can be slow, down, rate-limited, or misconfigured. Production SaaS workflows must keep core database changes reliable and fast while treating communication delivery as retryable background work.
