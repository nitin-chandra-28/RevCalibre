STRATEGIC PLAN & ARCHITECTURE SPEC • V2.0 UPGRADED
Autonomous Payment Revenue Recovery Agent
Calibrated EV Decisioning, Deterministic Policy Invariants, A/B Holdout Causality & Kill Switch
CORE WINNING NARRATIVE
"When payment revenue drops, our agent determines whether the merchant should act at all. It diagnoses the failure, computes
empirically calibrated Expected Value (EV), routes through deterministic policy guardrails with a merchant kill switch, and proves
causality via randomized control holdouts."
1. COMPLETE 10-STAGE EXECUTION PIPELINE
01
DETECT
Stream
anomaly
→
02
DIAGNOSE
Decline code
RCA
→
03
CALIBRATE
Trained
P(success)
→
04
EV DECIDE
Select max net
EV
→
05
POLICY
Hard guardrails
→
06
SAFETY
Kill switch /
Shadow
→
07
EXECUTE
Razorpay test
mode
→
08
WEBHOOK
Settlement
event
→
09
CONTROL
A/B holdout test
→
10
AUDIT ₹
Causal
recovery
2. SYSTEM ARCHITECTURE: STRICT INVARIANT FLOW
Architectural Invariant: LLM resides strictly in understanding/explanation. The Calibrated EV Engine optimizes mathematically, and the Deterministic
Policy Engine + Kill Switch holds non-bypassable final veto authority.
Payment Events Stream & Telemetry
↓
Anomaly Detection & Decline Classifier (LLM Explainer Layer)
↓
Calibrated EV Engine
P(success) from Trained Model on Held-Out Test Set • EV = (P(S) × Value) − Cost
↓ Candidate Intervention Action
DETERMINISTIC POLICY ENGINE (Hard Invariants)
• Max Retries (N ≤ 2)  |  • Idempotency Keys  |  • DND Compliance  |  • Circuit Breakers
↓
SAFETY GATE: Merchant Emergency Kill Switch & Mode Router
Emergency Stop (Override All)  |  Route: [ Shadow Mode ] vs [ Live Razorpay Test
Mode ]
[ ALLOWED & PASSED ] ↓ ↓ [ KILLED / BLOCKED ]
Razorpay Execution
Webhook Outcome Listener
Audit Logger & Escalation
Safe Halt & Merchant Alert
↓
Causal Attribution Engine (Randomized Holdout Group vs Agent Intervention)
3. KEY ENHANCEMENTS: CALIBRATION, CAUSALITY & SAFETY
1. Calibrated P(success) & Held-Out Testing
Eliminates hallucinated probabilities by grounding EV in historical/
synthetic empirical distributions.
Model Pipeline: Synthetic Logs → Probability Classifier → HeldOut Validation.
Calibration Metrics: Report Brier score, ECE (Expected
Calibration Error), and Predicted vs. Actual success rates (e.g.,
Pred: 78%, Act: 75%).
2. Randomized Control Holdout (True Causality)
Proves the agent caused the recovery, rather than capturing natural
retries.
1,000 Failed Payments Split:
• Agent Group (80%): ₹5.20L recovered via dynamic
intervention.
• Control Group (20%): ₹2.10L organic baseline recovery.
Proven Causal Lift: + ₹3.10L Incremental Revenue.
•
•
•
•
Autonomous Payment Revenue Recovery Agent • Architecture & Evaluation Spec v2.0 Page 1 of 2
3. Merchant Emergency Kill Switch
Instant merchant override meeting all autonomous bounding criteria.
One-click UI toggle setting system state to LOCKED.
Instantly rejects 100% of outgoing webhooks/payment links
regardless of model confidence or EV scores.
4. Safe Shadow Mode Evaluation
Zero-risk production benchmarking mode.
Execution Flow: Ingest stream → Diagnose → Compute EV →
Propose Action → NO Execution.
Allows logging hypothetical PnL and evaluating decision
accuracy against un-intervened customer paths.
4. RIGOROUS HACKATHON EVALUATION FRAMEWORK
DIMENSION EVALUATION METRICS HACKATHON VERIFICATION BENCHMARK
Detection Quality Precision, Recall, F1, False-Alarm Rate Detect injected synthetic gateway drops within < 3 data points.
Diagnosis & RCA Systemic vs. Frictional Accuracy 100% correct classification on decline codes (E01 vs E99).
EV Calibration Brier Score, Calibration Curve / Error Empirical validation against held-out test split.
Safety & Policy Policy-Block Rate, Zero Violation Rule 100% block on N > 2 retries and Active Kill Switch test.
Causal Business Impact Incremental ₹ = Agent Recovered − Control Baseline Isolate true causal ₹ lift over natural buyer retry baseline.
5. MVP SCOPE BOUNDARY VS. FUTURE ROADMAP ("WHAT TO ADD LATER")
LOCKED FOR MVP (SEPT 5)
Synthetic Stream Generator: Normal flow + injected bank
degradations + frictional drops.
Trained Calibrated EV Scorer: Empirical lookup / classifier for
P(success).
Hard Policy Engine & Kill Switch: Idempotency, DND, max 2
retries, manual toggle.
Shadow Mode & Razorpay Sandbox: Dual-mode execution
engine with webhook feedback.
A/B Holdout Causality Board: UI proving causal recovery vs
holdout group.
EXPLICITLY POST-HACKATHON (DO NOT ADD NOW)
Hinglish Voice / IVR Agent: High latency, nondeterministic
failure surface.
WhatsApp Chatbot Workflow: Distracts from backend recovery
economics.
Full PTP State Machine: Complex multi-day promise-to-pay
tracking.
Distributed Kafka Architecture: Unnecessary overhead for
MVP evaluation.
Multi-Gateway Dynamic Routing: Broadens scope away from
core causal loop.
•
•
•
•
•
•
•
•
•
•
•
•
•
•
Autonomous Payment Revenue Recovery Agent • Architecture & Evaluation Spec v2.0 Page 2 of 2



Autonomous Payment Revenue Recovery Agent —
Master Build Context
1. Project Goal
Build an Autonomous Payment Revenue Recovery Agent that detects payment-revenue degradation,
diagnoses why payments are failing, estimates the probability of successful recovery, calculates the
Expected Value (EV) of possible recovery actions, applies deterministic safety policies, optionally executes a
recovery action through Razorpay Test Mode, receives the outcome through webhooks, and measures the
causal incremental revenue generated by the agent.
The system must be designed as a controlled autonomous system, not an unrestricted LLM agent.
Core principle:
LLM explains → ML predicts P(success) → EV engine decides economically → deterministic policy can
veto → kill switch can veto everything → execution happens only when allowed.
The project specification requires the LLM to remain in the understanding/explanation layer, while the
calibrated EV engine performs mathematical decisioning and the deterministic Policy Engine + Kill Switch
have final veto authority.
2. Complete System Pipeline
Build the following 10-stage pipeline:
DETECT
Detect payment/revenue anomalies from a synthetic payment stream.
DIAGNOSE
Determine the likely failure category/root cause from payment events and decline codes.
LLM may be used for explanation, but not final financial decision-making.
CALIBRATE
Train a probability classifier to estimate: P(success)
Use held-out validation and probability calibration.
1.
2.
3.
4.
5.
6.
7.
8.
1
Evaluate Brier Score and ECE.
EV DECIDE
Evaluate candidate recovery actions.
Calculate: EV = P(success) × Value − Cost
Select the action with the highest acceptable net EV.
POLICY
Apply deterministic hard safety rules:
Maximum 2 retries
Idempotency
DND compliance
Circuit breakers
SAFETY
Apply merchant emergency Kill Switch.
Support Shadow Mode and Live/Test Mode.
EXECUTE
Execute permitted recovery actions using Razorpay Test Mode.
WEBHOOK
Receive Razorpay outcome events.
Verify webhook signatures.
Handle duplicate events idempotently.
Update recovery status and recovered amount.
CONTROL
Randomly divide failed payments into Agent and Control groups.
Recommended MVP split: 80% Agent / 20% Control.
AUDIT ₹
9.
10.
11.
12.
13.
14.
15.
◦
◦
◦
◦
16.
17.
18.
19.
20.
21.
22.
23.
24.
25.
26.
27.
28.
29.
2
Calculate actual recovery and estimated causal/incremental revenue.
Maintain an audit trail of decisions and actions.
3. Architecture Invariant
The architecture must preserve this authority hierarchy:
Payment Events ↓ Anomaly Detection ↓ Diagnosis / LLM Explanation ↓ Calibrated P(success) Model ↓ EV
Engine ↓ Candidate Action ↓ Deterministic Policy Engine ↓ Kill Switch / Mode Router ↓ Razorpay Test
Mode ↓ Webhook ↓ Outcome + Audit ↓ Causal Attribution
Important:
The LLM must NOT directly execute payments.
The LLM must NOT bypass policy rules.
The ML model must NOT directly execute payments.
Positive EV does NOT guarantee execution.
Policy violations must always block execution.
Kill Switch must override every other decision.
Shadow Mode must never execute recovery actions.
4. Technology Direction
Preferred stack:
Frontend
React / Next.js
Tailwind CSS
Recharts or equivalent charting library
Backend
Node.js
TypeScript
Express
Database
PostgreSQL
30.
31.
•
•
•
•
•
•
•
•
•
•
•
•
•
•
3
ML
Python
scikit-learn
FastAPI if a separate ML service is needed
Payment
Razorpay Test Mode
Razorpay Payment Links where appropriate
Razorpay Webhooks
LLM
Existing LLM/API
No LLM training or fine-tuning required for MVP
5. Phase Roadmap
PHASE 0 — Project Architecture & Setup
Goal
Create the base project and establish the frontend/backend/database structure.
Build
Next.js/React frontend
Node.js/TypeScript backend
PostgreSQL database
Basic API communication
Environment variable configuration
Base folder structure
Initial database tables
merchants
payments
payment_events
Completion condition
A test payment can be created through the backend and stored/retrieved from PostgreSQL.
Do NOT start ML or complex AI here.
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
4
PHASE 1 — Synthetic Payment Simulator
Goal
Create a realistic simulated payment environment.
Build
Generate payment events containing:
payment ID
merchant ID
customer ID
amount
status
error code
retry count
timestamp
Simulated scenarios
Normal traffic
Bank degradation
Customer/payment friction
Systemic/gateway failure
Failure injection controls
Dashboard should provide controls such as:
Normal Traffic
Inject Bank Failure
Inject Friction
Inject Systemic Failure
Completion condition
Clicking a failure-injection control changes the simulated payment stream and visibly increases failure/
revenue degradation.
•
•
•
•
•
•
•
•
1.
2.
3.
4.
•
•
•
•
5
PHASE 2 — Anomaly Detection & Diagnosis
2A. Anomaly Detection
Goal
Detect when payment/revenue health significantly drops.
Track:
baseline success rate
current success rate
failure rate
revenue per minute
error-code distribution
Detect abnormal changes.
Example:
Normal: Success = 92%
Current: Success = 58%
Result: ANOMALY DETECTED
2B. Diagnosis
Determine the likely failure category using decline/error patterns.
The initial implementation can use deterministic mappings/rules.
Example:
E01 → temporary/system issue E02 → friction/customer issue E03 → insufficient funds E99 → systemic issue
Then use an LLM for richer explanation.
The LLM should output structured diagnosis such as:
category
explanation
supporting evidence
The LLM is an explanation layer only.
•
•
•
•
•
•
•
•
6
Completion condition
The system detects an injected degradation and displays a meaningful root-cause diagnosis.
PHASE 3 — Recovery Decision & EV Engine
Goal
Make the system decide whether recovery is economically worthwhile.
Candidate actions
Initially support a small set:
DO NOTHING
RETRY
RETRY AFTER DELAY
PAYMENT LINK
P(success)
At first, during development, a temporary/simple probability source may be used so the EV architecture can
be built.
Later this will be replaced with the trained calibrated ML model in Phase 7.
EV formula
EV = P(success) × Payment Value − Action Cost
Example:
Payment = ₹1,000 P(success) = 0.78 Cost = ₹10
EV = (0.78 × ₹1,000) − ₹10 EV = ₹770
Compare candidate actions and select the best economically justified action.
Database
Add:
candidate_actions
decisions
•
•
•
•
•
•
7
Completion condition
For a failed payment, the system shows:
diagnosis
candidate actions
P(success)
expected value
selected action
PHASE 4 — Deterministic Safety & Policy Engine
Goal
Prevent unsafe or unauthorized autonomous actions.
Implement deterministic rules:
Maximum retries ≤ 2
Idempotency
DND compliance
Circuit breaker
Merchant Kill Switch
Policy principle
The Policy Engine has final veto authority.
Example:
AI/EV: RETRY EV = ₹770
Policy: Retry count already = 2
Result: BLOCKED
The action must NOT execute.
Kill Switch
Merchant dashboard must have an emergency toggle.
•
•
•
•
•
1.
2.
3.
4.
5.
8
When Kill Switch is ON:
all outgoing recovery actions are rejected
model confidence does not matter
EV does not matter
policy approval does not matter
Completion condition
The system can demonstrate that a high-EV action is still blocked when a hard safety rule is violated.
PHASE 5 — Shadow Mode
Goal
Allow safe evaluation without real/test execution.
Flow:
Payment → Diagnosis → P(success) → EV → Policy → Proposed Action → NO EXECUTION
Shadow Mode should log:
what action would have been taken
predicted probability
EV
policy result
hypothetical outcome/PnL where possible
Modes
Support:
SHADOW
TEST/LIVE execution mode
Completion condition
Agent can make complete recovery decisions without executing them.
•
•
•
•
•
•
•
•
•
•
•
9
PHASE 6 — Razorpay Test Mode & Webhooks
Goal
Connect the recovery engine to Razorpay Test Mode.
Use Razorpay Test Mode only for the MVP.
Recovery flow
Failed Payment → Agent Decision → Policy Approval → Razorpay Payment Link / recovery action → Test
Payment → Razorpay Webhook → Recovery Result → Database Update
Backend
Create Razorpay integration module.
Webhook endpoint
Example:
POST /api/webhooks/razorpay
Webhook requirements
signature verification
event ID tracking
duplicate event protection
idempotent processing
recovery status update
recovered amount recording
Completion condition
A simulated failed payment can trigger a Razorpay Test Mode recovery flow and the webhook updates the
recovery result.
PHASE 7 — ML Training & Calibration
Goal
Replace temporary probability logic with a real trained probability classifier.
IMPORTANT: No large model or LLM training is required.
•
•
•
•
•
•
10
Train a small ML classifier using synthetic historical payment logs.
Dataset
Generate historical examples containing features such as:
error code
payment amount
retry count
gateway health
time since failure
customer/payment history
previous attempt result
Target: recovered = 0 or 1
Training
Example:
10,000 synthetic records
80%: training
20%: held-out testing
Use a simple classifier such as Logistic Regression initially.
Output
For a new payment:
P(success) = 0.78
Calibration
The probability must be calibrated so predicted probabilities correspond reasonably to observed success
rates.
Evaluate:
Brier Score
Expected Calibration Error (ECE)
predicted vs actual success rates
calibration curve
•
•
•
•
•
•
•
•
•
•
•
11
Important
Do not claim the model learned from real Razorpay merchant data unless real data is actually available.
Clearly identify synthetic training data in the MVP.
Completion condition
The EV engine receives P(success) from the trained/calibrated model.
PHASE 8 — Randomized A/B Holdout & Causal
Revenue
Goal
Prove that the agent caused incremental recovery instead of simply observing natural retries.
Experiment
Randomly assign failed payments:
80%: Agent group
20%: Control group
Control group should not receive the autonomous intervention.
Measure
Agent recovery rate
Control recovery rate
Agent recovered revenue
Control baseline recovery
incremental/causal revenue
Normalize control results appropriately when group sizes differ.
Example structure
Agent: 800 payments ₹X recovered
Control: 200 payments ₹Y recovered
Estimate control baseline for the Agent population.
•
•
•
•
•
12
Then calculate:
Incremental Revenue = Agent Recovery − Expected Control Recovery
Completion condition
Dashboard can answer:
"How much additional revenue did the agent generate compared with natural recovery?"
PHASE 9 — Dashboard, Audit & Observability
Goal
Create the final polished command center.
Dashboard sections
Revenue Health
Show:
total payment volume
failed payments
recovered revenue
recovery rate
incremental revenue
Incident Detection
Show:
current success rate
baseline success rate
revenue drop
failure distribution
current incident/root cause
Agent Decision
Show:
Diagnosis ↓ P(success) ↓ Candidate Actions ↓ EV ↓ Policy ↓ Selected Action
•
•
•
•
•
•
•
•
•
•
13
Safety
Show:
Kill Switch state
Shadow/Execution mode
blocked actions
retry-limit violations
idempotency blocks
circuit breaker state
Causal Impact
Show:
Agent group
Control group
recovery rates
recovered revenue
incremental revenue
Audit Timeline
Example:
14:32:01 — Anomaly detected 14:32:02 — Diagnosis completed 14:32:03 — P(success) calculated 14:32:03 —
EV calculated 14:32:03 — Policy passed 14:32:04 — Recovery executed 14:32:36 — Webhook received
14:32:36 — ₹1,499 recovered
Completion condition
A judge can understand the entire agent decision and financial impact from one dashboard.
PHASE 10 — Testing & Final Demonstration
Goal
Prove the system works and prepare the final hackathon demo.
Required tests
Normal traffic
No unnecessary intervention.
•
•
•
•
•
•
•
•
•
•
•
1.
2.
14
Gateway/systemic failure
Detect → Diagnose → Recover.
Retry count = 2
Action blocked.
Kill Switch ON
All autonomous actions blocked.
Duplicate webhook
Revenue is not double-counted.
Shadow Mode
Decisions generated but no execution.
A/B Holdout
Causal/incremental revenue calculated.
Evaluation metrics
Measure where practical:
Precision
Recall
F1
False-alarm rate
Diagnosis accuracy
Brier Score
ECE
Policy-block rate
Zero safety violations
Recovery rate
Incremental revenue
Final demo story
Start with normal payment health.
3.
4.
5.
6.
7.
8.
9.
10.
11.
12.
13.
14.
•
•
•
•
•
•
•
•
•
•
•
15
Then:
Inject payment/gateway degradation.
Agent detects revenue anomaly.
Agent diagnoses the problem.
Calibrated model predicts recovery probability.
EV engine evaluates recovery options.
Policy engine checks safety.
Kill Switch/Shadow Mode is demonstrated.
Allowed action executes through Razorpay Test Mode.
Webhook confirms the outcome.
Agent/control experiment measures incremental revenue.
Dashboard shows the final ₹ impact.
6. Features Explicitly OUT OF MVP
Do NOT add these before the core system works:
Hinglish Voice / IVR Agent
WhatsApp chatbot workflow
Full multi-day Promise-to-Pay state machine
Distributed Kafka architecture
Multi-gateway dynamic routing
These are post-hackathon features.
Prioritize the core causal recovery loop.
7. Development Rules
Build one phase at a time.
Do not start ML before the payment simulator and decision architecture work.
Do not start Razorpay integration before the internal recovery loop works.
Keep the LLM away from final financial execution authority.
Keep safety rules deterministic.
Test every phase before moving to the next.
Prefer simple implementations over unnecessary complexity.
Do not claim real-world performance using synthetic data.
Every recovery action must be auditable.
Every autonomous execution must pass the Policy Engine and Kill Switch checks.
1.
2.
3.
4.
5.
6.
7.
8.
9.
10.
11.
•
•
•
•
•
1.
2.
3.
4.
5.
6.
7.
8.
9.
10.
16
8. Current Phase Tracking
At the beginning of every new development session, determine:
CURRENT PHASE: [Fill in the active phase]
COMPLETED: [What has already been implemented]
CURRENT TASK: [Exact feature being built]
NEXT: [Next phase/task]
Do not jump ahead unnecessarily.
If the current phase is incomplete, prioritize completing and testing it before starting later phases.
9. Definition of Success
The finished project should demonstrate:
Detect → Diagnose → Predict → Calculate EV → Enforce Safety → Execute → Receive Outcome →
Measure Causal ₹
The final system should answer three questions:
Why is payment revenue failing?
Is recovery economically worth attempting?
How much incremental revenue did the agent actually cause?
The system should be presented as a controlled autonomous revenue recovery system, not merely an AI
chatbot or payment retry script.
1.
2.
3.
17