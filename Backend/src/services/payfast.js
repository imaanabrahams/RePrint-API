import crypto from 'crypto';

const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '10000100';
const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a';
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';
const IS_SANDBOX = process.env.PAYFAST_SANDBOX !== 'false';
const USE_LOCAL_SIMULATOR = process.env.PAYFAST_USE_LOCAL_SIMULATOR !== 'false';

export const PAYFAST_HOST = IS_SANDBOX ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';

function buildSignature(fields, passphrase = '') {
  let pairs = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim()).replace(/%20/g, '+')}`);

  let str = pairs.join('&');
  if (passphrase) str += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;

  return crypto.createHash('md5').update(str).digest('hex');
}

export function buildPaymentRequest({ paymentId, amount, itemName, customerName, customerEmail, returnUrl, cancelUrl, notifyUrl }) {
  const [name_first, ...rest] = (customerName || 'RePrint Customer').split(' ');
  const name_last = rest.join(' ') || 'Customer';

  const fields = {
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    name_first,
    name_last,
    email_address: customerEmail,
    m_payment_id: String(paymentId),
    amount: Number(amount).toFixed(2),
    item_name: itemName.slice(0, 100),
  };

  fields.signature = buildSignature(fields, PASSPHRASE);

  return {
    action: USE_LOCAL_SIMULATOR ? '/payfast-sandbox' : `https://${PAYFAST_HOST}/eng/process`,
    useLocalSimulator: USE_LOCAL_SIMULATOR,
    fields,
  };
}

export function verifyItnSignature(body) {
  const { signature, ...rest } = body;
  return buildSignature(rest, PASSPHRASE) === signature;
}

export function isConfigured() {
  return Boolean(MERCHANT_ID && MERCHANT_KEY);
}

export function signFields(fields) {
  return buildSignature(fields, PASSPHRASE);
}