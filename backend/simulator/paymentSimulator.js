import crypto from "crypto";

export function generatePayment(scenario = "NORMAL") {
  const amount = Math.floor(Math.random() * 4500) + 500;

  let status = "SUCCESS";
  let errorCode = null;

  const random = Math.random();

  switch (scenario) {
    case "BANK_FAILURE":
      if (random < 0.45) {
        status = "FAILED";
        errorCode = "E01";
      }
      break;

    case "FRICTION":
      if (random < 0.35) {
        status = "FAILED";
        errorCode = "E02";
      }
      break;

    case "SYSTEMIC_FAILURE":
      if (random < 0.75) {
        status = "FAILED";
        errorCode = "E99";
      }
      break;

    case "NORMAL":
    default:
      if (random < 0.08) {
        status = "FAILED";
        errorCode = "E03";
      }
      break;
  }

  return {
  paymentId: `pay_${crypto.randomUUID()}`,
  merchantId: `merchant_${Math.floor(Math.random() * 5) + 1}`,
  customerId: `customer_${Math.floor(Math.random() * 100) + 1}`,
  amount,
  status,
  errorCode,
  retryCount: 0,
  timestamp: new Date().toISOString(),

  // TEMPORARY: Phase 6 Razorpay testing

};
}