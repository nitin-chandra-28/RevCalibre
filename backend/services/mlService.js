import "dotenv/config";

const DEFAULT_ML_SERVICE_URL = "http://127.0.0.1:8000";
const ML_SERVICE_URL =
  (process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL).replace(/\/$/, "");

export function buildPredictionPayload(payment = {}) {
  return {
    error_code: payment.errorCode ?? payment.error_code ?? null,
    amount: Number(payment.amount ?? 0),
    retry_count: Number(payment.retryCount ?? payment.retry_count ?? 0),
    gateway_health: Number(
      payment.gatewayHealth ?? payment.gateway_health ?? 0.5
    ),
    time_since_failure: Number(
      payment.timeSinceFailure ?? payment.time_since_failure ?? 0
    ),
    customer_history: Number(
      payment.customerHistory ?? payment.customer_history ?? 0.5
    ),
    previous_attempt_result: Number(
      payment.previousAttemptResult ?? payment.previous_attempt_result ?? 0
    )
  };
}

export function isValidProbability(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

export async function predictRecoveryProbability(payment) {
  const payload = buildPredictionPayload(payment);
  const url = `${ML_SERVICE_URL}/predict`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response?.ok) {
      throw new Error(
        `ML prediction request failed with status ${response?.status ?? "unknown"}`
      );
    }

    const data = await response.json();
    const probability = Number(data?.probability_success);

    if (!isValidProbability(probability)) {
      throw new Error(
        `ML service returned an invalid probability: ${data?.probability_success}`
      );
    }

    return probability;
  } catch (error) {
    console.error("ML service prediction failed, using calibrated empirical fallback:", {
      paymentId: payment?.paymentId,
      url,
      error: error.message
    });

    const errorCode = payment?.errorCode || payment?.error_code || "UNKNOWN";
    switch (errorCode) {
      case "E01":
        return 0.65;
      case "E02":
        return 0.45;
      case "E03":
        return 0.25;
      case "E99":
        return 0.15;
      default:
        return 0.40;
    }
  }
}
