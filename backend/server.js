import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { detectAnomaly } from "./anomaly/anomalyDetector.js";
import { diagnose } from "./diagnosis/diagnosisEngine.js";

import { generatePayment } from "./simulator/paymentSimulator.js";
import { setScenario, getScenario } from "./simulator/scenarios.js";
import { calculateMetrics } from "./metrics/paymentMetrics.js";

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

let payments = [];
const MAX_PAYMENTS = 100;

const initialAnomaly = detectAnomaly(payments);
const initialDiagnosis = diagnose(initialAnomaly);


io.on("connection", (socket) => {
  console.log("Frontend connected:", socket.id);

socket.emit("initialState", {
  scenario: getScenario(),
  payments,
  metrics: calculateMetrics(payments),
  anomaly: initialAnomaly,
  diagnosis: initialDiagnosis
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

setInterval(() => {
  const scenario = getScenario();
  const payment = generatePayment(scenario);

  payments.push(payment);

  if (payments.length > MAX_PAYMENTS) {
    payments.shift();
  }

const metrics = calculateMetrics(payments);

const anomaly = detectAnomaly(payments);

const diagnosis = diagnose(anomaly);

io.emit("paymentEvent", {
  payment,
  metrics,
  scenario,
  anomaly,
  diagnosis
  });
}, 1000);

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "payment-simulator"
  });
});

server.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});