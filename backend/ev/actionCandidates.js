export const ACTIONS = {
  DO_NOTHING: "DO_NOTHING",
  RETRY: "RETRY",
  RETRY_AFTER_DELAY: "RETRY_AFTER_DELAY",
  PAYMENT_LINK: "PAYMENT_LINK"
};

export const candidateActions = [
  {
    action: ACTIONS.DO_NOTHING,
    cost: 0
  },
  {
    action: ACTIONS.RETRY,
    cost: 10
  },
  {
    action: ACTIONS.RETRY_AFTER_DELAY,
    cost: 5
  },
  {
    action: ACTIONS.PAYMENT_LINK,
    cost: 5
  }
];