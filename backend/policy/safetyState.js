let merchantKillSwitch = false;

let circuitBreakerOpen = false;

export function getSafetyState() {
  return {
    merchantKillSwitch,
    circuitBreakerOpen
  };
}

export function setKillSwitch(enabled) {
  merchantKillSwitch = Boolean(enabled);

  return getSafetyState();
}

export function setCircuitBreaker(open) {
  circuitBreakerOpen = Boolean(open);

  return getSafetyState();
}

export function isKillSwitchActive() {
  return merchantKillSwitch;
}

export function isCircuitBreakerOpen() {
  return circuitBreakerOpen;
}