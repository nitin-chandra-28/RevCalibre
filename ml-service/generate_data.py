import numpy as np
import pandas as pd
from pathlib import Path


# --------------------------------------------------
# Configuration
# --------------------------------------------------

SEED = 42
N = 10_000

rng = np.random.default_rng(SEED)


# --------------------------------------------------
# Generate payment features
# --------------------------------------------------

error_codes = rng.choice(
    ["E01", "E02", "E03", "E99"],
    size=N,
    p=[0.35, 0.25, 0.25, 0.15],
)

amount = np.round(
    rng.uniform(100, 10_000, N),
    2
)

retry_count = rng.integers(
    0,
    3,
    N
)

gateway_health = np.round(
    rng.uniform(0.20, 1.00, N),
    3
)

time_since_failure = rng.integers(
    1,
    3600,
    N
)

customer_history = np.round(
    rng.uniform(0.05, 0.99, N),
    3
)

previous_attempt_result = rng.integers(
    0,
    2,
    N
)


# --------------------------------------------------
# Synthetic recovery mechanism
# --------------------------------------------------
#
# This creates learnable relationships for the MVP.
# It is NOT Razorpay production or merchant data.
#
# Higher value  -> greater recovery probability
# Lower value   -> lower recovery probability
# --------------------------------------------------

error_effect = {
    "E01": 0.80,   # temporary/system issue
    "E02": 0.25,   # customer/payment friction
    "E03": -0.65,  # insufficient funds
    "E99": -1.20,  # systemic gateway failure
}


logit = np.array([
    error_effect[e]
    for e in error_codes
])


# Gateway health
logit += 2.4 * (
    gateway_health - 0.5
)


# Customer history
logit += 1.5 * (
    customer_history - 0.5
)


# Previous attempt result
logit += 0.55 * previous_attempt_result


# More retries reduce recovery probability
logit -= 0.65 * retry_count


# Longer time since failure slightly reduces probability
logit -= 0.00015 * time_since_failure


# Higher payment amounts slightly reduce probability
logit -= 0.00002 * amount


# --------------------------------------------------
# Convert logit → probability
# --------------------------------------------------

probability = 1 / (
    1 + np.exp(-logit)
)


# --------------------------------------------------
# Generate recovery outcome
# --------------------------------------------------

recovered = rng.binomial(
    1,
    probability
)


# --------------------------------------------------
# Create dataset
# --------------------------------------------------

df = pd.DataFrame({
    "error_code": error_codes,
    "amount": amount,
    "retry_count": retry_count,
    "gateway_health": gateway_health,
    "time_since_failure": time_since_failure,
    "customer_history": customer_history,
    "previous_attempt_result": previous_attempt_result,
    "recovered": recovered,
})


# --------------------------------------------------
# Save dataset
# --------------------------------------------------

BASE = Path(__file__).resolve().parent

output = (
    BASE
    / "data"
    / "payments.csv"
)

output.parent.mkdir(
    parents=True,
    exist_ok=True
)

df.to_csv(
    output,
    index=False
)


# --------------------------------------------------
# Report
# --------------------------------------------------

print("=== PHASE 7 DATASET ===")
print(f"Created: {output}")
print(f"Rows: {len(df)}")
print(
    f"Recovery rate: "
    f"{df['recovered'].mean():.2%}"
)

print("\nError distribution:")

print(
    df["error_code"]
    .value_counts()
    .sort_index()
)

print("\nSample:")
print(
    df.head()
)