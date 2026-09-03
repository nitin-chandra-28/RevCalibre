import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    brier_score_loss,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.calibration import CalibratedClassifierCV, calibration_curve

BASE = Path(__file__).resolve().parent
DATA = BASE / "data" / "payments.csv"
MODEL_DIR = BASE / "models"
MODEL_DIR.mkdir(exist_ok=True)

df = pd.read_csv(DATA)

X = df.drop(columns=["recovered"])
y = df["recovered"]

categorical_features = ["error_code"]
numeric_features = [
    "amount",
    "retry_count",
    "gateway_health",
    "time_since_failure",
    "customer_history",
    "previous_attempt_result",
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features,
        ),
        (
            "numeric",
            StandardScaler(),
            numeric_features,
        ),
    ]
)

base_model = LogisticRegression(max_iter=1000)

# 80% development/training data, 20% untouched held-out test data.
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

# Calibration CV happens only inside the 80% training portion.
model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "classifier",
            CalibratedClassifierCV(
                estimator=base_model,
                method="sigmoid",
                cv=5,
            ),
        ),
    ]
)

model.fit(X_train, y_train)

probabilities = model.predict_proba(X_test)[:, 1]
predictions = (probabilities >= 0.5).astype(int)

brier = brier_score_loss(y_test, probabilities)

# Simple Expected Calibration Error (ECE).
# 10 equal-width probability bins.
def expected_calibration_error(y_true, probs, n_bins=10):
    y_true = np.asarray(y_true)
    probs = np.asarray(probs)

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0

    for i in range(n_bins):
        if i == n_bins - 1:
            mask = (probs >= bin_edges[i]) & (probs <= bin_edges[i + 1])
        else:
            mask = (probs >= bin_edges[i]) & (probs < bin_edges[i + 1])

        if not np.any(mask):
            continue

        confidence = probs[mask].mean()
        accuracy = y_true[mask].mean()
        ece += mask.mean() * abs(confidence - accuracy)

    return float(ece)

ece = expected_calibration_error(y_test, probabilities)

prob_true, prob_pred = calibration_curve(
    y_test,
    probabilities,
    n_bins=10,
    strategy="uniform",
)

metrics = {
    "dataset": "synthetic",
    "total_records": int(len(df)),
    "train_records": int(len(X_train)),
    "test_records": int(len(X_test)),
    "accuracy": float(accuracy_score(y_test, predictions)),
    "precision": float(precision_score(y_test, predictions, zero_division=0)),
    "recall": float(recall_score(y_test, predictions, zero_division=0)),
    "f1": float(f1_score(y_test, predictions, zero_division=0)),
    "brier_score": float(brier),
    "ece": float(ece),
    "calibration_curve": {
        "predicted_probability": [float(x) for x in prob_pred],
        "actual_success_rate": [float(x) for x in prob_true],
    },
}

model_path = MODEL_DIR / "calibrated_model.pkl"
metrics_path = MODEL_DIR / "metrics.json"

joblib.dump(model, model_path)
metrics_path.write_text(json.dumps(metrics, indent=2))

print("\n=== PHASE 7 MODEL RESULTS ===")
print(f"Model saved: {model_path}")
print(f"Metrics saved: {metrics_path}")
print(f"Accuracy : {metrics['accuracy']:.4f}")
print(f"Precision: {metrics['precision']:.4f}")
print(f"Recall   : {metrics['recall']:.4f}")
print(f"F1       : {metrics['f1']:.4f}")
print(f"Brier    : {metrics['brier_score']:.4f}  (lower is better)")
print(f"ECE      : {metrics['ece']:.4f}  (lower is better)")

print("\nCalibration:")
for pred, actual in zip(prob_pred, prob_true):
    print(f"Predicted {pred:.2f} -> Actual {actual:.2f}")
