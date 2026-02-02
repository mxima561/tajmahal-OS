/**
 * Email service stub.
 * When RESEND_API_KEY is set, this will send real emails via Resend.
 * Until then, it logs to console.
 */

interface OrderConfirmationEmail {
  to: string
  customerName: string
  orderNumber: string
  eventName: string
  eventDate: string
  tickets: {
    typeName: string
    displayCode: string
    qrCode: string
  }[]
  total: number
  currency: string
}

export async function sendOrderConfirmation(data: OrderConfirmationEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.log('[Email] RESEND_API_KEY not set. Would have sent confirmation to:', data.to)
    console.log('[Email] Order:', data.orderNumber, '| Event:', data.eventName, '| Tickets:', data.tickets.length)
    return true // Don't block the flow
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const ticketRows = data.tickets
      .map(
        (t) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#e5e5e5;">${t.typeName}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#D4AF37;font-family:monospace;font-size:18px;font-weight:bold;">${t.displayCode}</td>
          </tr>`
      )
      .join('')

    const html = `
      <div style="max-width:600px;margin:0 auto;background:#0A0A0F;color:#fff;font-family:system-ui,-apple-system,sans-serif;">
        <div style="padding:32px;text-align:center;border-bottom:1px solid #2a2a2a;">
          <h1 style="color:#D4AF37;font-size:28px;margin:0;">TAJ MAHAL</h1>
          <p style="color:#888;margin:8px 0 0;">Sharm El Sheikh</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;margin:0 0 8px;">Order Confirmed!</h2>
          <p style="color:#888;margin:0 0 24px;">Hi ${data.customerName}, your tickets are ready.</p>

          <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 4px;color:#888;font-size:13px;">Order Number</p>
            <p style="margin:0;color:#D4AF37;font-size:20px;font-weight:bold;font-family:monospace;">${data.orderNumber}</p>
          </div>

          <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 4px;color:#888;font-size:13px;">Event</p>
            <p style="margin:0 0 4px;color:#fff;font-size:18px;font-weight:bold;">${data.eventName}</p>
            <p style="margin:0;color:#888;">${data.eventDate}</p>
          </div>

          <h3 style="color:#fff;margin:0 0 12px;">Your Tickets</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:12px;text-transform:uppercase;border-bottom:1px solid #2a2a2a;">Type</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:12px;text-transform:uppercase;border-bottom:1px solid #2a2a2a;">Code</th>
              </tr>
            </thead>
            <tbody>${ticketRows}</tbody>
          </table>

          <div style="margin-top:24px;padding:16px;background:#111;border:1px solid #2a2a2a;border-radius:12px;text-align:right;">
            <p style="margin:0;color:#888;font-size:13px;">Total</p>
            <p style="margin:0;color:#D4AF37;font-size:24px;font-weight:bold;">${data.currency} ${(data.total / 100).toFixed(2)}</p>
          </div>

          <p style="margin:32px 0 0;color:#888;font-size:13px;text-align:center;">
            Show the QR code on your phone at the door for entry.<br/>
            If your phone is dead, give the staff your ticket code.
          </p>
        </div>
        <div style="padding:24px;text-align:center;border-top:1px solid #2a2a2a;">
          <p style="margin:0;color:#555;font-size:12px;">Taj Mahal · Naama Bay · Sharm El Sheikh</p>
        </div>
      </div>
    `

    await resend.emails.send({
      from: 'Taj Mahal Tickets <tickets@tajmahalsharm.com>',
      to: data.to,
      subject: `Your tickets for ${data.eventName} — Order ${data.orderNumber}`,
      html,
    })

    return true
  } catch (error) {
    console.error('[Email] Failed to send confirmation:', error)
    return false
  }
}
