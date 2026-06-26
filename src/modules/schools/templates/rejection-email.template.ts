export function getRejectionEmailTemplate(
  schoolName: string,
  adminName: string,
  reason?: string,
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2>Application Update</h2>
      <p>Dear ${adminName},</p>
      <p>We have reviewed your application for <strong>${schoolName}</strong> and unfortunately we are unable to approve it at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>You may re-apply after addressing the stated concerns. If you believe this is an error, please contact our support team.</p>
      <p>— The EduCore Team</p>
    </div>
  `;
}
