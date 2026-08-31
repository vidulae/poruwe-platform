// Payment adapters. Three methods share one interface:
//   manual  — bank transfer + admin verification (always available)
//   payhere — Sri Lankan card/mobile gateway, auto-activates on verified webhook
//   stripe  — stub, ready to plug in once a US Stripe account exists
'use strict';
const crypto = require('crypto');

function md5U(s) { return crypto.createHash('md5').update(s).digest('hex').toUpperCase(); }
function amountFmt(n) { return (Math.round(Number(n) || 0)).toFixed(2); }

function availableMethods(settings, priceLkr) {
  const methods = [];
  if (Number(priceLkr) === 0) return ['free'];
  methods.push('manual');
  const ph = settings.payhere || {};
  if (ph.merchantId && ph.merchantSecret) methods.push('payhere');
  // stripe: intentionally absent until credentials are configured
  return methods;
}

// Build the auto-submitting checkout form fields for PayHere
function payhereCheckout(order, template, settings, baseUrl) {
  const ph = settings.payhere || {};
  const amount = amountFmt(template.price_lkr);
  const currency = 'LKR';
  const hash = md5U(ph.merchantId + order.order_no + amount + currency + md5U(ph.merchantSecret));
  const customer = (order.data && order.data.customer) || {};
  return {
    action: ph.sandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout',
    fields: {
      merchant_id: ph.merchantId,
      return_url: `${baseUrl}/status/${order.token}`,
      cancel_url: `${baseUrl}/status/${order.token}`,
      notify_url: `${baseUrl}/api/payments/payhere/notify`,
      order_id: order.order_no,
      items: `Poruwe — ${template.name}`,
      currency,
      amount,
      first_name: customer.name || 'Guest',
      last_name: '',
      email: customer.email || 'guest@poruwe.app',
      phone: customer.wa || '',
      address: '', city: '', country: 'Sri Lanka',
      hash,
    },
  };
}

// Verify a PayHere server-to-server notification. Returns true when authentic + success.
function payhereVerify(body, settings) {
  const ph = settings.payhere || {};
  if (!ph.merchantId || !ph.merchantSecret) return false;
  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = body || {};
  if (merchant_id !== ph.merchantId) return false;
  const local = md5U(merchant_id + order_id + payhere_amount + payhere_currency + status_code + md5U(ph.merchantSecret));
  return local === String(md5sig || '').toUpperCase() && String(status_code) === '2';
}

// ---- Stripe (future) -------------------------------------------------------
// When the US Stripe account exists: add settings.stripe = {secretKey, publishableKey,
// webhookSecret}, implement createCheckoutSession(order, template, baseUrl) with the
// stripe SDK, add it to availableMethods(), and handle /api/payments/stripe/webhook
// (checkout.session.completed -> markPaid + activate). The order/receipt flow needs
// no other changes.
const stripe = { enabled: false };

module.exports = { availableMethods, payhereCheckout, payhereVerify, stripe, amountFmt };
