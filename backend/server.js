import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { detectAnomaly } from "./anomaly/anomalyDetector.js";
import { diagnose } from "./diagnosis/diagnosisEngine.js";

import { generatePayment } from "./simulator/paymentSimulator.js";
import { setScenario, getScenario } from "./simulator/scenarios.js";
import { calculateMetrics } from "./metrics/paymentMetrics.js";

import { calculateRecoveryDecision } from "./ev/evEngine.js";

import { evaluatePolicy } from "./policy/policyEngine.js";
import { getSafetyState, setKillSwitch, setCircuitBreaker } from "./policy/safetyState.js";
import { routeRecovery } from "./shadow/executionRouter.js";
import { getShadowDecisions } from "./shadow/shadowLogger.js";
import { getExecutionMode, setExecutionMode } from "./shadow/modeManager.js";
import { handleRazorpayWebhook } from "./razorpay/webhookHandler.js";
import { getAllRecoveries } from "./recovery/recoveryStore.js";
import { assignExperimentGroup, isAgentGroup } from "./experiment/experimentAssignment.js";
import { calculateCausalMetrics } from "./experiment/causalMetrics.js";
import { addAuditEvent, getAuditEvents, getAuditEventsForPayment, setSocketIo, logExecutionAuditEvent } from "./audit/auditStore.js";


function simulateNaturalRecovery(payment) {
  const errorCode = payment.errorCode;

  let probability = 0.20;

  switch (errorCode) {
    case "E01":
      probability = 0.35;
      break;

    case "E02":
      probability = 0.25;
      break;

    case "E03":
      probability = 0.10;
      break;

    case "E99":
      probability = 0.05;
      break;

    default:
      probability = 0.20;
  }

  return Math.random() < probability;
}

const app = express();

app.use(cors());

app.post(
  "/api/webhooks/razorpay",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const rawBody = req.body ? req.body.toString("utf8") : "";
      const signature = req.headers["x-razorpay-signature"];
      const eventId = req.headers["x-razorpay-event-id"];
      const payload = JSON.parse(rawBody || "{}");

      const result = handleRazorpayWebhook({
  rawBody,
  signature,
  eventId,
  payload
});

 

// --------------------------------------------------
// PHASE 8: UPDATE ORIGINAL PAYMENT OUTCOME
// --------------------------------------------------

if (
  result?.recovered &&
  result?.paymentId
) {
  const payment =
    payments.find(
      (p) =>
        p.paymentId ===
        result.paymentId
    );

  if (payment) {
  if (payment.experimentOutcome !== "RECOVERED") {
    cumulativeRevenue += Number(result.recoveredAmount || payment.amount || 0);
  }
  payment.experimentOutcome = "RECOVERED";

  payment.recoveredAmount =
    result.recoveredAmount;

  addAuditEvent({
    type: "PAYMENT_RECOVERED",
    paymentId: payment.paymentId,
    action: "PAYMENT_LINK",
    details: {
      recoveredAmount:
        payment.recoveredAmount
    }
  });

  console.log(
    "PHASE 8 AGENT RECOVERY RECORDED",
    {
      paymentId:
        payment.paymentId,

      experimentGroup:
        payment.experimentGroup,

      recoveredAmount:
        payment.recoveredAmount
    }
  );

  io.emit("recoveryUpdated", {
    paymentId:
      payment.paymentId,

    experimentGroup:
      payment.experimentGroup,

    experimentOutcome:
      payment.experimentOutcome,

    recoveredAmount:
      payment.recoveredAmount
  });
}
}


      return res.status(200).json(result);
    } catch (error) {
      console.error("Razorpay webhook error:", error);

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
        methods: ["GET", "POST"]
    }
});

setSocketIo(io);

let payments = [];
let cumulativeRevenue = 0;
const MAX_PAYMENTS = 100;

const initialAnomaly = detectAnomaly(payments);
const initialDiagnosis = diagnose(initialAnomaly);


io.on("connection", (socket) => {
  console.log("Frontend connected:", socket.id);

socket.emit("initialState", {
  scenario: getScenario(),
  payments,
  metrics: calculateMetrics(payments, cumulativeRevenue),
  causalMetrics: calculateCausalMetrics(payments),
  anomaly: initialAnomaly,
  diagnosis: initialDiagnosis,
  auditEvents: getAuditEvents()
});

  socket.on("setScenario", (scenario) => {
    try {
      setScenario(scenario);
      console.log("Scenario changed:", scenario);

      io.emit("scenarioChanged", {
        scenario
      });
    } catch (error) {
      socket.emit("errorMessage", {
        message: error.message
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Frontend disconnected:", socket.id);
  });
});

setInterval( async () => {
  const scenario = getScenario();
  const payment = generatePayment(scenario);

  if (payment.status === "SUCCESS") {
    cumulativeRevenue += Number(payment.amount || 0);
  }

  payments.push(payment);

  if (payments.length > MAX_PAYMENTS) {
    payments.shift();
  }

const metrics = calculateMetrics(payments, cumulativeRevenue);

const anomaly = detectAnomaly(payments);

const diagnosis = diagnose(anomaly);


let recoveryDecision = null;
let policyDecision = null;
let executionResult = null;

if (payment.status === "FAILED") {

  addAuditEvent({
  type: "PAYMENT_FAILED",
  paymentId: payment.paymentId,
  details: {
    amount: payment.amount,
    errorCode: payment.errorCode
  }
});

  payment.experimentGroup =
    assignExperimentGroup();

  if (
    payment.experimentGroup ===
    "CONTROL"
  ) {

    const naturallyRecovered =
      simulateNaturalRecovery(payment);

    if (naturallyRecovered) {

      payment.experimentOutcome =
        "RECOVERED";

      payment.recoveredAmount =
        Number(payment.amount);

      cumulativeRevenue += payment.recoveredAmount;

    } else {

      payment.experimentOutcome =
        "NOT_RECOVERED";

      payment.recoveredAmount = 0;
    }

  }

  else {

    recoveryDecision =
      await calculateRecoveryDecision(
        payment,
        diagnosis
      );

    addAuditEvent({
  type: "RECOVERY_DECISION",
  paymentId: payment.paymentId,
  action: recoveryDecision.selectedAction,
  details: {
    probability:
      recoveryDecision.selectedProbability,

    expectedValue:
      recoveryDecision.selectedExpectedValue
  }
});

    policyDecision =
      evaluatePolicy(
        payment,
        recoveryDecision
      );

    addAuditEvent({
      type: "POLICY_DECISION",
      paymentId: payment.paymentId,
      action: recoveryDecision.selectedAction,
      details: {
        allowed: policyDecision.allowed,
        blockReason: policyDecision.blockReason || null
      }
    });

    if (!policyDecision.allowed) {
      executionResult = await routeRecovery({
        payment,
        diagnosis,
        recoveryDecision,
        policyDecision
      });

      logExecutionAuditEvent(payment, recoveryDecision, policyDecision, executionResult);
    }

  }
}
const causalMetrics = calculateCausalMetrics(payments);
  io.emit("paymentEvent", {
    payment,
    metrics,
    causalMetrics,
    scenario,
    anomaly,
    diagnosis,
    recoveryDecision,
    policyDecision,
    executionResult
  });
}, 5000);

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "payment-simulator"
  });
});

app.get("/api/safety", (req, res) => {
  res.json(getSafetyState());
});

app.get("/api/shadow", (req, res) => {
  res.json(getShadowDecisions());
});

app.get("/api/shadow/decisions", (req, res) => {
  res.json({
    mode: "SHADOW",
    count: getShadowDecisions().length,
    decisions: getShadowDecisions()
  });
});

app.get("/api/mode", (req, res) => {
  res.json({
    mode: getExecutionMode()
  });
});

app.get("/api/recovery", (req, res) => {
  res.json({
    count: getAllRecoveries().length,
    recoveries: getAllRecoveries()
  });
});

app.get("/api/audit", (req, res) => {
  res.json({
    count: getAuditEvents().length,
    events: getAuditEvents()
  });
});

app.get("/api/audit/:paymentId", (req, res) => {
  const events =
    getAuditEventsForPayment(
      req.params.paymentId
    );

  res.json({
    paymentId: req.params.paymentId,
    count: events.length,
    events
  });
});

app.post("/api/mode", (req, res) => {
  try {
    const { mode } = req.body;

    const newMode = setExecutionMode(mode);

    addAuditEvent({
      type: "MODE_CHANGED",
      action: "CHANGE_EXECUTION_MODE",
      details: {
        mode: newMode
      }
    });

    res.json({
      success: true,
      mode: newMode
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/api/safety/kill-switch", (req, res) => {
  const { enabled } = req.body;

  const state = setKillSwitch(enabled);

  addAuditEvent({
    type: "KILL_SWITCH_UPDATED",
    action: enabled ? "ENABLE_KILL_SWITCH" : "DISABLE_KILL_SWITCH",
    details: {
      enabled,
      merchantKillSwitch: state.merchantKillSwitch
    }
  });

  res.json({
    success: true,
    ...state
  });
});

app.post("/api/safety/circuit-breaker", (req, res) => {
  const { open } = req.body;

  const state = setCircuitBreaker(open);

  addAuditEvent({
    type: "CIRCUIT_BREAKER_UPDATED",
    action: open ? "OPEN_CIRCUIT_BREAKER" : "CLOSE_CIRCUIT_BREAKER",
    details: {
      open,
      circuitBreakerOpen: state.circuitBreakerOpen
    }
  });

  res.json({
    success: true,
    ...state
  });
});

app.post("/api/recovery/execute", async (req, res) => {
  try {
    const { paymentId } = req.body;

    const payment = payments.find(
      (p) => p.paymentId === paymentId
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment not found"
      });
    }

    if (payment.status !== "FAILED") {
      return res.status(400).json({
        success: false,
        error: "Only failed payments can be recovered"
      });
    }

    const diagnosis = diagnose(
      detectAnomaly(payments)
    );

    const recoveryDecision =
      await calculateRecoveryDecision(
        payment,
        diagnosis
      );

    const policyDecision =
      evaluatePolicy(
        payment,
        recoveryDecision
      );

    const executionResult =
      await routeRecovery({
        payment,
        diagnosis,
        recoveryDecision,
        policyDecision
      });

    logExecutionAuditEvent(payment, recoveryDecision, policyDecision, executionResult);

    return res.json({
      success: true,
      payment,
      diagnosis,
      recoveryDecision,
      policyDecision,
      executionResult
    });

  } catch (error) {
    console.error(
      "Recovery execution error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const port = Number(process.env.PORT) || 5000;


server.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});


