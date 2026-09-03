import { ACTIONS } from "./actionCandidates.js";

export function calculateProbability(
  payment,
  diagnosis,
  action,
  mlProbability
) {
  const baseProbability =
    Number.isFinite(mlProbability)
      ? mlProbability
      : 0;

  let adjustment = 0;

  switch (action) {

    case ACTIONS.DO_NOTHING:
      return 0;

    case ACTIONS.RETRY:
      adjustment = getRetryAdjustment(
        payment.errorCode
      );
      break;

    case ACTIONS.RETRY_AFTER_DELAY:
      adjustment = getDelayedRetryAdjustment(
        payment.errorCode
      );
      break;

    case ACTIONS.PAYMENT_LINK:
      adjustment = getPaymentLinkAdjustment(
        payment.errorCode
      );
      break;

    default:
      return 0;
  }

  // Penalize repeated retries
  if (
    action === ACTIONS.RETRY &&
    payment.retryCount >= 1
  ) {
    adjustment -= 0.10;
  }

  if (
    action === ACTIONS.RETRY_AFTER_DELAY &&
    payment.retryCount >= 1
  ) {
    adjustment -= 0.05;
  }

  const probability =
    baseProbability + adjustment;

  return Number(
    Math.max(0, Math.min(1, probability)).toFixed(2)
  );
}


function getRetryAdjustment(errorCode) {

  switch (errorCode) {

    // ML 65% → approximately 75%
    case "E01":
      return 0.10;

    case "E02":
      return -0.10;

    case "E03":
      return -0.15;

    case "E99":
      return 0.00;

    default:
      return 0.00;
  }
}


function getDelayedRetryAdjustment(errorCode) {

  switch (errorCode) {

    case "E01":
      return 0.00;

    case "E02":
      return -0.05;

    case "E03":
      return -0.15;

    case "E99":
      return 0.00;

    default:
      return 0.00;
  }
}


function getPaymentLinkAdjustment(errorCode) {

  switch (errorCode) {

    case "E01":
      return -0.05;

    case "E02":
      return 0.05;

    case "E03":
      return -0.10;

    case "E99":
      return 0.00;

    default:
      return 0.00;
  }
}