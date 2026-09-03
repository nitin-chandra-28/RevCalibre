# Phase 7 ML Service

This is the minimal Phase 7 implementation for the Autonomous Payment Revenue Recovery Agent.

Pipeline:

Synthetic historical data
-> Logistic Regression
-> probability calibration
-> Brier Score + ECE + calibration curve
-> FastAPI /predict
-> Node.js EV Engine

## 1. Create environment

Windows:

    python -m venv .venv
    .venv\Scripts\activate

macOS/Linux:

    python3 -m venv .venv
    source .venv/bin/activate

## 2. Install

    pip install -r requirements.txt

## 3. Generate synthetic data

    python generate_data.py

Creates:

    data/payments.csv

## 4. Train and calibrate

    python train_model.py

Creates:

    models/calibrated_model.pkl
    models/metrics.json

The model uses an 80/20 train/test split. Calibration is performed only
within the training portion; the 20% test set remains held out for evaluation.

## 5. Start FastAPI

    uvicorn api:app --reload --port 8000

## 6. Test

Open:

    http://127.0.0.1:8000/docs

Use POST /predict.

Example JSON:

    {
      "error_code": "E01",
      "amount": 1499,
      "retry_count": 0,
      "gateway_health": 0.91,
      "time_since_failure": 20,
      "customer_history": 0.83,
      "previous_attempt_result": 0
    }

Expected response shape:

    {
      "probability_success": 0.78
    }

The exact probability will depend on the generated/trained synthetic data.

IMPORTANT:
The dataset is synthetic for the MVP. Do not describe it as real Razorpay
merchant data.
