import "dotenv/config";

let executionMode = (process.env.EXECUTION_MODE || "SHADOW").toUpperCase();

export function getExecutionMode() {
  return executionMode;
}

export function setExecutionMode(mode) {
  const allowedModes = ["SHADOW", "TEST"];

  if (!allowedModes.includes(mode)) {
    throw new Error(`Invalid execution mode: ${mode}`);
  }

  executionMode = mode;

  return executionMode;
}

export function isShadowMode() {
  return executionMode === "SHADOW";
}

export function isTestMode() {
  return executionMode === "TEST";
}