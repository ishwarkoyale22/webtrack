const store = require('../store');
const Payment = require('../models/Payment');
const Client = require('../models/Client');
const { derivePayment } = require('./money');

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/2rcm65bjspyqq44yjnw44aspn6pe2ngs';

/**
 * Checks if payment status for a client has reached "Paid" (pending === 0).
 * Triggers Make.com webhook ONCE and sets paidWebhookSent = true on the payment doc.
 * Errors are caught and handled silently.
 */
async function checkAndTriggerPaidWebhook(clientId) {
  try {
    const _id = String(clientId);
    const payment = Payment.findByClient(_id);
    if (!payment || payment.paidWebhookSent) return;

    const derived = derivePayment(payment);
    if (derived.status === 'Paid' && derived.pending === 0) {
      // Mark as sent immediately to prevent duplicate triggers
      store.payments.update(payment, { paidWebhookSent: true });

      const client = Client.findById(_id);
      const project = store.projects.findOne({ client: _id });
      const domain = store.domains.findOne({ client: _id });

      const payload = {
        client_name: client?.name || '',
        phone: client?.phone || '',
        email: client?.email || '',
        website_name: project?.websiteName || '',
        domain_name: domain?.domainName || '',
        domain_price: Number(domain?.price) || 0,
        total_price: derived.totalPrice || 0,
        received: derived.received || 0,
        pending: derived.pending || 0,
        payment_status: 'Paid',
      };

      // Perform HTTP POST silently
      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error('Make.com webhook silent error:', err.message);
      });
    }
  } catch (err) {
    console.error('Make.com webhook trigger silent error:', err.message);
  }
}

module.exports = { checkAndTriggerPaidWebhook };
