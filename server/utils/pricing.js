const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const fromPaise = (paise) => paise / 100;

/** Totals are always computed from database prices, never from the browser. */
function calculateTotals(lines, deliveryCharge = 0) {
  const subtotalPaise = lines.reduce((sum, l) => sum + toPaise(l.unitPrice) * l.quantity, 0);
  const deliveryPaise = toPaise(deliveryCharge);
  return {
    subtotal: fromPaise(subtotalPaise),
    deliveryCharge: fromPaise(deliveryPaise),
    total: fromPaise(subtotalPaise + deliveryPaise),
  };
}

module.exports = { toPaise, fromPaise, calculateTotals };
