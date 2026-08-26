import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import "./App.css";

const socket = io("http://localhost:5000");


function App() {
  const [anomaly, setAnomaly] = useState({
  anomaly: false
});

const [diagnosis, setDiagnosis] = useState({
  category: "NO_ACTIVE_INCIDENT",
  explanation: "Waiting for sufficient data.",
  supportingEvidence: []
});

  const [payments, setPayments] = useState([]);
  const [metrics, setMetrics] = useState({
    totalPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    successRate: 0,
    failureRate: 0,
    revenue: 0
  });

  const [scenario, setScenario] = useState("NORMAL");

  useEffect(() => {
  socket.on("initialState", data => {
  setPayments(data.payments);
  setMetrics(data.metrics);
  setScenario(data.scenario);
  setAnomaly(data.anomaly);
  setDiagnosis(data.diagnosis);
});

  socket.on("paymentEvent", data => {
  setPayments(prev => [
    ...prev.slice(-49),
    data.payment
  ]);

  setMetrics(data.metrics);
  setScenario(data.scenario);

  setAnomaly(data.anomaly);
  setDiagnosis(data.diagnosis);
});

    socket.on("scenarioChanged", data => {
      setScenario(data.scenario);
    });

    return () => {
      socket.off("initialState");
      socket.off("paymentEvent");
      socket.off("scenarioChanged");
    };
  }, []);

  function changeScenario(newScenario) {
    socket.emit("setScenario", newScenario);
  }

  return (
    <div className="dashboard">

      <header>
        <h1>AI Revenue Recovery Agent</h1>

        <p>
          Synthetic Payment Simulator — Phase 1
        </p>
      </header>

      <section className="controls">

        <button
          onClick={() => changeScenario("NORMAL")}
        >
          Normal Traffic
        </button>

        <button
          onClick={() => changeScenario("BANK_FAILURE")}
        >
          Inject Bank Failure
        </button>

        <button
          onClick={() => changeScenario("FRICTION")}
        >
          Inject Friction
        </button>

        <button
          onClick={() => changeScenario("SYSTEMIC_FAILURE")}
        >
          Inject Systemic Failure
        </button>

      </section>

      <div className="scenario">
        Current Scenario:
        <strong>{scenario}</strong>
      </div>

      <section className="incident-panel">

  <h2>Incident Detection</h2>

  {!anomaly.anomaly ? (
    <div className="healthy">
      ✓ PAYMENT HEALTH NORMAL
    </div>
  ) : (
    <div className="incident">

      <h3>
        🚨 ANOMALY DETECTED
      </h3>

      <p>
        Success rate dropped by{" "}
        <strong>
          {anomaly.successRateDrop}%
        </strong>
      </p>

      <p>
        Baseline:{" "}
        <strong>
          {anomaly.baseline?.successRate}%
        </strong>
      </p>

      <p>
        Current:{" "}
        <strong>
          {anomaly.current?.successRate}%
        </strong>
      </p>

    </div>
  )}

</section>

<section className="diagnosis-panel">

  <h2>Root Cause Diagnosis</h2>

  <div className="diagnosis-card">

    <h3>
      {diagnosis.category}
    </h3>

    <p>
      {diagnosis.explanation}
    </p>

    <h4>Supporting Evidence</h4>

    <ul>
      {diagnosis.supportingEvidence?.map(
        (evidence, index) => (
          <li key={index}>
            {Object.entries(evidence)
              .map(([key, value]) =>
                `${key}: ${value}`
              )
              .join(" | ")}
          </li>
        )
      )}
    </ul>

  </div>

</section>

      <section className="metrics">

        <div className="card">
          <span>Total Payments</span>
          <strong>{metrics.totalPayments}</strong>
        </div>

        <div className="card">
          <span>Success Rate</span>
          <strong>{metrics.successRate}%</strong>
        </div>

        <div className="card">
          <span>Failure Rate</span>
          <strong>{metrics.failureRate}%</strong>
        </div>

        <div className="card">
          <span>Revenue</span>
          <strong>₹{metrics.revenue}</strong>
        </div>

      </section>

      <section className="payments">

        <h2>Live Payment Stream</h2>

        <table>

          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Error</th>
              <th>Retry</th>
              <th>Timestamp</th>
            </tr>
          </thead>

          <tbody>

            {[...payments].reverse().map(payment => (

              <tr key={payment.paymentId}>

                <td>{payment.paymentId.slice(0, 12)}...</td>

                <td>₹{payment.amount}</td>

                <td className={payment.status.toLowerCase()}>
                  {payment.status}
                </td>

                <td>
                  {payment.errorCode || "-"}
                </td>

                <td>
                  {payment.retryCount}
                </td>

                <td>
                  {new Date(
                    payment.timestamp
                  ).toLocaleTimeString()}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </section>

    </div>
  );
}

export default App;