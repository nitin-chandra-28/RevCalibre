import { razorpay } from "./razorpayClient.js";

export async function createRecoveryPaymentLink({
  payment,
  recoveryDecision
}) {
  if (!payment) {
    throw new Error("Payment is required");
  }

  if (!recoveryDecision) {
    throw new Error("Recovery decision is required");
  }

const referenceId = `rec_${payment.paymentId.slice(-30)}`;

  const options = {
    amount: Math.round(Number(payment.amount) * 100),
    currency: "INR",

    reference_id: referenceId,

    description: `Recovery payment for ${payment.paymentId}`,

    notes: {
      recovery_payment_id: payment.paymentId,
      merchant_id: payment.merchantId,
      customer_id: payment.customerId,
      recovery_action: recoveryDecision.selectedAction
    }
  };

  const paymentLink = await razorpay.paymentLink.create(options);

  return {
    id: paymentLink.id,
    shortUrl: paymentLink.short_url,
    status: paymentLink.status,
    amount: paymentLink.amount,
    currency: paymentLink.currency,
    referenceId: paymentLink.reference_id
  };
}