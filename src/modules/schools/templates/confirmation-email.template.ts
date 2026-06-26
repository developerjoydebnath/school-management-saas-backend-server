export function getConfirmationEmailTemplate(
  schoolName: string,
  adminName: string,
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2>Application Received ✅</h2>
      <p>Dear ${adminName},</p>
      <p>Thank you for applying to join <strong>EduCore</strong>. We have received your request for <strong>${schoolName}</strong>.</p>
      <p>Our team will review your application and get back to you within 2–3 business days.</p>
      <p>— The EduCore Team</p>
    </div>
  `;
}
