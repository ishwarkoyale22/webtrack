const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Mirrors the Payment model virtuals so aggregates/plain objects stay consistent. */
function derivePayment(p) {
  if (!p) {
    return { totalPrice: 0, gstEnabled: false, gstRate: 0, gstAmount: 0, grandTotal: 0, received: 0, pending: 0, status: 'Pending' };
  }
  const totalPrice = round2(p.totalPrice);
  const gstRate = Number(p.gstRate) || 0;
  const gstAmount = p.gstEnabled ? round2((totalPrice * gstRate) / 100) : 0;
  const grandTotal = round2(totalPrice + gstAmount);
  const received = round2((p.history || []).reduce((a, e) => a + (e.amount || 0), 0));
  const pending = round2(Math.max(grandTotal - received, 0));
  const status = grandTotal > 0 && received >= grandTotal ? 'Paid' : received > 0 ? 'Partial' : 'Pending';
  return { totalPrice, gstEnabled: !!p.gstEnabled, gstRate, gstAmount, grandTotal, received, pending, status };
}

module.exports = { round2, derivePayment };
