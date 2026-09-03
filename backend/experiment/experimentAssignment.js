const AGENT_RATIO = 0.80;

export const EXPERIMENT_GROUPS = {
  AGENT: "AGENT",
  CONTROL: "CONTROL"
};

export function assignExperimentGroup() {
  return Math.random() < AGENT_RATIO
    ? EXPERIMENT_GROUPS.AGENT
    : EXPERIMENT_GROUPS.CONTROL;
}

export function isAgentGroup(group) {
  return group === EXPERIMENT_GROUPS.AGENT;
}

export function isControlGroup(group) {
  return group === EXPERIMENT_GROUPS.CONTROL;
}