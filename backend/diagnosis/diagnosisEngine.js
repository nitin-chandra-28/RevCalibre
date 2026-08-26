export const DIAGNOSIS_RULES = {
  E01: {
    category: "BANK_OR_TEMPORARY_SYSTEM_ISSUE",
    explanation: "Payment failures are dominated by E01, suggesting temporary bank or system degradation."
  },

  E02: {
    category: "CUSTOMER_PAYMENT_FRICTION",
    explanation: "Payment failures are dominated by E02, suggesting customer-side payment friction."
  },

  E03: {
    category: "INSUFFICIENT_FUNDS",
    explanation: "Payment failures are dominated by E03, suggesting insufficient customer funds."
  },

  E99: {
    category: "SYSTEMIC_GATEWAY_FAILURE",
    explanation: "Payment failures are dominated by E99, suggesting a systemic gateway or infrastructure failure."
  }
};

export function diagnose(anomalyResult) {
  if (!anomalyResult.anomaly) {
    return {
      category: "NO_ACTIVE_INCIDENT",
      explanation: "Payment health is within the expected range.",
      supportingEvidence: []
    };
  }

  const distribution = anomalyResult.errorDistribution;
  const entries = Object.entries(distribution);

  if (entries.length === 0) {
    return {
      category: "UNKNOWN_FAILURE",
      explanation: "Payment health degraded but no dominant error code was observed.",
      supportingEvidence: []
    };
  }

  // Sort error codes by their occurrence count in descending order
  entries.sort((a, b) => b[1] - a[1]);

  const [dominantCode, dominantCount] = entries[0];
  const rule = DIAGNOSIS_RULES[dominantCode];

  if (!rule) {
    return {
      category: "UNKNOWN_FAILURE",
      explanation: `Anomaly detected with dominant error code ${dominantCode}.`,
      supportingEvidence: [
        {
          errorCode: dominantCode,
          occurrences: dominantCount
        }
      ]
    };
  }

  return {
    category: rule.category,
    explanation: rule.explanation,
    supportingEvidence: [
      { errorCode: dominantCode, occurrences: dominantCount },
      { baselineSuccessRate: anomalyResult.baseline.successRate },
      { currentSuccessRate: anomalyResult.current.successRate },
      { successRateDrop: anomalyResult.successRateDrop }
    ]
  };
}

export default {
  DIAGNOSIS_RULES,
  diagnose
};