export function getWelcomeEmailTemplate(
  schoolName: string,
  subdomain: string,
  contactEmail: string,
  tempPassword: string,
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2>Welcome to EduCore, ${schoolName}! 🎉</h2>
      <p>Your school account has been successfully set up.</p>
      <hr />
      <h3>Login Details</h3>
      <p><strong>URL:</strong> <a href="https://${subdomain}">https://${subdomain}</a></p>
      <p><strong>Email:</strong> ${contactEmail}</p>
      <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
      <p style="color: #e53e3e;">⚠️ Please change your password immediately after first login.</p>
      <hr />
      <p>If you have any questions, reply to this email.</p>
      <p>— The EduCore Team</p>
    </div>
  `;
}
