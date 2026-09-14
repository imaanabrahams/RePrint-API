import nodemailer from 'nodemailer';

let transporterPromise = null;
let usingEthereal = false;

function buildTransporter() {
  if (process.env.EMAIL_HOST) {
    return Promise.resolve(
      nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: process.env.EMAIL_USER
          ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
          : undefined,
      })
    );
  }
  usingEthereal = true;
  return nodemailer.createTestAccount().then((testAccount) =>
    nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    })
  );
}

function getTransporter() {
  if (!transporterPromise) transporterPromise = buildTransporter();
  return transporterPromise;
}

const FROM = process.env.EMAIL_FROM || '"RePrint 3D" <noreply@reprint.co.za>';

function wrapHtml(title, bodyHtml) {
  return `
<div style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6f4;padding:32px 0;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
    <div style="background:#558564;padding:22px 28px;">
      <span style="color:#fff;font-size:20px;font-weight:800;">RePrint 3D</span>
    </div>
    <div style="padding:28px;color:#2b2b2b;font-size:15px;line-height:1.55;">
      <h2 style="margin:0 0 14px;color:#2b2b2b;font-size:19px;">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:16px 28px;background:#f4f6f4;color:#8a8a8a;font-size:12px;">
      RePrint 3D Printing &middot; this is a demo transactional email.
    </div>
  </div>
</div>`;
}

async function sendMail({ to, subject, html, text }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from: FROM, to, subject, text: text || subject, html });

  if (usingEthereal) {
    console.log(`\n[email] "${subject}" -> ${to}`);
    console.log(`[email] preview: ${nodemailer.getTestMessageUrl(info)}\n`);
    return { queued: true, previewUrl: nodemailer.getTestMessageUrl(info) };
  }
  console.log(`[email] "${subject}" -> ${to} (messageId: ${info.messageId})`);
  return { queued: true, messageId: info.messageId };
}

export async function sendWelcomeEmail({ name, email, verificationUrl }) {
  const html = wrapHtml('Welcome to RePrint', `
    <p>Hi ${name},</p>
    <p>Thanks for creating a RePrint account.</p>
    ${verificationUrl ? `
      <p>Please confirm your email address:</p>
      <p style="text-align:center;margin:26px 0;">
        <a href="${verificationUrl}" style="background:#558564;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:600;">Verify email address</a>
      </p>
      <p style="color:#8a8a8a;font-size:13px;">Link: ${verificationUrl}</p>
    ` : `<p>You're all set — head to your dashboard.</p>`}
  `);
  return sendMail({ to: email, subject: 'Welcome to RePrint 3D — confirm your email', html });
}

export async function sendPasswordResetEmail({ name, email, resetUrl }) {
  const html = wrapHtml('Reset your password', `
    <p>Hi ${name || 'there'},</p>
    <p>This link expires in 1 hour.</p>
    <p style="text-align:center;margin:26px 0;">
      <a href="${resetUrl}" style="background:#558564;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:600;">Reset password</a>
    </p>
    <p style="color:#8a8a8a;font-size:13px;">If you didn't request this, ignore this email.</p>
  `);
  return sendMail({ to: email, subject: 'Reset your RePrint password', html });
}

export async function sendOrderConfirmationEmail({ name, email, order }) {
  const html = wrapHtml('Order confirmed', `
    <p>Hi ${name},</p>
    <p>We've received your order <strong>#${order.id}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;">
      <tr><td style="padding:6px 0;color:#8a8a8a;">Quantity</td><td style="padding:6px 0;text-align:right;">${order.quantity}</td></tr>
      <tr><td style="padding:6px 0;color:#8a8a8a;">Total</td><td style="padding:6px 0;text-align:right;font-weight:700;">R${Number(order.total_price).toFixed(2)}</td></tr>
    </table>
  `);
  return sendMail({ to: email, subject: `Order #${order.id} confirmed — RePrint 3D`, html });
}

export async function sendPaymentReceiptEmail({ name, email, payment, order }) {
  const success = payment.status === 'completed';
  const html = wrapHtml(success ? 'Payment received ✅' : 'Payment failed ❌', `
    <p>Hi ${name},</p>
    <p>${success
      ? `Your payment for order <strong>#${order?.id ?? payment.order_id}</strong> was successful.`
      : `Your payment for order <strong>#${order?.id ?? payment.order_id}</strong> could not be processed.`}</p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;">
      <tr><td style="padding:6px 0;color:#8a8a8a;">Reference</td><td style="padding:6px 0;text-align:right;">${payment.transaction_id || payment.pf_payment_id || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#8a8a8a;">Method</td><td style="padding:6px 0;text-align:right;text-transform:capitalize;">${payment.method}</td></tr>
      <tr><td style="padding:6px 0;color:#8a8a8a;">Amount</td><td style="padding:6px 0;text-align:right;font-weight:700;">R${Number(payment.amount).toFixed(2)}</td></tr>
    </table>
  `);
  return sendMail({
    to: email,
    subject: success ? `Payment received for order #${order?.id ?? payment.order_id}` : `Payment failed for order #${order?.id ?? payment.order_id}`,
    html,
  });
}

export async function sendConsultationEmail({ name, email, consultation }) {
  const html = wrapHtml('Consultation request received', `
    <p>Hi ${name},</p>
    <p>We received your ${consultation.consultation_type} consultation request about "${consultation.topic}".</p>
  `);
  return sendMail({ to: email, subject: 'Consultation request received — RePrint 3D', html });
}