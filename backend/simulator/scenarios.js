export const scenarios = {
  NORMAL: {
    name: "Normal Traffic"
  },
  BANK_FAILURE: {
    name: "Bank Failure"
  },
  FRICTION: {
    name: "Customer Friction"
  },
  SYSTEMIC_FAILURE: {
    name: "Systemic Failure"
  }
};

let currentScenario = "NORMAL";

export function setScenario(scenario) {
  if (!scenarios[scenario]) {
    throw new Error(`Unknown scenario: ${scenario}`);
  }

  currentScenario = scenario;
}

export function getScenario() {
  return currentScenario;
}