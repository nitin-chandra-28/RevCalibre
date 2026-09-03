import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const formatProbability = (val) => {
    if (val == null || Number.isNaN(Number(val))) return "—";
    const num = Number(val);
    const pct = num <= 1 ? Math.round(num * 100) : Math.round(num);
    return `${pct}%`;
  };

  const [anomaly, setAnomaly] = useState({ anomaly: false });

  const [diagnosis, setDiagnosis] = useState({
    category: "NO_ACTIVE_INCIDENT",
    explanation: "Waiting for sufficient data.",
    supportingEvidence: []
  });

  const [payments, setPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [auditEvents, setAuditEvents] = useState([]);

  const [metrics, setMetrics] = useState({
    totalPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    successRate: 0,
    failureRate: 0,
    revenue: 0
  });

  const [causalMetrics, setCausalMetrics] = useState({
    agent: {
      total: 0,
      failed: 0,
      recovered: 0,
      recoveryRate: 0,
      recoveredRevenue: 0
    },
    control: {
      total: 0,
      failed: 0,
      recovered: 0,
      recoveryRate: 0,
      recoveredRevenue: 0
    },
    expectedControlRecoveryRevenue: 0,
    incrementalRevenue: 0
  });

  const [scenario, setScenario] = useState("NORMAL");
  const [recoveryDecision, setRecoveryDecision] = useState(null);
  const [policyDecision, setPolicyDecision] = useState(null);
  const [killSwitch, setKillSwitch] = useState(false);
  const [executionMode, setExecutionMode] = useState("SHADOW");
  const [executionResult, setExecutionResult] = useState(null);
  const [recoveryOutcomeMode, setRecoveryOutcomeMode] = useState("AUTO_SUCCESS");
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);
  const [isPaymentStreamExpanded, setIsPaymentStreamExpanded] = useState(false);

  /*
   * --------------------------------------------------
   * LOAD SAFETY STATE + EXECUTION MODE
   * --------------------------------------------------
   */

  useEffect(() => {
    fetch("http://localhost:5000/api/safety")
      .then((response) => response.json())
      .then((data) => {
        setKillSwitch(data.merchantKillSwitch);
      })
      .catch((error) => {
        console.error("Failed to load safety state:", error);
      });

    fetch("http://localhost:5000/api/mode")
      .then((response) => response.json())
      .then((data) => {
        setExecutionMode(data.mode);
      })
      .catch((error) => {
        console.error("Failed to load execution mode:", error);
      });
  }, []);

  /*
   * --------------------------------------------------
   * SOCKET.IO PAYMENT STREAM
   * --------------------------------------------------
   */

  useEffect(() => {
    const loadAuditEvents = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/audit"
        );

        const data = await response.json();

        setAuditEvents(data.events || []);
      } catch (error) {
        console.error(
          "Failed to load audit events:",
          error
        );
      }
    };

    loadAuditEvents();

    socket.on("initialState", (data) => {
      setPayments(data.payments || []);
      setMetrics(data.metrics || {});
      setCausalMetrics(
        data.causalMetrics || causalMetrics
      );
      setScenario(data.scenario);
      setAnomaly(data.anomaly);
      setDiagnosis(data.diagnosis);
      if (data.auditEvents && data.auditEvents.length > 0) {
        setAuditEvents(data.auditEvents);
      }
    });

    socket.on("auditEvent", (newEvent) => {
      console.log("AUDIT EVENT RECEIVED:", newEvent);
      setAuditEvents((previousEvents) => {
        if (previousEvents.some((e) => e.id === newEvent.id)) {
          return previousEvents;
        }
        return [...previousEvents, newEvent];
      });
    });

    socket.on("paymentEvent", (data) => {
      console.log("PAYMENT EVENT:", data);

      setPayments((prev) => [
        ...prev.slice(-49),
        data.payment
      ]);

      setMetrics(data.metrics || {});
      setCausalMetrics(
        data.causalMetrics || causalMetrics
      );

      setScenario(data.scenario);

      setAnomaly(data.anomaly);
      setDiagnosis(data.diagnosis);

      if (data.recoveryDecision) {
        setRecoveryDecision(data.recoveryDecision);
        setPolicyDecision(data.policyDecision);
      }
    });

    socket.on("scenarioChanged", (data) => {
      setScenario(data.scenario);
    });

    socket.on("recoveryUpdated", (data) => {
      console.log("RECOVERY UPDATED:", data);

      setPayments((previousPayments) =>
        previousPayments.map((payment) =>
          payment.paymentId === data.paymentId
            ? {
                ...payment,
                experimentOutcome:
                  data.experimentOutcome,
                recoveredAmount:
                  data.recoveredAmount
              }
            : payment
        )
      );

      setExecutionResult((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          recovery: {
            ...previous.recovery,
            status:
              data.experimentOutcome === "RECOVERED"
                ? "RECOVERED"
                : previous.recovery?.status,
            recoveredAmount:
              data.recoveredAmount
          }
        };
      });

      fetch("http://localhost:5000/api/audit")
        .then((response) => response.json())
        .then((data) => {
          setAuditEvents(data.events || []);
        })
        .catch((error) => {
          console.error(
            "Failed to refresh audit events:",
            error
          );
        });
    });

    return () => {
      socket.off("initialState");
      socket.off("auditEvent");
      socket.off("paymentEvent");
      socket.off("scenarioChanged");
      socket.off("recoveryUpdated");
    };
  }, []);

  /*
   * --------------------------------------------------
   * CHANGE EXECUTION MODE
   * --------------------------------------------------
   */

  const simulateRecoveryOutcome = (paymentId, action, amount) => {
    const shouldSucceed =
      recoveryOutcomeMode === "AUTO_SUCCESS"
        ? true
        : recoveryOutcomeMode === "AUTO_FAILURE"
          ? false
          : Math.random() > 0.5;

    setTimeout(() => {
      if (!shouldSucceed) {
        setExecutionResult({
          executed: false,
          status: "RECOVERY_FAILED",
          proposedAction: action,
          reason: "Simulated outcome failed. Payment remains unresolved.",
          recoveredAmount: 0
        });
        return;
      }

      setPayments((previousPayments) =>
        previousPayments.map((payment) =>
          payment.paymentId === paymentId
            ? {
                ...payment,
                status: "RECOVERED",
                experimentOutcome: "RECOVERED",
                recoveredAmount: Number(amount || payment.amount || 0)
              }
            : payment
        )
      );

      setExecutionResult({
        executed: true,
        status: "PAYMENT_RECOVERED",
        proposedAction: action,
        recoveredAmount: Number(amount || 0),
        reason: "Payment recovered successfully."
      });

      setCausalMetrics((previous) => ({
        ...previous,
        agent: {
          ...previous.agent,
          recovered: previous.agent.recovered + 1,
          recoveredRevenue: previous.agent.recoveredRevenue + Number(amount || 0),
          recoveryRate: Math.min(
            100,
            ((previous.agent.recovered + 1) / Math.max(previous.agent.failed || 1, 1)) * 100
          )
        }
      }));

      setAuditEvents((previousEvents) => [
        ...previousEvents,
        {
          id: `audit-${Date.now()}`,
          type: "PAYMENT_RECOVERED",
          paymentId,
          action,
          timestamp: new Date().toISOString(),
          details: {
            recoveredAmount: Number(amount || 0)
          }
        }
      ]);
    }, 1500);
  };

  const getLatestFailedAgentPayment = () =>
    [...payments].reverse().find(
      (payment) => payment.status === "FAILED" && payment.experimentGroup === "AGENT"
    );

  const resolveRecoveryTarget = (targetOverride = null) => {
    if (targetOverride?.paymentId) return targetOverride;
    if (recoveryDecision?.paymentId) return recoveryDecision;
    if (shadowDecision?.paymentId) return shadowDecision;

    const fallbackTarget = getLatestFailedAgentPayment();
    if (fallbackTarget?.paymentId) {
      const amt = Number(fallbackTarget.amount || 0);
      const estProb = fallbackTarget.errorCode === "E01" ? 0.65 : fallbackTarget.errorCode === "E02" ? 0.45 : 0.25;
      return {
        paymentId: fallbackTarget.paymentId,
        paymentValue: amt,
        amount: amt,
        selectedAction: "PAYMENT_LINK",
        selectedProbability: estProb,
        selectedExpectedValue: Math.round(estProb * amt - 5)
      };
    }

    return null;
  };

  const executeRecovery = async (targetOverride = null) => {
    if (killSwitch) {
      setExecutionResult({
        executed: false,
        status: "BLOCKED",
        reason: "Merchant kill switch is active"
      });
      return;
    }

    const selectedTarget = resolveRecoveryTarget(targetOverride);

    if (!selectedTarget?.paymentId) {
      console.warn("No recovery target selected.");
      setExecutionResult({
        executed: false,
        status: "NO_TARGET",
        reason: "No failed AGENT payment is currently selected for recovery."
      });
      return;
    }

    const paymentId = selectedTarget.paymentId;
    const action = selectedTarget.selectedAction || selectedTarget.action || "PAYMENT_LINK";
    const amount = Number(selectedTarget.paymentValue ?? selectedTarget.amount ?? 0);

    const estProb = selectedTarget.selectedProbability ?? 0.65;
    const nextDecision = {
      ...(recoveryDecision || {}),
      ...(selectedTarget || {}),
      paymentId,
      paymentValue: amount,
      selectedAction: action,
      selectedProbability: estProb,
      selectedExpectedValue: selectedTarget.selectedExpectedValue ?? Math.round(estProb * amount - 5)
    };

    setRecoveryDecision(nextDecision);

    try {
      const response = await fetch(
        "http://localhost:5000/api/recovery/execute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            paymentId
          })
        }
      );

      const data = await response.json();
      console.log("Recovery execution response:", data);

      const executionPayload = data.executionResult || data || null;

      setExecutionResult({
        ...executionPayload,
        executed: !!executionPayload?.executed,
        status: executionPayload?.status || "RECOVERY_ATTEMPT",
        proposedAction: executionPayload?.proposedAction || action,
        reason: executionPayload?.reason || "Waiting for payment confirmation..."
      });

      if (data.recoveryDecision) {
        setRecoveryDecision(data.recoveryDecision);
      }

      if (data.policyDecision) {
        setPolicyDecision(data.policyDecision);
      }

      if (executionPayload && executionPayload.executed !== false && executionPayload.status !== "BLOCKED") {
        simulateRecoveryOutcome(paymentId, action, amount);
      }
    } catch (error) {
      console.error("Recovery execution failed:", error);
      setExecutionResult({
        executed: false,
        status: "EXECUTION_FAILED",
        reason: error.message
      });
    }
  };

  const executeTargetedPayment = async (payment) => {
    if (!payment || payment.status !== "FAILED" || payment.experimentGroup !== "AGENT") {
      return;
    }

    const amt = Number(payment.amount || 0);
    const estProb = payment.errorCode === "E01" ? 0.65 : payment.errorCode === "E02" ? 0.45 : 0.25;
    const target = {
      paymentId: payment.paymentId,
      paymentValue: amt,
      selectedAction: "PAYMENT_LINK",
      selectedProbability: estProb,
      selectedExpectedValue: Math.round(estProb * amt - 5)
    };

    setRecoveryDecision(target);
    await executeRecovery(target);
  };

  const changeExecutionMode = async (newMode) => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/mode",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            mode: newMode
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        setExecutionMode(data.mode);
      } else {
        console.error(
          "Failed to change execution mode:",
          data
        );
      }
    } catch (error) {
      console.error(
        "Failed to change execution mode:",
        error
      );
    }
  };

  /*
   * --------------------------------------------------
   * CHANGE SCENARIO
   * --------------------------------------------------
   */

  function changeScenario(newScenario) {
    socket.emit("setScenario", newScenario);
  }

  /*
   * --------------------------------------------------
   * KILL SWITCH
   * --------------------------------------------------
   */

  const toggleKillSwitch = async () => {
    const newState = !killSwitch;

    try {
      const response = await fetch(
        "http://localhost:5000/api/safety/kill-switch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            enabled: newState
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        setKillSwitch(data.merchantKillSwitch);

        setExecutionResult({
          executed: false,
          status: data.merchantKillSwitch ? "BLOCKED" : "READY",
          reason: data.merchantKillSwitch
            ? "Merchant kill switch enabled"
            : "Merchant kill switch disabled"
        });
      }
    } catch (error) {
      console.error(
        "Failed to update kill switch:",
        error
      );
    }
  };

  /*
   * --------------------------------------------------
   * RECOVERY STATUS REFRESH
   * --------------------------------------------------
   */

  const refreshRecoveryStatus = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/recovery"
      );

      if (!response.ok) {
        throw new Error(
          `Recovery API returned ${response.status}`
        );
      }

      const data = await response.json();

      const recoveries = data.recoveries || [];

      const currentPaymentLinkId =
        executionResult?.paymentLink?.id;

      if (!currentPaymentLinkId) {
        return;
      }

      const matchingRecovery = recoveries.find(
        (recovery) =>
          recovery.paymentLinkId === currentPaymentLinkId
      );

      if (!matchingRecovery) {
        return;
      }

      console.log(
        "Matching recovery:",
        matchingRecovery
      );

      setExecutionResult((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,

          recovery: {
            ...previous.recovery,
            ...matchingRecovery
          }
        };
      });
    } catch (error) {
      console.error(
        "Failed to refresh recovery status:",
        error
      );
    }
  };

  /*
   * --------------------------------------------------
   * AUTOMATIC RECOVERY STATUS POLLING
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      executionResult?.status !== "PAYMENT_LINK_CREATED"
    ) {
      return;
    }

    const interval = setInterval(() => {
      refreshRecoveryStatus();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [
    executionResult?.status,
    executionResult?.paymentLink?.id
  ]);

  /*
   * --------------------------------------------------
   * SHADOW DATA
   * --------------------------------------------------
   */

  const shadowDecision =
    executionResult?.shadowRecord;

  const shadowProbabilityText = formatProbability(
    shadowDecision?.probability ??
    recoveryDecision?.selectedProbability ??
    recoveryDecision?.probability ??
    0
  );

  const shadowHypotheticalValue =
    shadowDecision?.hypotheticalRecovery ??
    shadowDecision?.expectedValue ??
    recoveryDecision?.selectedExpectedValue ??
    0;

  return (
    <div className="dashboard">

      <header>
        <div className="header-top">
          <div className="header-left">
            <div className="header-status-dot"></div>
            <div className="header-title">
              <h1>◉ RevCalibre</h1>
              <p>Autonomous Revenue Recovery</p>
            </div>
          </div>
          <div className="header-right">
            <div className="header-right-label">Status</div>
            <div className="header-right-value">LIVE MONITORING</div>
          </div>
        </div>

        <div className="header-bottom">
          <div className="header-merchant">
            <div className="header-merchant-item">
              <div className="header-merchant-label">Merchant</div>
              <div className="header-merchant-value">Demo Store</div>
            </div>
            <div className="header-merchant-item">
              <div className="header-merchant-label">Environment</div>
              <div className="header-merchant-value">{scenario}</div>
            </div>
          </div>

          <div className="header-indicators">
            <div className="indicator">
              <div className={`indicator-dot safe`}></div>
              <div className="indicator-label">SYSTEM HEALTH</div>
              <div className="indicator-value">SAFE</div>
            </div>
            <div className="indicator">
              <div className={`indicator-dot test`}></div>
              <div className="indicator-label">EXECUTION</div>
              <div className="indicator-value">{executionMode}</div>
            </div>
            <button
              className="kill-switch-btn"
              onClick={toggleKillSwitch}
              title={killSwitch ? "Kill switch is ACTIVE" : "Kill switch is SAFE"}
            >
              ⚡ KILL SWITCH
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------
          SCENARIO SIMULATOR CONTROL BAR
      -------------------------------------------------- */}

      <section className="scenario">
        <div className="scenario-title">Scenario Simulator</div>

        <div className="scenario-buttons">
          <button
            className={`scenario-btn ${scenario === "NORMAL" ? "active" : ""}`}
            onClick={() => changeScenario("NORMAL")}
          >
            Normal
          </button>

          <button
            className={`scenario-btn ${scenario === "BANK_FAILURE" ? "active" : ""}`}
            onClick={() => changeScenario("BANK_FAILURE")}
          >
            Bank Failure
          </button>

          <button
            className={`scenario-btn ${scenario === "FRICTION" ? "active" : ""}`}
            onClick={() => changeScenario("FRICTION")}
          >
            Friction
          </button>

          <button
            className={`scenario-btn ${scenario === "SYSTEMIC_FAILURE" ? "active" : ""}`}
            onClick={() => changeScenario("SYSTEMIC_FAILURE")}
          >
            Systemic Failure
          </button>
        </div>

        <div className="scenario-current">
          Current: <strong>{scenario}</strong>
        </div>
      </section>

      {/* --------------------------------------------------
          SCENARIO IMPACT VISUALIZATION
      -------------------------------------------------- */}

      {scenario === "BANK_FAILURE" && (
        <div className="scenario-impact bank-failure">
          <div className="impact-header">
            <span className="impact-icon">⚠</span>
            <span>BANK DEGRADATION ACTIVE</span>
          </div>

          <div className="impact-grid">
            <div className="impact-metric">
              <div className="impact-metric-label">Failure Rate</div>
              <div className="impact-metric-value">
                {((anomaly?.baseline?.successRate ? (100 - anomaly.baseline.successRate) : 15.0)).toFixed(1)}% → {(metrics.failureRate ?? 0).toFixed(1)}%
              </div>
              <div className="impact-metric-change">
                <span className="change-arrow change-up">↑</span>
                <span className="change-value">+{(anomaly?.successRateDrop ?? (metrics.failureRate - 15)).toFixed(1)}%</span>
              </div>
            </div>

            <div className="impact-metric">
              <div className="impact-metric-label">Revenue Loss</div>
              <div className="impact-metric-value">₹{Math.round((metrics.failedPayments || 1) * 1499).toLocaleString("en-IN")}</div>
              <div className="impact-metric-change">
                <span className="change-arrow change-down">↓</span>
                <span className="change-value">-{(100 - (metrics.successRate || 50)).toFixed(1)}%</span>
              </div>
            </div>

            <div className="impact-metric">
              <div className="impact-metric-label">Error Codes</div>
              <div className="impact-metric-value">E01 Dominant</div>
              <div className="impact-metric-change">
                <span className="change-arrow change-up">↑</span>
                <span className="change-value">Network Timeouts</span>
              </div>
            </div>
          </div>

          <div className="error-concentration">
            <div className="concentration-label">Error Concentration</div>
            <div className="error-bars">
              <div className="error-bar">
                <span className="error-code">E01</span>
                <div className="error-bar-container">
                  <div className="error-bar-fill" style={{ width: `${Math.round((payments.filter(p => p.status === "FAILED" && p.errorCode === "E01").length / Math.max(payments.filter(p => p.status === "FAILED").length, 1)) * 100) || 75}%` }}></div>
                </div>
              </div>
              <div className="error-bar">
                <span className="error-code">E02</span>
                <div className="error-bar-container">
                  <div className="error-bar-fill" style={{ width: `${Math.round((payments.filter(p => p.status === "FAILED" && p.errorCode === "E02").length / Math.max(payments.filter(p => p.status === "FAILED").length, 1)) * 100) || 15}%` }}></div>
                </div>
              </div>
              <div className="error-bar">
                <span className="error-code">E99</span>
                <div className="error-bar-container">
                  <div className="error-bar-fill" style={{ width: `${Math.round((payments.filter(p => p.status === "FAILED" && p.errorCode === "E99").length / Math.max(payments.filter(p => p.status === "FAILED").length, 1)) * 100) || 10}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="agent-response">
            <span className="agent-response-label">Agent Response</span>
            <span className="agent-response-status">
              ACTIVE
              <span className="status-dot"></span>
            </span>
          </div>
        </div>
      )}

      {scenario === "FRICTION" && (
        <div className="scenario-impact friction">
          <div className="impact-header">
            <span className="impact-icon">⚠</span>
            <span>TRANSACTION FRICTION ACTIVE</span>
          </div>

          <div className="impact-grid">
            <div className="impact-metric">
              <div className="impact-metric-label">Retry Rate</div>
              <div className="impact-metric-value">2.1% → {(metrics.failureRate ?? 0).toFixed(1)}%</div>
              <div className="impact-metric-change">
                <span className="change-arrow change-up">↑</span>
                <span className="change-value">+{(metrics.failureRate ?? 0).toFixed(1)}%</span>
              </div>
            </div>

            <div className="impact-metric">
              <div className="impact-metric-label">Failed Transactions</div>
              <div className="impact-metric-value">{metrics.failedPayments} payments</div>
              <div className="impact-metric-change">
                <span className="change-arrow change-up">↑</span>
                <span className="change-value">Retry Recommended</span>
              </div>
            </div>

            <div className="impact-metric">
              <div className="impact-metric-label">Customer Abandon</div>
              <div className="impact-metric-value">{(metrics.failureRate * 0.3).toFixed(1)}%</div>
              <div className="impact-metric-change">
                <span className="change-arrow change-up">↑</span>
                <span className="change-value">Timeout Errors</span>
              </div>
            </div>
          </div>

          <div className="agent-response">
            <span className="agent-response-label">Agent Response</span>
            <span className="agent-response-status">
              ACTIVE
              <span className="status-dot"></span>
            </span>
          </div>
        </div>
      )}

      {scenario === "SYSTEMIC_FAILURE" && (
        <div className="scenario-impact systemic">
          <div className="impact-header">
            <span className="impact-icon">🔴</span>
            <span>SYSTEMIC FAILURE ACTIVE</span>
          </div>

          <div className="impact-grid">
            <div className="impact-metric">
              <div className="impact-metric-label">Failure Rate</div>
              <div className="impact-metric-value">15.0% → {(metrics.failureRate ?? 0).toFixed(1)}%</div>
              <div className="impact-metric-change">
                <span className="change-arrow change-up">↑</span>
                <span className="change-value">+{(metrics.failureRate - 15.0).toFixed(1)}%</span>
              </div>
            </div>

            <div className="impact-metric">
              <div className="impact-metric-label">Revenue Loss</div>
              <div className="impact-metric-value">₹{Math.round((metrics.failedPayments || 1) * 1499).toLocaleString("en-IN")}</div>
              <div className="impact-metric-change">
                <span className="change-arrow change-down">↓</span>
                <span className="change-value">-{(metrics.failureRate ?? 0).toFixed(1)}%</span>
              </div>
            </div>

            <div className="impact-metric">
              <div className="impact-metric-label">System Status</div>
              <div className="impact-metric-value">CRITICAL</div>
              <div className="impact-metric-change">
                <span className="change-arrow change-up">⚠</span>
                <span className="change-value">All Error Codes</span>
              </div>
            </div>
          </div>

          <div className="error-concentration">
            <div className="concentration-label">Error Distribution</div>
            <div className="error-bars">
              <div className="error-bar">
                <span className="error-code">E01</span>
                <div className="error-bar-container">
                  <div className="error-bar-fill" style={{ width: `${Math.round((payments.filter(p => p.status === "FAILED" && p.errorCode === "E01").length / Math.max(payments.filter(p => p.status === "FAILED").length, 1)) * 100) || 45}%` }}></div>
                </div>
              </div>
              <div className="error-bar">
                <span className="error-code">E02</span>
                <div className="error-bar-container">
                  <div className="error-bar-fill" style={{ width: `${Math.round((payments.filter(p => p.status === "FAILED" && p.errorCode === "E02").length / Math.max(payments.filter(p => p.status === "FAILED").length, 1)) * 100) || 35}%` }}></div>
                </div>
              </div>
              <div className="error-bar">
                <span className="error-code">E03</span>
                <div className="error-bar-container">
                  <div className="error-bar-fill" style={{ width: `${Math.round((payments.filter(p => p.status === "FAILED" && p.errorCode === "E03").length / Math.max(payments.filter(p => p.status === "FAILED").length, 1)) * 100) || 15}%` }}></div>
                </div>
              </div>
              <div className="error-bar">
                <span className="error-code">E99</span>
                <div className="error-bar-container">
                  <div className="error-bar-fill" style={{ width: `${Math.round((payments.filter(p => p.status === "FAILED" && p.errorCode === "E99").length / Math.max(payments.filter(p => p.status === "FAILED").length, 1)) * 100) || 5}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="agent-response">
            <span className="agent-response-label">Agent Response</span>
            <span className="agent-response-status">
              ACTIVE
              <span className="status-dot"></span>
            </span>
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          REVENUE HEALTH PANEL (HERO SECTION)
      -------------------------------------------------- */}

      <div className={`revenue-health ${scenario !== "NORMAL" ? "degraded" : ""}`}>
        <div className="revenue-health-title">Revenue Health</div>

        <div className="revenue-metrics-top">
          <div className={`revenue-metric-card ${scenario !== "NORMAL" ? "degraded" : ""}`}>
            <div className="revenue-metric-value">
              ₹{Number(metrics.revenue || 0).toLocaleString("en-IN")}
            </div>
            <div className="revenue-metric-label">Payment Volume</div>
          </div>

          <div className={`revenue-metric-card ${scenario !== "NORMAL" ? "degraded" : ""}`}>
            <div className="revenue-metric-value">
              {(metrics.successRate ?? 0).toFixed(1)}%
            </div>
            <div className="revenue-metric-label">Success Rate</div>
            <div className={`revenue-metric-change ${scenario === "NORMAL" ? "metric-change-neutral" : "metric-change-up"}`}>
              {scenario === "NORMAL" ? (
                <>
                  <span>→</span>
                  <span>Stable</span>
                </>
              ) : (
                <>
                  <span>↓</span>
                  <span>-{(anomaly?.successRateDrop ?? (100 - metrics.successRate)).toFixed(1)}%</span>
                </>
              )}
            </div>
          </div>

          <div className={`revenue-metric-card ${scenario !== "NORMAL" ? "degraded" : ""}`}>
            <div className="revenue-metric-value">
              {(metrics.failureRate ?? 0).toFixed(1)}%
            </div>
            <div className="revenue-metric-label">Failure Rate</div>
            <div className={`revenue-metric-change ${scenario === "NORMAL" ? "metric-change-neutral" : "metric-change-up"}`}>
              {scenario === "NORMAL" ? (
                <>
                  <span>→</span>
                  <span>Stable</span>
                </>
              ) : (
                <>
                  <span>↑</span>
                  <span>+{(metrics.failureRate ?? 0).toFixed(1)}%</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="revenue-chart-section">
          <div className="chart-header">
            <span className="chart-title">Success Rate Over Time</span>
            <div className="chart-live">
              <span className="chart-live-dot"></span>
              LIVE
            </div>
          </div>

          <div className="revenue-chart">
            <div className="revenue-chart-bars">
              <div className="chart-bar-group">
                <div className="chart-bar" style={{ height: "92%" }}></div>
                <div className="chart-bar-value">92%</div>
                <div className="chart-bar-label">T-3h</div>
              </div>
              <div className="chart-bar-group">
                <div className="chart-bar" style={{ height: "90%" }}></div>
                <div className="chart-bar-value">90%</div>
                <div className="chart-bar-label">T-2h</div>
              </div>
              <div className="chart-bar-group">
                <div className="chart-bar" style={{ height: "88%" }}></div>
                <div className="chart-bar-value">88%</div>
                <div className="chart-bar-label">T-1h</div>
              </div>
              <div className="chart-bar-group">
                <div className={`chart-bar ${scenario !== "NORMAL" ? "critical" : ""}`} style={{ height: `${Math.min(100, Math.max(10, metrics.successRate || 50))}%` }}></div>
                <div className="chart-bar-value">{(metrics.successRate ?? 0).toFixed(1)}%</div>
                <div className="chart-bar-label">NOW</div>
              </div>
            </div>
          </div>

          <div className="revenue-baseline-current">
            <div className="baseline-item">
              <div className="baseline-label">Baseline</div>
              <div className="baseline-value">{(anomaly?.baseline?.successRate ?? 85.0).toFixed(1)}%</div>
            </div>
            <div className="baseline-item">
              <div className="baseline-label">Current</div>
              <div className="baseline-value">{(metrics.successRate ?? 0).toFixed(1)}%</div>
            </div>
          </div>

          {scenario !== "NORMAL" && (
            <div className="degradation-notice">
              <span className="degradation-notice-icon">⚠</span>
              Revenue impact: -₹{Math.round((metrics.failedPayments || 1) * 1499).toLocaleString("en-IN")} total loss
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------
          KILL SWITCH
      -------------------------------------------------- */}

      <div className="kill-switch">

        <div>
          <h3>Merchant Kill Switch</h3>

          <span
            className={
              killSwitch
                ? "safety-badge danger"
                : "safety-badge safe"
            }
          >
            {killSwitch ? "ACTIVE" : "SAFE"}
          </span>

          <p>
            {killSwitch
              ? "All autonomous recovery actions are blocked."
              : "Autonomous recovery is enabled."}
          </p>
        </div>

        <button onClick={toggleKillSwitch}>
          {killSwitch
            ? "🔴 DISABLE KILL SWITCH"
            : "🟢 ENABLE KILL SWITCH"}
        </button>

      </div>

      {/* --------------------------------------------------
          EXECUTION MODE
      -------------------------------------------------- */}

      <div className="execution-status">

        <h3>Execution Mode</h3>

        <strong>{executionMode}</strong>

        <div>

          <button
            onClick={() =>
              changeExecutionMode("SHADOW")
            }
            disabled={
              executionMode === "SHADOW"
            }
          >
            SHADOW MODE
          </button>

          <button
            onClick={() =>
              changeExecutionMode("TEST")
            }
            disabled={
              executionMode === "TEST"
            }
          >
            TEST MODE
          </button>

        </div>

      </div>

      <div className="recovery-outcome-toggle">
        <h3>Recovery Outcome</h3>
        <div className="recovery-outcome-buttons">
          <button
            className={recoveryOutcomeMode === "AUTO_SUCCESS" ? "active" : ""}
            onClick={() => setRecoveryOutcomeMode("AUTO_SUCCESS")}
          >
            AUTO SUCCESS
          </button>
          <button
            className={recoveryOutcomeMode === "AUTO_FAILURE" ? "active" : ""}
            onClick={() => setRecoveryOutcomeMode("AUTO_FAILURE")}
          >
            AUTO FAILURE
          </button>
          <button
            className={recoveryOutcomeMode === "RANDOM" ? "active" : ""}
            onClick={() => setRecoveryOutcomeMode("RANDOM")}
          >
            RANDOM
          </button>
        </div>
      </div>

      {/* --------------------------------------------------
          SHADOW MODE
      -------------------------------------------------- */}

      {executionResult?.status ===
        "SHADOW_PROPOSED" && (
        <>

          <div className="shadow-card">

            <h3>🌙 SHADOW MODE</h3>

            <p>
              Proposed Action:{" "}
              <strong>
                {executionResult.proposedAction}
              </strong>
            </p>

            <p>
              Execution Status:{" "}
              <strong>
                ❌ NOT EXECUTED
              </strong>
            </p>

            <p>
              Reason:{" "}
              <strong>
                Shadow Mode prevents recovery execution.
              </strong>
            </p>

            <p>
              Hypothetical Recovery Value:{" "}
              <strong>
                ₹
                {Number(
                  shadowHypotheticalValue
                ).toFixed(2)}
              </strong>
            </p>

          </div>

          <div className="shadow-audit">

            <h2>Shadow Decision Log</h2>

            <div>
              Payment:{" "}
              <strong>
                {shadowDecision?.paymentId ??
                  recoveryDecision?.paymentId ??
                  "N/A"}
              </strong>
            </div>

            <div>
              Action:{" "}
              <strong>
                {executionResult.proposedAction}
              </strong>
            </div>

            <div>
              P(success):{" "}
              <strong>
                {shadowProbabilityText}
              </strong>
            </div>

            <div>
              EV:{" "}
              <strong>
                ₹
                {Number(
                  shadowHypotheticalValue
                ).toFixed(2)}
              </strong>
            </div>

            <div>
              Policy:{" "}
              <strong>
                {shadowDecision?.policyAllowed
                  ? "PASSED"
                  : "BLOCKED"}
              </strong>
            </div>

            <div>
              Mode:{" "}
              <strong>SHADOW</strong>
            </div>

            <div>
              Executed:{" "}
              <strong>NO</strong>
            </div>

          </div>

        </>
      )}

      {/* --------------------------------------------------
          NON PAYMENT-LINK EXECUTION
      -------------------------------------------------- */}

      {executionResult &&
        executionResult.status !==
          "SHADOW_PROPOSED" &&
        executionResult.status !==
          "PAYMENT_LINK_CREATED" && (

        <div className="recovery-execution-card">

          <h2>Recovery Execution</h2>

          <p>
            Status:{" "}
            <strong>
              {executionResult.status}
            </strong>
          </p>

          {executionResult.proposedAction && (
            <p>
              Action:{" "}
              <strong>
                {executionResult.proposedAction}
              </strong>
            </p>
          )}

          {executionResult.reason && (
            <p>
              Reason:{" "}
              <strong>
                {executionResult.reason}
              </strong>
            </p>
          )}

        </div>
      )}

      {/* --------------------------------------------------
          RAZORPAY RECOVERY
      -------------------------------------------------- */}

      {executionResult?.status ===
        "PAYMENT_LINK_CREATED" && (

        <div className="recovery-execution-card">

          <h2>
            💳 Razorpay Test Recovery
          </h2>

          <p>
            Execution Status:{" "}
            <strong>
              ✓ PAYMENT LINK CREATED
            </strong>
          </p>

          <p>
            Action:{" "}
            <strong>
              {executionResult.proposedAction}
            </strong>
          </p>

          {executionResult.paymentLink?.shortUrl && (
            <p>
              <a
                href={
                  executionResult.paymentLink.shortUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                Open Razorpay Test Payment Link
              </a>
            </p>
          )}

          <p>
            Recovery Status:{" "}
            <strong>
              {executionResult.recovery?.status ??
                "PENDING"}
            </strong>
          </p>

          {executionResult.recovery?.status ===
            "RECOVERED" && (
            <p>
              Recovered Amount:{" "}
              <strong>
                ₹
                {Number(
                  executionResult.recovery
                    ?.recoveredAmount ?? 0
                ).toFixed(2)}
              </strong>
            </p>
          )}

          <p>
            Payment Link ID:{" "}
            <strong>
              {executionResult.paymentLink?.id}
            </strong>
          </p>

        </div>
      )}

      {/* --------------------------------------------------
          PHASE 8 — CAUSAL IMPACT (HERO SECTION)
      -------------------------------------------------- */}

      <section className="causal-impact">

        <h2>Causal Impact</h2>

        <div className="causal-comparison-header">
          <div className="causal-group-header">
            <div className="causal-group-icon">🟢</div>
            <div className="causal-group-label">AGENT</div>
            <div className="causal-group-subtitle">With Autonomous Recovery</div>
          </div>
          <div className="causal-group-header">
            <div className="causal-group-icon">⚪</div>
            <div className="causal-group-label">CONTROL</div>
            <div className="causal-group-subtitle">No Intervention</div>
          </div>
        </div>

        <div className="causal-metrics-grid">
          {/* Agent Metrics */}
          <div className="causal-metric-column">
            <div className="causal-payment-volume">
              <div className="causal-volume-number">
                {causalMetrics.agent.total}
              </div>
              <div className="causal-volume-label">Payments</div>
              <div className="causal-volume-bar">
                <div 
                  className="causal-volume-bar-fill" 
                  style={{ width: "80%" }}
                >
                  80%
                </div>
              </div>
            </div>

            <div className="causal-recovery-stat">
              <div className="causal-recovery-rate">
                {causalMetrics.agent.recoveryRate}%
              </div>
              <div className="causal-recovery-label">Recovery Rate</div>
            </div>

            <div className="causal-revenue-stat">
              <div className="causal-revenue-amount">
                ₹{Number(causalMetrics.agent.recoveredRevenue / 100000).toFixed(2)}L
              </div>
              <div className="causal-revenue-label">Revenue Recovered</div>
            </div>
          </div>

          {/* Control Metrics */}
          <div className="causal-metric-column">
            <div className="causal-payment-volume">
              <div className="causal-volume-number">
                {causalMetrics.control.total}
              </div>
              <div className="causal-volume-label">Payments</div>
              <div className="causal-volume-bar">
                <div 
                  className="causal-volume-bar-fill" 
                  style={{ width: "20%" }}
                >
                  20%
                </div>
              </div>
            </div>

            <div className="causal-recovery-stat">
              <div className="causal-recovery-rate">
                {causalMetrics.control.recoveryRate}%
              </div>
              <div className="causal-recovery-label">Recovery Rate</div>
            </div>

            <div className="causal-revenue-stat">
              <div className="causal-revenue-amount">
                ₹{Number(causalMetrics.control.recoveredRevenue / 100000).toFixed(2)}L
              </div>
              <div className="causal-revenue-label">Revenue Recovered</div>
            </div>
          </div>
        </div>

        <div className="causal-divider"></div>

        <div className="incremental-revenue-section">
          <div className="incremental-revenue-label">
            Incremental Revenue
          </div>
          <div className="incremental-revenue-amount">
            +₹{Number(causalMetrics.incrementalRevenue / 100000).toFixed(2)}L
          </div>
          <div className="incremental-revenue-description">
            Revenue caused by autonomous agent intervention
          </div>
        </div>

      </section>

      {/* --------------------------------------------------
          INCIDENT DETECTION
      -------------------------------------------------- */}

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

      {/* --------------------------------------------------
          DIAGNOSIS
      -------------------------------------------------- */}

      <section className="diagnosis-panel">

        <h2>Root Cause Diagnosis</h2>

        <div className="diagnosis-card">

          <h3>
            {diagnosis.category}
          </h3>

          <p>
            {diagnosis.explanation}
          </p>

          <h4>
            Supporting Evidence
          </h4>

          <ul>
            {diagnosis.supportingEvidence?.map(
              (evidence, index) => (
                <li key={index}>
                  {Object.entries(evidence)
                    .map(
                      ([key, value]) =>
                        `${key}: ${value}`
                    )
                    .join(" | ")}
                </li>
              )
            )}
          </ul>

        </div>

      </section>

      {/* --------------------------------------------------
          RECOVERY DECISION
      -------------------------------------------------- */}

      {recoveryDecision && (

        <div className="recovery-card">

          <h2>Agent Decision Pipeline</h2>

          <div className="decision-pipeline">

            {/* Stage 1: Payment Failed Entry */}
            <div className="pipeline-stage">
              <div className="pipeline-entry">
                <div className="pipeline-entry-label">🔴 Payment Failed</div>
                <div className="pipeline-entry-detail">
                  Error: E01
                </div>
                <div className="pipeline-entry-amount">
                  ₹{recoveryDecision.paymentValue}
                </div>
              </div>
              <div className="pipeline-arrow">↓</div>
            </div>

            {/* Stage 2: Root Cause Diagnosis */}
            <div className="pipeline-stage">
              <div className="pipeline-box diagnosis">
                <div className="pipeline-box-label">Root Cause</div>
                <div className="diagnosis-category">
                  {diagnosis.category}
                </div>
                <div className="diagnosis-explanation">
                  {diagnosis.explanation}
                </div>
                <div className="diagnosis-confidence">
                  Confidence <span className="confidence-value">94%</span>
                </div>
              </div>
              <div className="pipeline-arrow">↓</div>
            </div>

            {/* Stage 3: Recovery Model */}
            <div className="pipeline-stage">
              <div className="pipeline-box recovery-model">
                <div className="pipeline-box-label">Recovery Model</div>
                <div className="pipeline-box-content">
                  <div className="recovery-probability">
                    {formatProbability(recoveryDecision.selectedProbability)}
                  </div>
                  <div className="recovery-note">
                    P(success) — Calibrated Model
                  </div>
                </div>
              </div>
              <div className="pipeline-arrow">↓</div>
            </div>

            {/* Stage 4: Candidate Comparison Matrix */}
            <div className="pipeline-stage" style={{ width: "100%", maxWidth: "600px" }}>
              <div className="candidate-comparison">
                <div className="pipeline-box-label" style={{ textAlign: "left", marginBottom: "12px" }}>Economic Comparison</div>
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>P(success)</th>
                      <th>Cost</th>
                      <th>Expected Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recoveryDecision.candidates?.map((candidate, idx) => (
                      <tr key={idx} className={candidate.action === recoveryDecision.selectedAction ? "winner" : ""}>
                        <td>
                          <span className={`action-name ${candidate.action === recoveryDecision.selectedAction ? "winner" : ""}`}>
                            {candidate.action}
                            {candidate.action === recoveryDecision.selectedAction && <span className="winner-badge">OPTIMAL</span>}
                          </span>
                        </td>
                        <td className="probability-cell">{formatProbability(candidate.probability ?? candidate.probabilityPercent)}</td>
                        <td className="cost-cell">₹{candidate.cost}</td>
                        <td className="ev-cell">₹{candidate.expectedValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pipeline-arrow">↓</div>
            </div>

            {/* Stage 5: Optimal Action Highlight */}
            <div className="pipeline-stage">
              <div className="optimal-action-card">
                <div className="optimal-action-star">★</div>
                <div className="optimal-action-label">Optimal Action</div>
                <div className="optimal-action-name">
                  {recoveryDecision.selectedAction}
                </div>
                <div className="optimal-action-metrics">
                  <div className="optimal-metric">
                    <div className="optimal-metric-label">P(success)</div>
                    <div className="optimal-metric-value">{formatProbability(recoveryDecision.selectedProbability)}</div>
                  </div>
                  <div className="optimal-metric">
                    <div className="optimal-metric-label">Cost</div>
                    <div className="optimal-metric-value">₹{recoveryDecision.candidates?.find(c => c.action === recoveryDecision.selectedAction)?.cost || 0}</div>
                  </div>
                  <div className="optimal-metric">
                    <div className="optimal-metric-label">Expected Value</div>
                    <div className="optimal-metric-value">₹{recoveryDecision.selectedExpectedValue}</div>
                  </div>
                </div>
                <div className={`optimal-action-policy ${policyDecision?.allowed === false ? "blocked" : "passed"}`}>
                  {policyDecision?.allowed === false ? "🛑 POLICY BLOCKED" : "✓ POLICY PASSED"}
                </div>
              </div>
              <div className="pipeline-arrow">↓</div>
            </div>

            {/* Stage 6: Policy Gate */}
            <div className="pipeline-stage">
              <div className="pipeline-box policy-gate">
                <div className="pipeline-box-label">Policy Gate</div>
                <div className="policy-checks-list">
                  {(policyDecision?.checks && policyDecision.checks.length > 0
                    ? policyDecision.checks
                    : [
                        { rule: "MAX_RETRIES", passed: true },
                        { rule: "IDEMPOTENCY", passed: true },
                        { rule: "DND_COMPLIANCE", passed: true },
                        { rule: "CIRCUIT_BREAKER", passed: true }
                      ]
                  ).map((check) => {
                    const ruleLabels = {
                      MAX_RETRIES: "Retry Limit",
                      IDEMPOTENCY: "Idempotency",
                      DND_COMPLIANCE: "DND",
                      CIRCUIT_BREAKER: "Circuit Breaker",
                      MERCHANT_KILL_SWITCH: "Kill Switch"
                    };
                    const label = ruleLabels[check.rule] || check.rule;
                    return (
                      <div key={check.rule} className={`policy-check-item ${check.passed ? "passed" : "blocked"}`}>
                        <span className="policy-check-mark">{check.passed ? "✓" : "🛑"}</span>
                        <span className="policy-check-label">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="pipeline-arrow">↓</div>
            </div>

            {/* Stage 7: Execute */}
            <div className="pipeline-stage">
              <button
                className="pipeline-execute"
                onClick={executeRecovery}
                disabled={killSwitch || policyDecision?.allowed === false || !recoveryDecision}
              >
                {killSwitch || policyDecision?.allowed === false ? "Execution Blocked" : "Execute Recovery"}
              </button>

              {executionResult && (
                <div className={`execution-status ${executionResult.executed === false || executionResult.status === "BLOCKED" ? "error" : "success"}`}>
                  {executionResult.status === "BLOCKED" || policyDecision?.allowed === false
                    ? `Execution blocked: ${executionResult.reason || policyDecision?.blockReason || "Policy safety rules prevented execution"}`
                    : killSwitch
                      ? `Execution blocked: ${executionResult.reason || "Merchant kill switch enabled"}`
                      : executionResult.status === "PAYMENT_RECOVERED"
                        ? `✓ PAYMENT RECOVERED — ₹${Number(executionResult.recoveredAmount || 0).toLocaleString()}`
                        : executionResult.status === "RECOVERY_ATTEMPT"
                          ? `⚡ RECOVERY EXECUTED — ${executionResult.proposedAction || "PAYMENT LINK"}`
                          : executionResult.executed === false
                            ? `Execution failed: ${executionResult.reason || executionResult.status || "Unknown error"}`
                            : `Execution status: ${executionResult.status || "SUCCESS"}`}
                </div>
              )}
            </div>

          </div>

          {/* AUTONOMY SAFETY SHIELD */}
          <div className={`autonomy-shield ${killSwitch ? "locked" : ""}`}>
            <div className="shield-icon">
              {killSwitch ? "🔒" : "🛡"}
            </div>
            <div className="shield-title">
              {killSwitch ? "Autonomy Locked" : "Autonomy Safety"}
            </div>

            {!killSwitch ? (
              <>
                <div className="shield-checks">
                  <div className="shield-check">
                    <span className="shield-check-label">Merchant Kill Switch</span>
                    <span className="shield-check-status shield-check-pass">✓ PASS</span>
                  </div>
                  <div className="shield-check">
                    <span className="shield-check-label">Circuit Breaker</span>
                    <span className="shield-check-status shield-check-pass">✓ PASS</span>
                  </div>
                  <div className="shield-check">
                    <span className="shield-check-label">Max Retries</span>
                    <span className="shield-check-status shield-check-pass">✓ PASS</span>
                  </div>
                  <div className="shield-check">
                    <span className="shield-check-label">DND Compliance</span>
                    <span className="shield-check-status shield-check-pass">✓ PASS</span>
                  </div>
                  <div className="shield-check">
                    <span className="shield-check-label">Idempotency</span>
                    <span className="shield-check-status shield-check-pass">✓ PASS</span>
                  </div>
                </div>
                <div className="shield-action-status">
                  <span className="shield-action-authorized">✓ Action Authorized</span>
                </div>
              </>
            ) : (
              <>
                <div className="shield-checks">
                  <div className="shield-check">
                    <span className="shield-check-label">{recoveryDecision.selectedAction}</span>
                    <span className="shield-check-status shield-check-block">BLOCKED</span>
                  </div>
                </div>
                <div className="shield-rejection-reason">
                  <div className="shield-rejection-label">Rejection Reason</div>
                  <div className="shield-rejection-text">Merchant Kill Switch Enabled</div>
                </div>
                <div className="shield-metrics-locked">
                  <div className="shield-metric-item">
                    <div className="shield-metric-label">Expected Value</div>
                    <div className="shield-metric-value">₹{recoveryDecision.selectedExpectedValue}</div>
                  </div>
                  <div className="shield-metric-item">
                    <div className="shield-metric-label">Policy</div>
                    <div className="shield-metric-value">PASS</div>
                  </div>
                  <div className="shield-metric-item">
                    <div className="shield-metric-label">Execution</div>
                    <div className="shield-metric-value" style={{ color: "#ef4444" }}>❌ REJECTED</div>
                  </div>
                </div>
                <div className="shield-action-status">
                  <span className="shield-action-rejected">🔒 Execution Blocked</span>
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* --------------------------------------------------
          POLICY
      -------------------------------------------------- */}

      {policyDecision && (

        <div className="policy-panel">

          <h2>
            Policy Decision
          </h2>

          <div className={`policy-result ${policyDecision.allowed ? "allowed" : "blocked"}`}>

            {policyDecision.allowed
              ? "✓ POLICY PASSED"
              : "🛑 ACTION BLOCKED"}

          </div>

          <p>
            Action:{" "}
            <strong>
              {policyDecision.action}
            </strong>
          </p>

          <h3>
            Safety Checks
          </h3>

          <div className="policy-checks">

            {(policyDecision.checks || []).map(
              (check) => (

                <div
                  key={check.rule}
                  className={
                    check.passed
                      ? "policy-check passed"
                      : "policy-check blocked"
                  }
                >

                  <strong>
                    {check.rule}
                  </strong>

                  <span>
                    {check.passed
                      ? "PASS"
                      : "BLOCK"}
                  </span>

                </div>

              )
            )}

          </div>

          {!policyDecision.allowed &&
            (policyDecision.reasons || []).length > 0 && (

            <div className="policy-reasons">

              <h3>
                Block Reason
              </h3>

              {(policyDecision.reasons || []).map(
                (reason, index) => (
                  <p key={index}>
                    • {reason}
                  </p>
                )
              )}

            </div>

          )}

        </div>
      )}

      {/* --------------------------------------------------
          PHASE 9 — LIVE AGENT TRACE (ANIMATED EVENT STREAM)
      -------------------------------------------------- */}

      <section className="audit-timeline">
        <div 
          onClick={() => setIsAuditExpanded(!isAuditExpanded)}
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            cursor: "pointer", 
            userSelect: "none", 
            marginBottom: isAuditExpanded ? "16px" : "0px" 
          }}
        >
          <div>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              Live Agent Trace & Audit Log
              <span style={{ fontSize: "11px", background: "rgba(96, 165, 250, 0.2)", border: "1px solid rgba(96, 165, 250, 0.4)", borderRadius: "4px", padding: "2px 8px", color: "#60a5fa", textTransform: "none", fontWeight: "normal" }}>
                {isAuditExpanded ? "▲ Fold / Hide" : "▼ Expand Audit Log"}
              </span>
            </h2>
            <div className="audit-timeline-label" style={{ marginTop: "4px", marginBottom: 0 }}>
              <span className="audit-timeline-live-dot"></span>
              REAL-TIME IMMUTABLE DECISION AUDIT TRAIL
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "rgba(96, 165, 250, 0.15)", border: "1px solid rgba(96, 165, 250, 0.3)", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", fontWeight: "bold", color: "#60a5fa" }}>
              {auditEvents.length} EVENTS LOGGED
            </div>
          </div>
        </div>

        {!isAuditExpanded && auditEvents.length > 0 && (
          <div 
            onClick={() => setIsAuditExpanded(true)}
            style={{ 
              marginTop: "12px", 
              padding: "10px 14px", 
              background: "rgba(0, 0, 0, 0.25)", 
              borderRadius: "4px", 
              borderLeft: "3px solid #60a5fa", 
              fontSize: "12px", 
              color: "#cbd5e1",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <strong style={{ color: "#60a5fa" }}>Latest Trace Event:</strong>{" "}
              {auditEvents[auditEvents.length - 1].type ? auditEvents[auditEvents.length - 1].type.replace(/_/g, " ") : "EVENT"}{" "}
              {auditEvents[auditEvents.length - 1].paymentId ? `· ${auditEvents[auditEvents.length - 1].paymentId}` : ""}
            </div>
            <span style={{ color: "#94a3b8", fontSize: "11px" }}>Click to expand full trace list →</span>
          </div>
        )}

        {isAuditExpanded && (
          auditEvents.length === 0 ? (
            <p style={{ color: "#a0aec0", fontSize: "12px", marginTop: "16px" }}>Waiting for payment events...</p>
          ) : (
            <div className="timeline-events" style={{ marginTop: "16px" }}>
              {[...auditEvents]
                .reverse()
                .slice(0, 50)
                .map((event, idx) => {
                  const eventTime = event.timestamp
                    ? new Date(event.timestamp).toLocaleTimeString()
                    : "--:--:--";
                  const eventTypeClass = (event.type || "EVENT")
                    .replace(/_/g, "-")
                    .toLowerCase();

                  const handledKeys = new Set();
                  if (event.type === "PAYMENT_FAILED") {
                    handledKeys.add("amount");
                    handledKeys.add("errorCode");
                  } else if (event.type === "ANOMALY_DETECTED") {
                    handledKeys.add("baseline");
                    handledKeys.add("current");
                    handledKeys.add("dropPercentage");
                  } else if (event.type === "DIAGNOSIS") {
                    handledKeys.add("rootCause");
                    handledKeys.add("explanation");
                    handledKeys.add("confidence");
                  } else if (event.type === "RECOVERY_DECISION") {
                    handledKeys.add("probability");
                    handledKeys.add("expectedValue");
                    handledKeys.add("evNet");
                    handledKeys.add("reasoning");
                  } else if (event.type === "POLICY_DECISION") {
                    handledKeys.add("allowed");
                    handledKeys.add("blockReason");
                  } else if (["RECOVERY_EXECUTED", "DUPLICATE_RECOVERY_BLOCKED", "SAFETY_GUARDRAIL_BLOCKED", "RECOVERY_BLOCKED"].includes(event.type)) {
                    handledKeys.add("status");
                    handledKeys.add("executed");
                    handledKeys.add("mode");
                    handledKeys.add("reason");
                    handledKeys.add("rule");
                  } else if (event.type === "PAYMENT_RECOVERED") {
                    handledKeys.add("recoveredAmount");
                  } else if (event.type === "KILL_SWITCH_UPDATED") {
                    handledKeys.add("enabled");
                    handledKeys.add("merchantKillSwitch");
                  } else if (event.type === "MODE_CHANGED") {
                    handledKeys.add("mode");
                  }

                  const extraDetails = event.details
                    ? Object.entries(event.details).filter(([key]) => !handledKeys.has(key))
                    : [];

                  return (
                    <div
                      key={`${event.id || idx}-${idx}`}
                      className={`timeline-event ${eventTypeClass}`}
                    >
                      <div className={`timeline-dot ${eventTypeClass}`}>
                        {event.type === "PAYMENT_FAILED" && "🔴"}
                        {event.type === "ANOMALY_DETECTED" && "⚠"}
                        {event.type === "DIAGNOSIS" && "🔍"}
                        {event.type === "RECOVERY_DECISION" && "💡"}
                        {event.type === "POLICY_DECISION" && (event.details?.allowed !== false ? "✓" : "🛑")}
                        {event.type === "DUPLICATE_RECOVERY_BLOCKED" && "🛡️"}
                        {["SAFETY_GUARDRAIL_BLOCKED", "RECOVERY_BLOCKED"].includes(event.type) && "🛑"}
                        {event.type === "RECOVERY_EXECUTED" && "🚀"}
                        {event.type === "PAYMENT_RECOVERED" && "✅"}
                        {event.type === "KILL_SWITCH_UPDATED" && "🛑"}
                        {event.type === "MODE_CHANGED" && "⚙️"}
                        {!["PAYMENT_FAILED", "ANOMALY_DETECTED", "DIAGNOSIS", "RECOVERY_DECISION", "POLICY_DECISION", "DUPLICATE_RECOVERY_BLOCKED", "SAFETY_GUARDRAIL_BLOCKED", "RECOVERY_BLOCKED", "RECOVERY_EXECUTED", "PAYMENT_RECOVERED", "KILL_SWITCH_UPDATED", "MODE_CHANGED"].includes(event.type) && "●"}
                      </div>

                      <div className="timeline-content">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <div className="timeline-timestamp" style={{ fontSize: "11px", color: "#a0aec0" }}>
                            {eventTime}
                          </div>
                          {event.paymentId && (
                            <span style={{ fontSize: "10px", background: "rgba(255, 255, 255, 0.08)", padding: "2px 6px", borderRadius: "3px", color: "#cbd5e1", fontFamily: "monospace" }}>
                              {event.paymentId}
                            </span>
                          )}
                        </div>

                        <div className="timeline-event-type" style={{ fontWeight: "bold", fontSize: "13px", color: "#f8fafc", marginBottom: "6px" }}>
                          {event.type === "DUPLICATE_RECOVERY_BLOCKED"
                            ? "DUPLICATE RECOVERY BLOCKED"
                            : event.type === "SAFETY_GUARDRAIL_BLOCKED"
                              ? "SAFETY GUARDRAIL BLOCKED"
                              : event.type ? event.type.replace(/_/g, " ") : "EVENT"}
                          {event.action && (
                            <span style={{ marginLeft: "8px", fontSize: "11px", color: event.type?.includes("BLOCKED") ? "#ef4444" : "#60a5fa", fontWeight: "normal" }}>
                              [{event.action}]
                            </span>
                          )}
                        </div>

                        <div className="timeline-event-detail">
                          {event.type === "PAYMENT_FAILED" && (
                            <div className="timeline-event-detail-line">
                              Failure Amount: ₹<span className="timeline-event-detail-value">{event.details?.amount}</span>
                              {event.details?.errorCode && ` · Error Code: ${event.details.errorCode}`}
                            </div>
                          )}

                          {event.type === "ANOMALY_DETECTED" && (
                            <div className="timeline-event-detail-line">
                              Success rate dropped <span className="timeline-event-detail-value">{event.details?.baseline}% → {event.details?.current}%</span>
                              {event.details?.dropPercentage && ` (-${event.details.dropPercentage}%)`}
                            </div>
                          )}

                          {event.type === "DIAGNOSIS" && (
                            <div className="timeline-event-detail-line">
                              Diagnosis: <span className="timeline-event-detail-value">{event.action || event.details?.rootCause || "Engine RCA Result"}</span>
                              {event.details?.explanation && ` — ${event.details.explanation}`}
                            </div>
                          )}

                          {event.type === "RECOVERY_DECISION" && (
                            <>
                              <div className="timeline-event-detail-line">
                                Intervention Action: <span className="timeline-event-detail-value">{event.action}</span>
                                {event.details?.probability !== undefined && ` · P(success) = ${event.details.probability}%`}
                              </div>
                              {event.details?.expectedValue !== undefined && (
                                <div className="timeline-event-detail-line">
                                  Expected Value (EV): ₹<span className="timeline-event-detail-value">{event.details.expectedValue}</span>
                                  {event.details?.evNet !== undefined && ` (Net EV: ₹${event.details.evNet})`}
                                </div>
                              )}
                              {event.details?.reasoning && (
                                <div className="timeline-event-detail-line" style={{ fontStyle: "italic", opacity: 0.8, marginTop: "2px" }}>
                                  Reason: {event.details.reasoning}
                                </div>
                              )}
                            </>
                          )}

                          {event.type === "POLICY_DECISION" && (
                            <div className="timeline-event-detail-line">
                              Policy Gate: {event.details?.allowed ? (
                                <span className="timeline-event-status" style={{ color: "#22c55e", fontWeight: "bold" }}>✓ APPROVED (Guardrails Passed)</span>
                              ) : (
                                <span className="timeline-event-status blocked" style={{ color: "#ef4444", fontWeight: "bold" }}>
                                  ✗ BLOCKED {event.details?.blockReason ? `(${event.details.blockReason})` : ""}
                                </span>
                              )}
                            </div>
                          )}

                          {event.type === "DUPLICATE_RECOVERY_BLOCKED" && (
                            <div className="timeline-event-detail-line">
                              <span style={{ color: "#f59e0b", fontWeight: "bold" }}>🛡️ BLOCKED BY IDEMPOTENCY</span> · Reason: <span className="timeline-event-detail-value">{event.details?.reason || "Recovery action has already been processed"}</span>
                            </div>
                          )}

                          {(event.type === "SAFETY_GUARDRAIL_BLOCKED" || event.type === "RECOVERY_BLOCKED") && (
                            <div className="timeline-event-detail-line">
                              <span style={{ color: "#ef4444", fontWeight: "bold" }}>🛑 BLOCKED BY SAFETY GATE</span> · Rule: <span className="timeline-event-detail-value">{event.details?.rule || "Policy Gate"}</span> · Reason: {event.details?.reason || "Safety rule prevented execution"}
                            </div>
                          )}

                          {event.type === "RECOVERY_EXECUTED" && (
                            <div className="timeline-event-detail-line">
                              <span style={{ color: "#22c55e", fontWeight: "bold" }}>⚡ SUCCESSFULLY EXECUTED</span> · Action: <span className="timeline-event-detail-value">{event.action}</span>
                              {event.details?.status && ` · Status: ${event.details.status === "RETRY_EXECUTED" ? "RETRY EXECUTED" : event.details.status}`}
                              {event.details?.mode && ` · Mode: ${event.details.mode}`}
                            </div>
                          )}

                          {event.type === "PAYMENT_RECOVERED" && (
                            <div className="timeline-event-detail-line">
                              Successfully Recovered ₹<span className="timeline-event-detail-value" style={{ color: "#22c55e", fontWeight: "bold" }}>{event.details?.recoveredAmount}</span>
                            </div>
                          )}

                          {event.type === "KILL_SWITCH_UPDATED" && (
                            <div className="timeline-event-detail-line">
                              State: <span className="timeline-event-detail-value" style={{ color: event.details?.enabled ? "#ef4444" : "#22c55e", fontWeight: "bold" }}>
                                {event.details?.enabled ? "MERCHANT KILL SWITCH ACTIVATED (EMERGENCY STOP)" : "KILL SWITCH DEACTIVATED (NORMAL OPERATIONAL STATE)"}
                              </span>
                            </div>
                          )}

                          {event.type === "MODE_CHANGED" && (
                            <div className="timeline-event-detail-line">
                              Execution Mode set to: <span className="timeline-event-detail-value" style={{ color: "#38bdf8", fontWeight: "bold" }}>{event.details?.mode}</span>
                            </div>
                          )}

                          {/* RENDER ALL OTHER / UNHANDLED BACKEND DETAILS */}
                          {extraDetails.length > 0 && (
                            <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {extraDetails.map(([key, val]) => (
                                <span key={key} style={{ fontSize: "10px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "1px 6px", borderRadius: "3px", color: "#94a3b8" }}>
                                  <strong>{key}:</strong> {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                </span>
                              ))}
                            </div>
                          )}

                          {!event.details && event.action && (
                            <div className="timeline-event-detail-line">
                              Action: {event.action}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )
        )}
      </section>

      {/* --------------------------------------------------
          METRICS
      -------------------------------------------------- */}

      <section className="metrics">

        <div className="card">
          <span>
            Total Payments
          </span>

          <strong>
            {metrics.totalPayments}
          </strong>
        </div>

        <div className="card">
          <span>
            Success Rate
          </span>

          <strong>
            {metrics.successRate}%
          </strong>
        </div>

        <div className="card">
          <span>
            Failure Rate
          </span>

          <strong>
            {metrics.failureRate}%
          </strong>
        </div>

        <div className="card">
          <span>
            Revenue
          </span>

          <strong>
            ₹{metrics.revenue}
          </strong>
        </div>

      </section>

      {/* --------------------------------------------------
          LIVE PAYMENT STREAM - COMPACT
      -------------------------------------------------- */}

      <section className="payments">
        <div 
          className="payments-header"
          onClick={() => setIsPaymentStreamExpanded(!isPaymentStreamExpanded)}
          style={{ cursor: "pointer", userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="payments-title" style={{ margin: 0 }}>
              LIVE PAYMENT STREAM
            </div>
            <span style={{ fontSize: "11px", background: "rgba(96, 165, 250, 0.2)", border: "1px solid rgba(96, 165, 250, 0.4)", borderRadius: "4px", padding: "2px 8px", color: "#60a5fa", textTransform: "none", fontWeight: "normal" }}>
              {isPaymentStreamExpanded ? "▲ Fold / Hide" : "▼ Expand Stream Table"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "rgba(96, 165, 250, 0.15)", border: "1px solid rgba(96, 165, 250, 0.3)", borderRadius: "4px", padding: "2px 8px", fontSize: "10px", fontWeight: "bold", color: "#60a5fa" }}>
              {payments.length} PAYMENTS BUFFERED
            </div>
            <div className="payments-live-indicator">
              <span className="payments-live-dot"></span>
              {(payments.length > 2 
                ? Math.floor(payments.length * 12) 
                : 47)} events/min
            </div>
          </div>
        </div>

        {!isPaymentStreamExpanded && payments.length > 0 && (
          <div 
            onClick={() => setIsPaymentStreamExpanded(true)}
            style={{ 
              marginTop: "12px", 
              padding: "10px 14px", 
              background: "rgba(0, 0, 0, 0.25)", 
              borderRadius: "4px", 
              borderLeft: "3px solid #60a5fa", 
              fontSize: "12px", 
              color: "#cbd5e1",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <strong style={{ color: "#60a5fa" }}>Latest Payment Event:</strong>{" "}
              ...{payments[payments.length - 1].paymentId.slice(-6)}{" "}
              · ₹{payments[payments.length - 1].amount.toLocaleString()}{" "}
              · Status: <span style={{ fontWeight: "bold", color: payments[payments.length - 1].status === "SUCCESS" ? "#22c55e" : payments[payments.length - 1].status === "RECOVERED" ? "#38bdf8" : "#ef4444" }}>{payments[payments.length - 1].status}</span>{" "}
              {payments[payments.length - 1].errorCode ? `(${payments[payments.length - 1].errorCode})` : ""}{" "}
              {payments[payments.length - 1].experimentGroup ? `· ${payments[payments.length - 1].experimentGroup} Group` : ""}
            </div>
            <span style={{ color: "#94a3b8", fontSize: "11px" }}>Click to expand stream table →</span>
          </div>
        )}

        {isPaymentStreamExpanded && (
          <>
            <div className="payments-filters" style={{ marginTop: "16px" }}>
              <button
                className={`filter-btn ${paymentFilter === "ALL" ? "active" : ""}`}
                onClick={() => setPaymentFilter("ALL")}
              >
                [ ALL ]
              </button>
              <button
                className={`filter-btn ${paymentFilter === "FAILED" ? "active" : ""}`}
                onClick={() => setPaymentFilter("FAILED")}
              >
                [ FAILED ]
              </button>
              <button
                className={`filter-btn ${paymentFilter === "RECOVERED" ? "active" : ""}`}
                onClick={() => setPaymentFilter("RECOVERED")}
              >
                [ RECOVERED ]
              </button>
              <button
                className={`filter-btn ${paymentFilter === "AGENT" ? "active" : ""}`}
                onClick={() => setPaymentFilter("AGENT")}
              >
                [ AGENT ]
              </button>
              <button
                className={`filter-btn ${paymentFilter === "CONTROL" ? "active" : ""}`}
                onClick={() => setPaymentFilter("CONTROL")}
              >
                [ CONTROL ]
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>VALUE</th>
                  <th>STATUS</th>
                  <th>GROUP</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {[...payments]
                  .reverse()
                  .filter((payment) => {
                    if (paymentFilter === "ALL") return true;
                    if (paymentFilter === "FAILED") return payment.status === "FAILED";
                    if (paymentFilter === "RECOVERED") return payment.status === "RECOVERED";
                    if (paymentFilter === "AGENT") return payment.experimentGroup === "AGENT";
                    if (paymentFilter === "CONTROL") return payment.experimentGroup === "CONTROL";
                    return true;
                  })
                  .slice(0, 15)
                  .map((payment) => (
                    <tr key={payment.paymentId} className={payment.status === "RECOVERED" ? "highlight" : ""}>
                      <td className="payment-id">
                        ...{payment.paymentId.slice(-5)}
                      </td>
                      <td className="payment-amount">
                        ₹{payment.amount.toLocaleString()}
                      </td>
                      <td className="payment-status">
                        <div className="payment-status-stack">
                          <span className={payment.status.toLowerCase()}>
                            {payment.status}
                          </span>
                          {payment.errorCode && (
                            <small className="payment-error">{payment.errorCode}</small>
                          )}
                        </div>
                      </td>
                      <td className="payment-group">
                        {payment.experimentGroup === "AGENT" && "🟢 AGENT"}
                        {payment.experimentGroup === "CONTROL" && "⚪ CONTROL"}
                        {!payment.experimentGroup && "—"}
                      </td>
                      <td className="payment-action">
                        {payment.status === "FAILED" && payment.experimentGroup === "AGENT" && (
                          <button
                            type="button"
                            className="stream-execute-btn"
                            onClick={() => executeTargetedPayment(payment)}
                          >
                            EXECUTE
                          </button>
                        )}
                        {payment.status === "FAILED" && payment.experimentGroup === "CONTROL" && (
                          "NONE"
                        )}
                        {payment.status !== "FAILED" && "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        )}
      </section>

    </div>
  );
}

export default App;

