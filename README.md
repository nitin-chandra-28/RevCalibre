# ◉ RevCalibre

## Autonomous Payment Revenue Recovery Agent

> **When payment revenue drops, RevCalibre determines whether the merchant should act at all.**

RevCalibre is an autonomous payment-recovery decision engine that detects payment degradation, diagnoses the likely root cause, predicts recovery probability using a calibrated ML model, evaluates the economic value of possible interventions, and executes only when deterministic safety policies allow it.

Unlike a blind retry system or an unconstrained LLM agent, RevCalibre separates **intelligence from execution authority**:

- 🧠 ML estimates recovery probability
- 💰 The EV engine makes the economic decision
- 🛡️ The Policy Engine enforces hard safety invariants
- ⚡ The Merchant Kill Switch can stop autonomous execution instantly
- 👻 Shadow Mode enables zero-risk evaluation
- 💳 Razorpay Test Mode provides realistic payment execution
- 📊 Randomized control holdouts estimate true incremental revenue

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Core Problem](#-core-problem)
- [How RevCalibre Works](#-how-revcalibre-works)
- [10-Stage Autonomous Pipeline](#-10-stage-autonomous-pipeline)
- [System Architecture](#-system-architecture)
- [Key Components](#-key-components)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Interactive Demo](#-interactive-demo)
- [API Reference](#-api-reference)
- [Dashboard Features](#-dashboard-features)
- [Testing](#-testing)
- [Evaluation Metrics](#-evaluation-metrics)
- [Safety Guarantees](#-safety-guarantees)
- [Technology Stack](#-technology-stack)
- [Limitations](#-limitations)
- [Future Roadmap](#-future-roadmap)
- [License](#-license)

---

## 🚀 Overview

Payment failures directly translate into lost revenue. However, a failed payment does not always mean the customer should be retried immediately.

### When Intervention is NOT Optimal

- ⏱️ The bank is temporarily degraded
- 😕 The customer is experiencing checkout friction
- ⏳ The payment should be retried later
- 🔗 A payment link has better expected value
- 🔄 The customer will naturally retry
- 🚨 The entire gateway is experiencing systemic failure

RevCalibre treats payment recovery as an **economic decision under safety constraints**.

### The Recovery Pipeline

```
Payment Degradation
    ↓
Anomaly Detection
    ↓
Root Cause Diagnosis
    ↓
Calibrated P(success)
    ↓
Expected Value Analysis
    ↓
Candidate Actions
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

### The Core Objective

NOT: *"Retry every failed payment."*

INSTEAD: **Recover additional revenue only when intervention is economically justified and operationally safe.**

---

## 🎯 Core Problem

Traditional payment recovery systems face three fundamental challenges:

### 1. Blind Retries ❌

Indiscriminate retry strategies can:
- Increase unnecessary payment attempts
- Create additional processing costs
- Annoy customers with repeated attempts
- Amplify existing payment gateway issues
- Recover payments that would have succeeded naturally anyway

**Solution:** RevCalibre replaces blind retries with **policy-driven, risk-aware recovery decisions**.

### 2. Unbounded AI Execution ⚠️

An LLM can analyze and explain payment failures, but **should not have unrestricted authority to execute financial actions.**

RevCalibre maintains strict separation:
- **AI / Explanation Layer** — analyzes failures and recommends actions
- **Policy & Execution Layer** — independently validates before execution

This ensures AI recommendations do not automatically become financial transactions.

### 3. Correlation ≠ Causation 📊

A customer may successfully complete a payment after an intervention simply because they were already going to retry. Counting every subsequent successful payment as agent-generated revenue overstates effectiveness.

**Solution:** RevCalibre uses an **80/20 randomized A/B holdout**:
- **80% — Agent Group:** Receives RevCalibre interventions
- **20% — Control Group:** Receives no intervention

The difference between groups estimates **true incremental revenue** rather than total recoveries.

---

## 🧠 How RevCalibre Works

RevCalibre follows a strict **10-stage execution pipeline**:

| # | Stage | Purpose |
|:---:|---|---|
| 01 | **DETECT** | Identify abnormal payment/revenue degradation |
| 02 | **DIAGNOSE** | Classify likely failure root cause (E01/E02/E03/E99) |
| 03 | **CALIBRATE** | Generate calibrated `P(success)` probability |
| 04 | **EV DECIDE** | Select economically optimal intervention |
| 05 | **POLICY** | Apply deterministic safety invariants |
| 06 | **SAFETY** | Apply Kill Switch + execution mode |
| 07 | **EXECUTE** | Execute through Razorpay Test Mode |
| 08 | **WEBHOOK** | Receive and verify payment outcome |
| 09 | **CONTROL** | Compare Agent vs Control populations |
| 10 | **AUDIT ₹** | Calculate causal incremental revenue |

---

## 🏗️ System Architecture

RevCalibre is built as a **layered, safety-first architecture** where machine learning provides intelligence while deterministic systems retain execution control.

### Architecture Flow

```
                    PAYMENT EVENTS
                         │
                         ▼
              ┌─────────────────────┐
              │  ANOMALY DETECTION  │
              │  (Metric Baseline)  │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   ROOT CAUSE /      │
              │     DIAGNOSIS       │
              │ E01/E02/E03/E99     │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ CALIBRATED ML MODEL │
              │     P(success)      │
              │  (Logistic + Cal)   │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │      EV ENGINE      │
              │  P(S)×Value - Cost  │
              └──────────┬──────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   DETERMINISTIC POLICY ENGINE  │
        │                                │
        │  • Max retries enforcement     │
        │  • Idempotency verification   │
        │  • DND compliance checks      │
        │  • Circuit breaker triggers   │
        └───────────────┬────────────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │     SAFETY GATE     │
             │                     │
             │   KILL SWITCH ⚡    │
             │   SHADOW / TEST     │
             └─────────┬───────────┘
                       │
             ┌─────────┴──────────┐
             │                    │
             ▼                    ▼
        BLOCKED/SHADOW      RAZORPAY API
             │                    │
             │                    ▼
             │               WEBHOOK ✓
             │                    │
             └─────────┬──────────┘
                       ▼
                RECOVERY RESULT
                       │
                       ▼
              CAUSAL ATTRIBUTION
              (Agent vs Control)
                       │
                       ▼
                INCREMENTAL ₹ ✓
```

---

## 🔍 Key Components

### 1. Anomaly Detection

RevCalibre continuously monitors payment health metrics:

- **Baseline success rate** — historical baseline
- **Current success rate** — real-time performance
- **Failure rate** — percentage of declined payments
- **Revenue per minute** — revenue health signal
- **Error-code distribution** — failure pattern analysis
- **Payment volume** — transaction throughput

**Detection Example:**
```
BASELINE SUCCESS RATE:    92%
CURRENT SUCCESS RATE:     58%
STATUS: ⚠ ANOMALY DETECTED
```

### 2. Root Cause Diagnosis

RevCalibre categorizes failures by error patterns:

| Code | Category | Description |
|:---:|---|---|
| **E01** | Temporary System Issue | Bank or system-side degradation |
| **E02** | Customer Friction | Payment or checkout friction |
| **E03** | Insufficient Funds | Balance or limit issues |
| **E99** | Systemic Failure | Infrastructure-level failure |

**Diagnosis Output Example:**
```json
{
  "category": "temporary_system_issue",
  "explanation": "Elevated E01 failures indicate bank-side degradation",
  "supporting_evidence": [
    "E01 frequency increased significantly",
    "Overall success rate dropped 34%",
    "Gateway health degraded"
  ]
}
```

### 3. Calibrated ML Model

RevCalibre uses calibrated probability classification instead of arbitrary confidence scores.

**Training Pipeline:**
```
Synthetic Payment Data
    ↓
Feature Engineering
    ↓
Train/Test Split (80/20)
    ↓
Logistic Regression
    ↓
Probability Calibration
    ↓
Held-Out Evaluation
    ↓
P(success) Output
```

**Features:**
- Error code
- Payment amount
- Retry count
- Gateway health
- Time since failure
- Customer/payment history
- Previous attempt result

**Evaluation (10K Synthetic Records):**
| Metric | Value |
|---|---|
| Brier Score | 0.1913 |
| Expected Calibration Error | 0.0225 |
| F1 Score | 0.623 |
| Precision | 68.7% |
| Recall | 57.0% |

### 4. Expected Value Engine

RevCalibre answers the economic question:

> **"Is recovery economically worth attempting?"**

**EV Formula:**
```
EV = P(success) × Payment Value − Action Cost
```

**Example Calculation:**
```
Payment Value = ₹1,000
P(success)    = 0.78
Action Cost   = ₹10

EV = (0.78 × ₹1,000) − ₹10
EV = ₹770 ✓ (Worth pursuing)
```

**Candidate Actions Evaluated:**
- DO NOTHING
- RETRY
- RETRY AFTER DELAY
- PAYMENT LINK

Each action receives scoring across P(success), EV, cost, and policy status.

### 5. Deterministic Policy Engine

The Policy Engine is the **final deterministic veto layer** — every proposed intervention must pass hard safety checks:

**Maximum Retry Limit:**
```
IF retry_count >= 2
   → BLOCK action
```

**Idempotency:**
```
Key: recovery:{paymentId}:{action}
Duplicate requests → REJECTED
```

**DND Compliance:**
```
If customer communication restricted
   → BLOCK outbound recovery actions
```

**Circuit Breaker:**
```
IF systemic_failure_detected
   → STOP all recovery actions
```

**Merchant Kill Switch:**
```
IF KILL_SWITCH = ON
   → 100% block ALL actions
   → Overrides: ML confidence, EV, policy
   → Non-bypassable emergency stop
```

### 6. Shadow Mode

Shadow Mode enables risk-free evaluation of the entire pipeline:

```
Payment
  ↓
Diagnosis ✓
  ↓
P(success) ✓
  ↓
EV Calculation ✓
  ↓
Policy Check ✓
  ↓
Proposed Action ✓
  ↓
NO EXECUTION ✓
```

Use Shadow Mode to:
- Evaluate proposed actions
- Test probability predictions
- Validate expected value calculations
- Verify policy logic
- Estimate hypothetical revenue impact
- Build confidence before production

### 7. Razorpay Test Mode Integration

RevCalibre executes approved recoveries through Razorpay Test Mode:

**Execution Flow:**
```
Agent Decision ✓
  ↓
Policy Approval ✓
  ↓
Safety Gate ✓
  ↓
Razorpay Payment Link
  ↓
Test Payment Execution
  ↓
Razorpay Webhook
  ↓
Signature Verification ✓
  ↓
Idempotent Processing
  ↓
Recovery Result
  ↓
Revenue Updated
```

**Webhook Endpoint:**
```
POST /api/webhooks/razorpay
```

**Webhook Processing:**
- Razorpay signature verification
- Event tracking and logging
- Duplicate protection
- Idempotent event processing
- Recovery status update
- Recovered amount recording

### 8. Causal A/B Holdout

RevCalibre measures **true incremental revenue** using randomized assignment:

```
FAILED PAYMENTS
      │
      ├─────────────┐
      │             │
      ▼             ▼
  80% AGENT    20% CONTROL
      │             │
      ▼             ▼
 Intervention   No Intervention
      │             │
      └──────┬──────┘
             ▼
     Compare Outcomes
             │
             ▼
   Incremental Revenue
```

**Causal Revenue Calculation:**
```
Incremental Revenue
=
Agent Group Recovery Rate × Total Recovered
−
Control Group Recovery Rate × Total Recovered
```

The control group represents the natural recovery baseline, preventing overstatement of agent-driven recovery.

### 9. Dashboard Command Center

Real-time monitoring and control across all system components:

**Revenue Health Panel:**
- Total payment volume
- Failed payments
- Recovered revenue
- Recovery rate (%)
- Incremental revenue

**Incident Detection Panel:**
- Current vs baseline success rate
- Revenue drop (%)
- Error distribution
- Active incident status
- Root cause diagnosis

**Agent Decision Trace:**
```
Diagnosis
   ↓
P(success) Prediction
   ↓
Candidate Actions Ranked
   ↓
Expected Value Calculated
   ↓
Policy Check Result
   ↓
Selected Action
   ↓
Execution Status
   ↓
Webhook Received
```

**Safety Control Panel:**
- Kill Switch state (ON/OFF)
- Execution mode (TEST/SHADOW)
- Blocked actions counter
- Policy violations
- Idempotency blocks
- Circuit breaker state

**Causal Impact Analysis:**
- Agent group statistics
- Control group statistics
- Recovery rate comparison
- Recovered revenue by group
- Incremental revenue (₹)

**Audit Timeline:**
```
14:32:01  ⚠ Anomaly detected (Success: 92% → 58%)
14:32:02  🔍 Diagnosis: Temporary system issue (E01 spike)
14:32:03  🤖 P(success) calculated: 78%
14:32:03  💰 EV calculated: ₹770 (positive)
14:32:03  ✓ Policy passed (retries: 0/2)
14:32:04  ➡️ Recovery executed: RETRY
14:32:36  ✓ Webhook received
14:32:36  💚 ₹1,499 recovered
```

---

## 📁 Project Structure

```
RevCalibre/
│
├── backend/
│   ├── audit/                 # Immutable audit logs & events
│   ├── diagnosis/             # Root cause analysis engine
│   ├── ev/                    # Expected value calculator
│   ├── experiment/            # A/B holdout & causal lift
│   ├── metrics/               # Payment stream metrics
│   ├── policy/                # Deterministic safety policies
│   ├── razorpay/              # Razorpay API & webhooks
│   ├── recovery/              # Recovery state tracking
│   ├── services/              # ML service integration
│   ├── shadow/                # Shadow execution mode
│   ├── simulator/             # Synthetic payment scenarios
│   ├── tests/                 # Unit & integration tests
│   ├── .env                   # Environment config
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main dashboard
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── ml-service/
│   ├── api.py                 # FastAPI prediction server
│   ├── generate_data.py       # Synthetic dataset generator
│   ├── train_model.py         # Model training & calibration
│   ├── requirements.txt
│   ├── data/
│   │   └── payments.csv       # Synthetic training data
│   └── models/
│       └── metrics.json       # Evaluation results
│
├── agent.md                   # Architecture specification
├── start.sh                   # Unified startup script
└── README.md                  # This file
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **Razorpay Test Account**
- **Razorpay Test API Credentials**

### Step 1: Clone Repository

```bash
git clone https://github.com/nitin-chandra-28/RevCalibre.git
cd RevCalibre
```

### Step 2: Configure Backend

Create `backend/.env`:

```bash
# Server
PORT=5000

# Razorpay Test Credentials
RAZORPAY_KEY_ID=rzp_test_yourKeyIdHere
RAZORPAY_KEY_SECRET=yourKeySecretHere
RAZORPAY_WEBHOOK_SECRET=yourWebhookSecretHere

# ML Service
ML_SERVICE_URL=http://127.0.0.1:8000

# Execution Mode
EXECUTION_MODE=TEST
TEST_EXECUTION_ENABLED=true
```

⚠️ **Never commit real secrets to Git.**

### Step 3: Start ML Service

```bash
cd ml-service

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Windows:
# .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Generate synthetic dataset
python generate_data.py

# Train model with calibration
python train_model.py

# Start FastAPI server
uvicorn api:app --host 0.0.0.0 --port 8000
```

**Access ML Service:**
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

### Step 4: Start Backend

Open new terminal:

```bash
cd backend
npm install
npm start
```

**Backend:** http://localhost:5000

### Step 5: Start Frontend

Open new terminal:

```bash
cd frontend
npm install
npm run dev
```

**Dashboard:** http://localhost:5173

---

## 🎮 Interactive Demo Walkthrough

### Demo Scenario 1: Normal Traffic Baseline

**Action:** Select `NORMAL` mode

**Observe:**
- System establishes healthy payment baseline
- No anomalies detected
- No unnecessary recovery interventions
- Success rate stable at ~92%

**Expected Behavior:** No alerts, normal operation

---

### Demo Scenario 2: Bank Failure Detection

**Action:** Select `BANK_FAILURE` mode

**Observe:**
- Success Rate ↓ (92% → 58%)
- Failure Rate ↑
- Revenue/minute ↓
- E01 decline spike ↑

**Expected System Behavior:**
1. Anomaly detection triggers
2. Root cause diagnosis: "Temporary System Issue"
3. Evidence: E01 spike, gateway degradation
4. Recovery actions proposed

---

### Demo Scenario 3: Inspect Agent Decision Trace

**Action:** Click on failed payment in dashboard

**Inspect:**
- Root Cause: Temporary/System Issue
- Supporting Evidence: E01 spike, success-rate drop
- ML Probability: 78%
- Candidate Actions with EV scores
- Policy Check: PASS or FAIL
- Selected Action: RETRY / RETRY_DELAY / PAYMENT_LINK

---

### Demo Scenario 4: Policy Blocking (Max Retries)

**Action:** Set `retry_count = 2` for a payment

**Observe:**
- EV engine recommends: RETRY (EV=₹770)
- Policy engine checks: retry_count >= 2
- Result: ❌ **BLOCKED** (Max retries exceeded)
- Reason: Policy violation

**Expected:** Action rejected despite positive EV

---

### Demo Scenario 5: Merchant Kill Switch

**Action:** Click ⚡ **KILL SWITCH** button

**Observe:**
- System status: 🔴 **LOCKED**
- All autonomous recovery actions: ❌ **BLOCKED**
- Kill Switch overrides:
  - ML confidence ✓
  - Expected value ✓
  - Policy approval ✓
  - Safety gates ✓

**Expected:** Zero recovery actions execute

---

### Demo Scenario 6: Shadow Mode (Zero-Risk Evaluation)

**Action:** Switch execution mode to `SHADOW`

**Observe:**
- Detection ✓
- Diagnosis ✓
- P(success) Prediction ✓
- EV Calculation ✓
- Policy Check ✓
- **NO EXECUTION** ✓

**Use Case:** Test recovery logic without financial impact

---

### Demo Scenario 7: Test Mode (Razorpay)

**Action:** Switch execution mode to `TEST`

**Observe:**
1. Policy-approved recovery action executed
2. Razorpay Test Mode payment created
3. Payment link generated
4. Customer completes test payment
5. Razorpay webhook sent
6. Signature verification ✓
7. Idempotency check ✓
8. Recovery status updated
9. Dashboard shows recovered ₹

---

### Demo Scenario 8: Causal Impact & A/B Holdout

**Action:** Navigate to `CAUSAL IMPACT` tab

**Observe:**
```
AGENT GROUP (80%)          CONTROL GROUP (20%)
─────────────────          ──────────────────
Payments: 8,000            Payments: 2,000
Interventions: 6,400       No intervention
Recovery Rate: 71%         Recovery Rate: 58%

Incremental Recovery = (71% - 58%) × 8,000
                    = 13% × 8,000
                    = 1,040 additional recoveries
                    ≈ ₹1,559,000 incremental revenue
```

**Key Insight:** 13% of recovery was agent-driven, not natural recovery

---

## 📡 API Reference

### ML Service

#### POST `/predict`

Returns calibrated recovery probability.

**Request:**
```json
{
  "error_code": "E01",
  "amount": 1499,
  "retry_count": 0,
  "gateway_health": 0.91,
  "time_since_failure": 20,
  "customer_history": 0.83,
  "previous_attempt_result": 0
}
```

**Response:**
```json
{
  "probability_success": 0.78
}
```

### Backend API

#### GET `/api/safety`

Returns current safety state.

**Response:**
```json
{
  "kill_switch": false,
  "circuit_breaker": false,
  "execution_mode": "TEST",
  "blocked_actions": 0
}
```

#### POST `/api/safety/kill-switch`

Enable/disable kill switch.

**Request:**
```json
{
  "enabled": true
}
```

#### POST `/api/mode`

Set execution mode.

**Request (Shadow Mode):**
```json
{
  "mode": "SHADOW"
}
```

**Request (Test Mode):**
```json
{
  "mode": "TEST"
}
```

#### POST `/api/recovery/execute`

Execute recovery decision pipeline.

**Request:**
```json
{
  "paymentId": "pay_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "action": "RETRY",
  "ev": 770,
  "probability": 0.78,
  "status": "EXECUTED"
}
```

#### POST `/api/webhooks/razorpay`

Receive Razorpay webhook events.

**Processing:**
- Signature verification
- Event deduplication
- Idempotent processing
- Recovery status update

#### GET `/api/audit`

Retrieve recovery audit timeline.

**Response:**
```json
{
  "timeline": [
    {
      "timestamp": "2024-09-06T14:32:01Z",
      "event": "anomaly_detected",
      "details": "Success rate: 92% → 58%"
    },
    {
      "timestamp": "2024-09-06T14:32:02Z",
      "event": "diagnosis_completed",
      "root_cause": "temporary_system_issue"
    }
  ]
}
```

---

## 🧪 Testing

Run comprehensive test suite:

```bash
cd backend
npm test
```

**Test Coverage:**

✓ Normal payment flow  
✓ Bank failure scenario  
✓ Customer friction scenario  
✓ Systemic failure scenario  
✓ Max retry enforcement  
✓ Kill Switch activation  
✓ Duplicate webhook handling  
✓ Shadow mode evaluation  
✓ A/B holdout assignment  
✓ Policy blocking scenarios  
✓ EV calculation validation  
✓ Calibration verification  

---

## 📊 Evaluation Metrics

RevCalibre is evaluated across **four dimensions**:

### 1. Detection Performance
| Metric | Target |
|---|---|
| Precision | > 95% |
| Recall | > 90% |
| F1 Score | > 0.92 |
| False Alarm Rate | < 5% |

### 2. Diagnosis Accuracy
| Metric | Target |
|---|---|
| Root Cause Classification | > 85% |
| E01/E02/E03 Accuracy | > 80% per class |

### 3. ML Calibration
| Metric | Target |
|---|---|
| Brier Score | < 0.20 |
| Expected Calibration Error (ECE) | < 0.03 |
| Confidence Reliability | Perfectly calibrated |

### 4. Safety & Business Impact
| Metric | Target |
|---|---|
| Policy Block Rate | N/A (deterministic) |
| Safety Violations | 0 |
| Recovery Rate | > 65% |
| Incremental ₹ | Positive |

---

## 🔐 Safety Guarantees

RevCalibre enforces a **strict execution hierarchy**:

```
                  ML ANALYSIS
                      │
                      ▼
                DECISION LOGIC
                      │
                      ▼
                POLICY ENGINE ← DETERMINISTIC VETO
                      │
                      ▼
                 SAFETY GATE
                      │
                      ▼
              RAZORPAY EXECUTION
```

**Non-Bypassable Safeguards:**

1. ✓ **Maximum Retry Policy** — Hard limit on retry count
2. ✓ **Idempotency** — Duplicate execution rejection
3. ✓ **DND Compliance** — Respect communication preferences
4. ✓ **Circuit Breaker** — Stop on systemic failures
5. ✓ **Merchant Kill Switch** — Override all decisions
6. ✓ **Execution Mode** — TEST/SHADOW/LOCKED

**Fundamental Principle:**
> Intelligence proposes. Deterministic policy disposes.

---

## 🧰 Technology Stack

### Frontend
- **React** — UI framework
- **Vite** — Build tool
- **Socket.IO** — Real-time updates
- **Custom Dashboard** — Responsive design

### Backend
- **Node.js** — Runtime
- **Express.js** — API framework
- **Socket.IO** — WebSocket server
- **REST APIs** — Standard HTTP endpoints

### Machine Learning
- **Python** — Language
- **FastAPI** — API framework
- **scikit-learn** — ML library
- **Logistic Regression** — Classification model
- **Probability Calibration** — Reliability tuning

### Payments
- **Razorpay Test Mode** — Payment execution
- **Razorpay Payment Links** — Recovery mechanism
- **Webhooks** — Event processing
- **Signature Verification** — Security

### Architecture
- **Event-Driven** — Asynchronous processing
- **Deterministic Policy** — Safety enforcement
- **EV Engine** — Economic optimization
- **Shadow Execution** — Risk-free evaluation
- **A/B Experimentation** — Causal measurement
- **Immutable Audit Logs** — Financial compliance

---

## ⚠️ Limitations

This is an **MVP / hackathon implementation** with intentional constraints:

### Synthetic Data
- ML model trained on synthetic payment data
- Does not represent real Razorpay merchant traffic
- Production use requires real historical data

### Razorpay Test Mode Only
- Payment execution limited to Test Mode
- Production integration requires additional setup
- Signature verification compatible with live mode

### Simulated Degradation
- Payment failures generated by simulator
- Does not reflect production merchant infrastructure
- Demo-only scenario simulation

### In-Memory State
- Some stateful components use in-memory storage
- Production requires distributed, persistent infrastructure
- No cross-process state sharing in MVP

**Note:** These limitations are intentional to maintain hackathon scope. See **Future Roadmap** for production extensions.

---

## 🛣️ Future Roadmap

Potential extensions beyond MVP scope:

- 🔀 **Multi-Gateway Routing** — Support multiple payment gateways
- 🔌 **Production Integrations** — Real merchant data pipelines
- 🧬 **Advanced Models** — Gradient boosting, neural networks
- 📈 **Long-Horizon Strategies** — Customer lifetime value recovery
- 🤝 **Promise-to-Pay** — Deferred payment state machines
- 💬 **WhatsApp Recovery** — Conversational recovery flows
- 🎙️ **Voice/IVR** — Phone-based recovery agents
- 🔄 **Kafka Streaming** — Distributed event processing
- 📱 **Mobile App** — Native iOS/Android dashboards
- 🌍 **Multi-Currency** — Global merchant support

---

## 🏆 Why RevCalibre?

RevCalibre is **not** a simple retry system.

### It Combines:

✅ Real-Time Detection  
✅ Root Cause Diagnosis  
✅ Calibrated Probability  
✅ Economic Decisioning  
✅ Deterministic Safety  
✅ Emergency Override  
✅ Real Payment Testing  
✅ Causal Experimentation  
✅ Financial Auditability  

### The Central Question:

**NOT:** *"Can we recover this payment?"*

**INSTEAD:** *"Should we intervene, is it economically justified, is it safe, and how much incremental revenue did the intervention actually create?"*

That is the problem RevCalibre solves.

---

## 📄 Architecture Specification

See `agent.md` for the complete architecture and evaluation specification.

---

## ⚖️ License

Distributed under the **MIT License**.

See LICENSE file for details.

---

## 📞 Support & Questions

For questions, issues, or contributions:
- Open a GitHub issue
- Submit a pull request
- Check `agent.md` for architectural details

---

**Made with ❤️ for payment recovery excellence.**
