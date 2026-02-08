import QRCode from 'qrcode'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
    return true
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const attachments: { filename: string; content: Buffer; content_id: string }[] = []

    const ticketBlocks = await Promise.all(
      data.tickets.map(async (t, i) => {
        const contentId = `qr-ticket-${i}`
        const qrBuffer = await QRCode.toBuffer(t.qrCode, {
          width: 280,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
          type: 'png',
        })

        attachments.push({
          filename: `${t.displayCode}.png`,
          content: qrBuffer,
          content_id: contentId,
        })

        return `
          <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:16px;text-align:center;">
            <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(t.typeName)}</p>
            <p style="margin:0 0 16px;color:#D4AF37;font-family:monospace;font-size:24px;font-weight:bold;letter-spacing:2px;">${escapeHtml(t.displayCode)}</p>
            <img src="cid:${contentId}" width="280" height="280" alt="QR Code ${escapeHtml(t.displayCode)}" style="display:block;margin:0 auto;border-radius:8px;" />
            <p style="margin:12px 0 0;color:#666;font-size:11px;">Show this QR code at the door</p>
          </div>`
      })
    )

    const html = `
      <div style="max-width:600px;margin:0 auto;background:#0A0A0F;color:#fff;font-family:system-ui,-apple-system,sans-serif;">
        <div style="padding:32px;text-align:center;border-bottom:1px solid #2a2a2a;">
          <h1 style="color:#D4AF37;font-size:28px;margin:0;">TAJ MAHAL</h1>
          <p style="color:#888;margin:8px 0 0;">Sharm El Sheikh</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;margin:0 0 8px;">Order Confirmed!</h2>
          <p style="color:#888;margin:0 0 24px;">Hi ${escapeHtml(data.customerName)}, your tickets are ready.</p>

          <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 4px;color:#888;font-size:13px;">Order Number</p>
            <p style="margin:0;color:#D4AF37;font-size:20px;font-weight:bold;font-family:monospace;">${escapeHtml(data.orderNumber)}</p>
          </div>

          <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 4px;color:#888;font-size:13px;">Event</p>
            <p style="margin:0 0 4px;color:#fff;font-size:18px;font-weight:bold;">${escapeHtml(data.eventName)}</p>
            <p style="margin:0;color:#888;">${data.eventDate}</p>
          </div>

          <h3 style="color:#fff;margin:0 0 16px;">Your Tickets</h3>
          ${ticketBlocks.join('')}

          <div style="margin-top:24px;padding:16px;background:#111;border:1px solid #2a2a2a;border-radius:12px;text-align:right;">
            <p style="margin:0;color:#888;font-size:13px;">Total</p>
            <p style="margin:0;color:#D4AF37;font-size:24px;font-weight:bold;">${data.currency} ${data.total.toLocaleString()}</p>
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
      attachments,
    })

    return true
  } catch (error) {
    console.error('[Email] Failed to send confirmation:', error)
    return false
  }
}
