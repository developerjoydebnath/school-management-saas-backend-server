export function getInvoiceTemplate(
  invoiceId: string,
  paymentDate: string,
  paymentMethod: string,
  transactionId: string | null,
  amount: string,
  currency: string,
  schoolName: string,
  schoolAddress: string,
  planName: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          margin: 0;
          padding: 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #eee;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          color: #2563eb;
          font-size: 32px;
        }
        .invoice-details {
          text-align: right;
          color: #666;
        }
        .invoice-details p {
          margin: 2px 0;
        }
        .addresses {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .addresses div {
          width: 48%;
        }
        .addresses h3 {
          margin-top: 0;
          color: #444;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }
        .table th, .table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .table th {
          background-color: #f8fafc;
          color: #444;
        }
        .total-row td {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #ddd;
        }
        .footer {
          text-align: center;
          color: #888;
          font-size: 12px;
          margin-top: 40px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>EduCore</h1>
          <p style="color: #666; margin: 5px 0;">Next-Gen School Management</p>
        </div>
        <div class="invoice-details">
          <h2 style="margin: 0; color: #444;">INVOICE</h2>
          <p><strong># ${invoiceId}</strong></p>
          <p>Date: ${paymentDate}</p>
        </div>
      </div>

      <div class="addresses">
        <div>
          <h3>Billed To</h3>
          <p><strong>${schoolName}</strong></p>
          <p style="white-space: pre-wrap;">${schoolAddress || 'N/A'}</p>
        </div>
        <div>
          <h3>Payment Information</h3>
          <p><strong>Method:</strong> <span style="text-transform: uppercase;">${paymentMethod}</span></p>
          <p><strong>Transaction ID:</strong> ${transactionId || 'N/A'}</p>
          <p><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">PAID</span></p>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: bold;">${planName}</div>
              <div style="font-size: 13px; color: #666; margin-top: 4px;">Subscription charge</div>
            </td>
            <td style="text-align: right;">${amount} ${currency}</td>
          </tr>
          <tr class="total-row">
            <td style="text-align: right;">Total Paid</td>
            <td style="text-align: right; color: #2563eb;">${amount} ${currency}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Thank you for choosing EduCore!</p>
        <p>If you have any questions regarding this invoice, please contact support at billing@educore.com</p>
      </div>
    </body>
    </html>
  `;
}
