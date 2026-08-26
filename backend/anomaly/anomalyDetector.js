export function calculateSuccessRate(payments) {
  if (payments.length === 0) return 0;

  const successful = payments.filter(
    payment => payment.status === "SUCCESS"
  ).length;

  return (successful / payments.length) * 100;
}

export function calculateRevenue(payments) {
  return payments
    .filter(payment => payment.status === "SUCCESS")
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function calculateErrorDistribution(payments) {
  const distribution = {};

  payments
    .filter(payment => payment.status === "FAILED")
    .forEach(payment => {
      const code = payment.errorCode || "UNKNOWN";

      distribution[code] = (distribution[code] || 0) + 1;
    });

  return distribution;
}

export function detectAnomaly(payments) {
  const BASELINE_SIZE = 30;
  const CURRENT_SIZE = 10;

  if (payments.length < BASELINE_SIZE + CURRENT_SIZE) {
    return {
      anomaly: false,
      reason: "INSUFFICIENT_DATA"
    };
  }

  const baseline = payments.slice(
    -(BASELINE_SIZE + CURRENT_SIZE),
    -CURRENT_SIZE
  );

  const current = payments.slice(-CURRENT_SIZE);

  const baselineSuccessRate = calculateSuccessRate(baseline);
  const currentSuccessRate = calculateSuccessRate(current);

  const baselineRevenue = calculateRevenue(baseline);
  const currentRevenue = calculateRevenue(current);

  const baselineRevenuePerPayment = baselineRevenue / baseline.length;
  const currentRevenuePerPayment = currentRevenue / current.length;

  const successRateDrop = baselineSuccessRate - currentSuccessRate;
  const revenueDrop = baselineRevenuePerPayment - currentRevenuePerPayment;

  const anomaly =
    successRateDrop >= 15 ||
    (
      baselineRevenuePerPayment > 0 &&
      revenueDrop / baselineRevenuePerPayment >= 0.30
    );

  return {
    anomaly,

    baseline: {
      successRate: Number(baselineSuccessRate.toFixed(2)),
      revenuePerPayment: Number(baselineRevenuePerPayment.toFixed(2))
    },

    current: {
      successRate: Number(currentSuccessRate.toFixed(2)),
      revenuePerPayment: Number(currentRevenuePerPayment.toFixed(2))
    },

    successRateDrop: Number(successRateDrop.toFixed(2)),
    revenueDrop: Number(revenueDrop.toFixed(2)),

    errorDistribution: calculateErrorDistribution(current)
  };
}

export default {
  calculateSuccessRate,
  calculateRevenue,
  calculateErrorDistribution,
  detectAnomaly
};