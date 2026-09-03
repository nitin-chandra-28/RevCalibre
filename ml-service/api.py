from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field

BASE = Path(__file__).resolve().parent
MODEL_PATH = BASE / "models" / "calibrated_model.pkl"

if not MODEL_PATH.exists():
    raise RuntimeError(
        "Model not found. Run generate_data.py and train_model.py first."
    )

model = joblib.load(MODEL_PATH)

app = FastAPI(
    title="Payment Recovery ML Service",
    version="1.0.0",
)


class PaymentFeatures(BaseModel):
    error_code: str = Field(examples=["E01"])
    amount: float = Field(gt=0, examples=[1499.0])
    retry_count: int = Field(ge=0, le=2, examples=[0])
    gateway_health: float = Field(ge=0, le=1, examples=[0.91])
    time_since_failure: int = Field(ge=0, examples=[20])
    customer_history: float = Field(ge=0, le=1, examples=[0.83])
    previous_attempt_result: int = Field(ge=0, le=1, examples=[0])


@app.get("/health")
def health():
    return {"status": "ok", "model": "calibrated_payment_recovery_model"}


@app.post("/predict")
def predict(payment: PaymentFeatures):
    row = pd.DataFrame([payment.model_dump()])
    probability = float(model.predict_proba(row)[0][1])

    return {
        "probability_success": round(probability, 4)
    }
