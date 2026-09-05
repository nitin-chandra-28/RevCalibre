# ◉ RevCalibre

## Autonomous Payment Revenue Recovery Agent

> **When payment revenue drops, RevCalibre determines whether the merchant should act at all.**

RevCalibre is an autonomous payment-recovery decision engine that detects payment degradation, diagnoses the likely root cause, predicts recovery probability using a calibrated ML model, evaluates the economic value of possible interventions, and executes only when deterministic safety policies allow it.

Unlike a blind retry system or an unconstrained LLM agent, RevCalibre separates **intelligence from execution authority**:

- ML estimates recovery probability.
- The EV engine makes the economic decision.
- The Policy Engine enforces hard safety invariants.
- The Merchant Kill Switch can stop autonomous execution instantly.
- Shadow Mode enables zero-risk evaluation.
- Razorpay Test Mode provides realistic payment execution.
- Randomized control holdouts estimate true incremental revenue.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Core Problem](#-core-problem)
- [How RevCalibre Works](#-how-revCalibre-works)
- [10-Stage Autonomous Pipeline](#-10-stage-autonomous-pipeline)
- [System Architecture](#-system-architecture)
- [Key Components](#-key-components)
- [Expected Value Engine](#-expected-value-engine)
- [Calibrated ML Model](#-calibrated-ml-model)
- [Safety & Policy Engine](#-safety--policy-engine)
- [Shadow Mode](#-shadow-mode)
- [Razorpay Test Mode](#-razorpay-test-mode)
- [Causal A/B Holdout](#-causal-ab-holdout)
- [Dashboard](#-dashboard)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Interactive Demo](#-interactive-demo)
- [API](#-api)
- [Testing](#-testing)
- [Evaluation Metrics](#-evaluation-metrics)
- [Safety Guarantees](#-safety-guarantees)
- [Technology Stack](#-technology-stack)
- [Limitations](#-limitations)
- [Future Roadmap](#-future-roadmap)
- [License](#-license)

---

# 🚀 Overview

Payment failures directly translate into lost revenue.

A failed payment does not always mean the customer should be retried immediately.

Sometimes:

- the bank is temporarily degraded,
- the customer is experiencing checkout friction,
- the payment should be retried later,
- a payment link has better expected value,
- the customer will naturally retry,
- or the entire gateway is experiencing a systemic failure and intervention should stop.

RECOVER treats payment recovery as an **economic decision under safety constraints**.

The system continuously evaluates:

```text
Payment Health
      ↓
Anomaly Detection
      ↓
Root Cause Diagnosis
      ↓
Calibrated P(success)
      ↓
Expected Value
      ↓
Candidate Action
      ↓
Deterministic Policy
      ↓
Safety Gate
      ↓
Execution / Shadow
      ↓
Webhook Outcome
      ↓
Causal Revenue Measurement
```

The objective is not:

"Retry every failed payment."

The objective is:

Recover additional revenue only when intervention is economically justified and operationally safe.

## 🎯 Core Problem

Traditional payment recovery systems face three fundamental problems:

### 1. Blind Retries

Retrying every failed payment can:

- Increase unnecessary payment attempts
- Create additional processing costs
- Annoy customers with repeated attempts
- Amplify existing payment gateway issues
- Recover payments that would have succeeded naturally anyway

RECOVER replaces indiscriminate retries with **policy-driven, risk-aware recovery decisions**.

### 2. Unbounded AI Execution

An LLM can help **analyze and explain** why a payment failed, but it should not have unrestricted authority to execute financial actions.

RECOVER therefore maintains a strict separation between:

- **AI / Explanation Layer** — analyzes failures and recommends recovery actions
- **Policy & Execution Layer** — independently validates whether an action is allowed before execution

This ensures that AI recommendations do not automatically become financial transactions.

### 3. Correlation ≠ Causation

A customer may successfully complete a payment after a recovery intervention simply because they were already going to retry.

Therefore, counting every subsequent successful payment as **agent-generated revenue** can overstate the effectiveness of the recovery system.

RECOVER addresses this using an **80/20 randomized Agent vs. Control holdout**:

- **80% — Agent Group:** Receives RECOVER interventions
- **20% — Control Group:** Receives no recovery intervention

The difference in recovery outcomes between the two groups is used to estimate **incremental revenue attributable to RECOVER**, rather than simply counting all recovered payments.

# 🧠 How RECOVER Works

RECOVER follows a strict **10-stage execution pipeline** designed to detect payment failures, diagnose their causes, make economically optimal decisions, execute interventions safely, and measure the resulting incremental revenue.

| Stage | Name | Purpose |
|:---:|---|---|
| **01** | **DETECT** | Detect abnormal payment/revenue degradation |
| **02** | **DIAGNOSE** | Identify likely failure/root cause |
| **03** | **CALIBRATE** | Generate calibrated `P(success)` |
| **04** | **EV DECIDE** | Select economically optimal intervention |
| **05** | **POLICY** | Apply deterministic safety invariants |
| **06** | **SAFETY** | Apply Kill Switch + execution mode |
| **07** | **EXECUTE** | Execute through Razorpay Test Mode |
| **08** | **WEBHOOK** | Receive and verify payment outcome |
| **09** | **CONTROL** | Compare Agent vs Control populations |
| **10** | **AUDIT ₹** | Calculate causal incremental revenue |

## 🔄 Pipeline Flow

```text
DETECT
   ↓
DIAGNOSE
   ↓
CALIBRATE
   ↓
EV DECIDE
   ↓
POLICY
   ↓
SAFETY
   ↓
EXECUTE
   ↓
WEBHOOK
   ↓
CONTROL
   ↓
AUDIT ₹

# 🏗️ System Architecture

RECOVER is built as a **layered, safety-first architecture** where machine learning provides intelligence, while deterministic systems retain control over execution.
```
## 🔄 Architecture Flow

```text
                    PAYMENT EVENTS
                         │
                         ▼
              ┌─────────────────────┐
              │  ANOMALY DETECTION  │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   ROOT CAUSE /      │
              │     DIAGNOSIS       │
              │ E01 / E02 / E03/E99 │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ CALIBRATED ML MODEL │
              │     P(success)      │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │      EV ENGINE      │
              │ P(S) × Value - Cost │
              └──────────┬──────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   DETERMINISTIC POLICY ENGINE  │
        │                                │
        │ • Max retries                  │
        │ • Idempotency                  │
        │ • DND                          │
        │ • Circuit breaker              │
        └───────────────┬────────────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │     SAFETY GATE     │
             │                     │
             │     KILL SWITCH     │
             │     SHADOW / TEST   │
             └─────────┬───────────┘
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
      BLOCKED / SHADOW       RAZORPAY TEST
                                   │
                                   ▼
                              WEBHOOK
                                   │
                                   ▼
                           RECOVERY RESULT
                                   │
                                   ▼
                         CAUSAL ATTRIBUTION
                         Agent vs Control
                                   │
                                   ▼
                           INCREMENTAL ₹
```
# 🔍 1. Anomaly Detection

RECOVER continuously monitors **payment health and revenue metrics** to identify abnormal degradation in payment performance.

## 📊 Monitored Metrics

The detection layer tracks:

- **Baseline success rate**
- **Current success rate**
- **Failure rate**
- **Revenue per minute**
- **Error-code distribution**
- **Payment volume**

## 🚨 Example

```text
BASELINE SUCCESS RATE     92%
CURRENT SUCCESS RATE      58%

STATUS:
⚠ ANOMALY DETECTED
````

When the current payment performance deviates significantly from the established baseline, RECOVER flags the payment stream for further diagnosis.

## 🧪 Failure Scenario Simulation

The simulator supports multiple payment failure scenarios:

```text
NORMAL
BANK_FAILURE
FRICTION
SYSTEMIC_FAILURE
```
# 🧩 2. Root Cause Diagnosis

RECOVER categorizes payment failures by analyzing **decline codes, error patterns, and payment health signals**.

## 🏷️ Error Code Mapping

| Code | Category | Description |
|:---:|---|---|
| **E01** | Temporary / System Issue | Temporary bank or system-side degradation |
| **E02** | Customer / Payment Friction | Payment friction or customer-side issues |
| **E03** | Insufficient Funds | Insufficient balance or funds |
| **E99** | Systemic Failure | Broad or systemic payment infrastructure failure |

## 🔎 Structured Diagnosis

The diagnosis layer converts observed payment patterns into structured information that can be consumed by downstream components.

### Example

```json
{
  "category": "temporary_system_issue",
  "explanation": "Elevated E01 failures indicate a temporary bank-side degradation.",
  "supporting_evidence": [
    "E01 frequency increased significantly",
    "overall success rate dropped",
    "gateway health deteriorated"
  ]
}
```
# 💰 3. Expected Value Engine

RECOVER does not simply ask:

> "Can this payment be recovered?"

It asks:

> **"Is recovery economically worth attempting?"**

The EV calculation is:

```text
EV = P(success) × Payment Value − Action Cost
```
📊 Example
```text
Payment Value = ₹1,000
P(success)    = 0.78
Action Cost   = ₹10

EV = 0.78 × ₹1,000 − ₹10
EV = ₹770
```
🎯 Candidate Actions
```text
RECOVER evaluates multiple possible recovery actions:
```text
DO NOTHING
RETRY
RETRY AFTER DELAY
PAYMENT LINK
```
Each candidate action receives:
```text
Action
P(success)
Expected Value
Cost
Policy Status
```

# 🤖 4. Calibrated ML Model

RECOVER uses a small probability classifier rather than relying on arbitrary AI confidence values.

Training pipeline
```text
Synthetic Historical Payments
            ↓
Feature Generation
            ↓
Train / Test Split
            ↓
Logistic Regression
            ↓
Probability Calibration
            ↓
Held-Out Evaluation
            ↓
P(success)
```

Example features include:
```text
error code
payment amount
retry count
gateway health
time since failure
customer/payment history
previous attempt result
```
The MVP uses synthetic data and does not claim to train on real Razorpay merchant data.

Current evaluation

The implementation documents a 10,000-record synthetic dataset:
```text
Training records: 8,000
Held-out records: 2,000
```
Reported evaluation metrics include:
```text
ECE        0.0225
Brier      0.1913
F1         0.623
Precision  68.7%
Recall     57.0%
```

Calibration is evaluated by comparing predicted probabilities against empirical outcomes.

# 🛡️ 5. Deterministic Safety & Policy Engine

The Policy Engine is the final deterministic veto layer.

Every proposed intervention must pass hard safety checks.
```text
Maximum retries
retry_count >= 2
        ↓
      BLOCK
```
Idempotency
```text
Each recovery action receives a deterministic idempotency key.
```
recovery:{paymentId}:{action}

Duplicate execution requests are rejected.

DND compliance

Customer-facing recovery actions can be blocked when communication restrictions apply.

Circuit breaker

Systemic or gateway-level degradation can trigger a circuit breaker and stop outbound recovery actions.

Merchant Kill Switch

The merchant can immediately lock autonomous execution.
```text
KILL SWITCH = ON

        ↓

100% of outgoing recovery actions
        ↓
       BLOCKED
```
The Kill Switch overrides:
```text
ML confidence
EV
candidate action
policy approval
```
This makes the emergency stop non-bypassable.

