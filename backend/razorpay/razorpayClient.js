import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.warn(
    "Razorpay credentials are not configured. Test execution will be unavailable."
  );
}

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});