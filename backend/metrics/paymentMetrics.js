export function calculateMetrics(payments, cumulativeRevenue = null) {
  if (!payments || payments.length === 0) {
    return {
      totalPayments: 0,
      successfulPayments: 0,
      failedPayments: 0,
      successRate: 0,
      failureRate: 0,
      revenue: cumulativeRevenue || 0,
      revenuePerMinute: cumulativeRevenue || 0
    };
  }

  const successfulPayments = payments.filter(
    payment => payment.status === "SUCCESS" || payment.status === "RECOVERED" || payment.experimentOutcome === "RECOVERED"
  );

  const failedPayments = payments.filter(
    payment => payment.status === "FAILED" && payment.experimentOutcome !== "RECOVERED"
  );

  const windowRevenue = payments.reduce((total, payment) => {
    if (payment.status === "SUCCESS" || payment.status === "RECOVERED" || payment.experimentOutcome === "RECOVERED") {
      return total + (payment.recoveredAmount || payment.amount || 0);
    }
    return total;
  }, 0);

  const finalRevenue = (cumulativeRevenue !== null && cumulativeRevenue !== undefined) 
    ? cumulativeRevenue 
    : windowRevenue;

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
    revenue: finalRevenue,
    revenuePerMinute: finalRevenue
  };
}