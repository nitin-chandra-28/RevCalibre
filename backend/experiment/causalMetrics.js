import {
  EXPERIMENT_GROUPS
} from "./experimentAssignment.js";

export function calculateCausalMetrics(payments = []) {
  const agentPayments = payments.filter(
    (payment) =>
      payment.experimentGroup === EXPERIMENT_GROUPS.AGENT
  );

  const controlPayments = payments.filter(
    (payment) =>
      payment.experimentGroup === EXPERIMENT_GROUPS.CONTROL
  );

  const agentFailed = agentPayments.filter(
    (payment) => payment.status === "FAILED"
  );

  const controlFailed = controlPayments.filter(
    (payment) => payment.status === "FAILED"
  );

  const agentRecovered = agentPayments.filter(
    (payment) =>
      payment.experimentOutcome === "RECOVERED"
  );

  const controlRecovered = controlPayments.filter(
    (payment) =>
      payment.experimentOutcome === "RECOVERED"
  );

  const agentRecoveryRate =
    agentFailed.length > 0
      ? agentRecovered.length / agentFailed.length
      : 0;

  const controlRecoveryRate =
    controlFailed.length > 0
      ? controlRecovered.length / controlFailed.length
      : 0;

  const agentRecoveredRevenue =
    agentRecovered.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  const controlRecoveredRevenue =
    controlRecovered.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  /*
   * Estimate how much revenue the Agent population
   * would have recovered naturally using the Control
   * group's recovery rate.
   */
  const expectedControlRecoveryRevenue =
    agentFailed.reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount || 0) *
        controlRecoveryRate,
      0
    );

  const incrementalRevenue =
    agentRecoveredRevenue -
    expectedControlRecoveryRevenue;

  return {
    agent: {
      total: agentPayments.length,
      failed: agentFailed.length,
      recovered: agentRecovered.length,
      recoveryRate: Number(
        (agentRecoveryRate * 100).toFixed(2)
      ),
      recoveredRevenue: Number(
        agentRecoveredRevenue.toFixed(2)
      )
    },

    control: {
      total: controlPayments.length,
      failed: controlFailed.length,
      recovered: controlRecovered.length,
      recoveryRate: Number(
        (controlRecoveryRate * 100).toFixed(2)
      ),
      recoveredRevenue: Number(
        controlRecoveredRevenue.toFixed(2)
      )
    },

    expectedControlRecoveryRevenue: Number(
      expectedControlRecoveryRevenue.toFixed(2)
    ),

    incrementalRevenue: Number(
      incrementalRevenue.toFixed(2)
    )
  };
}