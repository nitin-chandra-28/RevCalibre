import { candidateActions, ACTIONS } from "./actionCandidates.js";
import { predictRecoveryProbability } from "../services/mlService.js";
import { calculateProbability } from "./probabilityEngine.js";

export async function calculateRecoveryDecision(payment, diagnosis) {
  const paymentValue = Number(payment.amount) || 0;
  const probabilitySuccess = await predictRecoveryProbability(payment);

 const evaluatedActions = candidateActions.map((candidate) => {
  const probability = calculateProbability(
    payment,
    diagnosis,
    candidate.action,
    probabilitySuccess
  );

  const expectedValue =
    probability * paymentValue - candidate.cost;;

    return {
      action: candidate.action,
      probability,
      probabilityPercent: Math.round(probability * 100),
      paymentValue,
      cost: candidate.cost,
      expectedValue: Number(expectedValue.toFixed(2))
    };
  });

  const bestAction = evaluatedActions.reduce(
  (best, current) => {

    if (
      current.expectedValue > best.expectedValue
    ) {
      return current;
    }

    if (
      current.expectedValue === best.expectedValue &&
      current.action === ACTIONS.PAYMENT_LINK
    ) {
      return current;
    }

    return best;
  },
  evaluatedActions[0]
);

  const forcedAction = payment?.forceRecoveryAction;
  const allowedForcedAction =
    typeof forcedAction === "string" &&
    evaluatedActions.some(
      (candidate) => candidate.action === forcedAction
    );

  const selectedCandidate = allowedForcedAction
    ? evaluatedActions.find(
        (candidate) => candidate.action === forcedAction
      )
    : bestAction;

  const decision = {
    paymentId: payment.paymentId,
    paymentValue,
    probabilitySuccess,
    diagnosis,
    candidates: evaluatedActions,
    selectedAction: selectedCandidate.action,
    selectedProbability: selectedCandidate.probability,
    selectedExpectedValue: selectedCandidate.expectedValue
  };

  console.info("Recovery prediction result", {
    paymentId: decision.paymentId,
    probabilitySuccess: decision.probabilitySuccess,
    selectedAction: decision.selectedAction,
    ev: decision.selectedExpectedValue
  });

  return decision;
}