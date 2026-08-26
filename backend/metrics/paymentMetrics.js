export function calculateMetrics(payments) {
  if (payments.length === 0) {
    return {
      totalPayments: 0,
      successfulPayments: 0,
      failedPayments: 0,
      successRate: 0,
      failureRate: 0,
      revenue: 0,
      revenuePerMinute: 0
    };
  }

  const successfulPayments = payments.filter(
    payment => payment.status === "SUCCESS"
  );

  const failedPayments = payments.filter(
    payment => payment.status === "FAILED"
  );

  const revenue = successfulPayments.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  const successRate =
    (successfulPayments.length / payments.length) * 100;

  const failureRate =
    (failedPayments.length / payments.length) * 100;

  return {
    totalPayments: payments.length,
    successfulPayments: successfulPayments.length,
    failedPayments: failedPayments.length,
    successRate: Number(successRate.toFixed(2)),
    failureRate: Number(failureRate.toFixed(2)),
    revenue,
    revenuePerMinute: revenue
  };
}