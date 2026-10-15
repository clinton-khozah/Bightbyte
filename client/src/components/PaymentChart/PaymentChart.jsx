import React, { useMemo, useState } from "react";
import "./PaymentChart.css";

const money = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n || 0));

const axisMoney = (n) => {
  if (n >= 1000) return `R${Math.round(n / 100) / 10}k`;
  return `R${Math.round(n)}`;
};

const W = 760;
const H = 268;
const PAD = { t: 20, r: 20, b: 44, l: 52 };

const PaymentChart = ({ rows = [], title = "Payments", subtitle }) => {
  const points = useMemo(
    () =>
      [...rows]
        .filter((row) => row.created_at)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [rows],
  );
  const [activeId, setActiveId] = useState(null);
  const active =
    points.find((p) => p.id === (activeId || points[points.length - 1]?.id)) || points[points.length - 1];

  if (!points.length) {
    return (
      <div className="payment-chart">
        <header className="payment-chart__head">
          <h3>{title}</h3>
          <p>{subtitle || "No check-ins have been recorded yet."}</p>
        </header>
      </div>
    );
  }

  const amounts = points.map((p) => Number(p.amount || 0));
  const max = Math.max(...amounts, 1);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const x = (i) => PAD.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (value) => PAD.t + innerH - (Number(value) / max) * innerH;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.amount)}`).join(" ");
  const area = `${line} L ${x(points.length - 1)} ${H - PAD.b} L ${x(0)} ${H - PAD.b} Z`;
  const labelEvery = points.length > 8 ? Math.ceil(points.length / 6) : 1;

  return (
    <div className="payment-chart">
      <header className="payment-chart__head">
        <h3>{title}</h3>
        <p>{subtitle || "Each dot is a check-in. Select a dot to see the amount and proof of payment."}</p>
      </header>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Check-in payments over time">
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#ececec" />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#ececec" />
        <text x={PAD.l - 10} y={PAD.t + 4} textAnchor="end" className="payment-chart__axis">
          {axisMoney(max)}
        </text>
        <text x={PAD.l - 10} y={H - PAD.b} textAnchor="end" className="payment-chart__axis">
          R0
        </text>
        <path d={area} fill="#e6f4ec" />
        <path d={line} fill="none" stroke="#006239" strokeWidth="2.4" />
        {points.map((point, i) => {
          const selected = active?.id === point.id;
          const showLabel = i === 0 || i === points.length - 1 || i % labelEvery === 0;
          return (
            <g key={point.id}>
              <circle
                className="payment-chart__dot"
                cx={x(i)}
                cy={y(point.amount)}
                r={selected ? 7 : 5}
                fill={selected ? "#006239" : "#fff"}
                stroke="#006239"
                strokeWidth="2"
                onClick={() => setActiveId(point.id)}
              />
              {showLabel ? (
                <text x={x(i)} y={H - 16} textAnchor="middle" className="payment-chart__axis">
                  {new Date(point.created_at).toLocaleDateString("en-ZA", {
                    day: "2-digit",
                    month: "short",
                  })}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {active ? (
        <div className="payment-chart__proof">
          {active.proof_url ? (
            <img src={active.proof_url} alt="" />
          ) : (
            <div className="payment-chart__empty" aria-hidden />
          )}
          <div>
            <p className="payment-chart__kicker">Proof of payment</p>
            <strong>{money(active.amount)}</strong>
            <span>
              {new Date(active.created_at).toLocaleString("en-ZA")}
              {active.late_fee_applied ? ` · includes ${money(active.late_fee_applied)} late fee` : ""}
            </span>
          </div>
          {active.proof_url ? (
            <a href={active.proof_url} target="_blank" rel="noreferrer">
              Open proof
            </a>
          ) : (
            <span className="payment-chart__none">No proof on this check-in</span>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default PaymentChart;
