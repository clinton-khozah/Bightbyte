import React, { useMemo } from "react";
import "./FinanceBarChart.css";

const W = 760;
const H = 292;
const PAD = { t: 18, r: 12, b: 40, l: 56 };

const formatAxis = (value) => {
  const n = Number(value);
  if (n >= 1000) return `R${Math.round(n / 1000)}k`;
  return `R${Math.round(n)}`;
};

const FinanceBarChart = ({ months = [] }) => {
  const geometry = useMemo(() => {
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const peak = Math.max(
      1,
      ...months.flatMap((row) => [row.expense, row.total, row.profit].map(Number)),
    );
    const niceMax = Math.ceil(peak / 1000) * 1000 || 1000;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(niceMax * p));
    const groupW = months.length ? innerW / months.length : innerW;
    const barW = Math.min(16, Math.max(8, groupW / 5.4));
    const cluster = barW * 3 + 6;
    return { innerW, innerH, niceMax, ticks, groupW, barW, cluster };
  }, [months]);

  const y = (value) => PAD.t + geometry.innerH - (Number(value) / geometry.niceMax) * geometry.innerH;
  const h = (value) => Math.max(2, (Number(value) / geometry.niceMax) * geometry.innerH);

  return (
    <div className="finance-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Expense, total and profit by month">
        {geometry.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(tick)}
              y2={y(tick)}
              className="finance-chart__grid"
            />
            <text x={PAD.l - 8} y={y(tick) + 4} textAnchor="end" className="finance-chart__tick">
              {formatAxis(tick)}
            </text>
          </g>
        ))}
        {months.map((row, index) => {
          const center = PAD.l + geometry.groupW * index + geometry.groupW / 2;
          const start = center - geometry.cluster / 2;
          const bars = [
            { key: "expense", value: row.expense, className: "finance-chart__bar--expense" },
            { key: "total", value: row.total, className: "finance-chart__bar--total" },
            { key: "profit", value: row.profit, className: "finance-chart__bar--profit" },
          ];
          return (
            <g key={row.key || row.label}>
              {bars.map((bar, i) => {
                const x = start + i * (geometry.barW + 3);
                const height = h(bar.value);
                return (
                  <rect
                    key={bar.key}
                    x={x}
                    y={y(bar.value)}
                    width={geometry.barW}
                    height={height}
                    rx="3"
                    className={`finance-chart__bar ${bar.className}`}
                  >
                    <title>{`${row.label} ${bar.key}: R${Number(bar.value).toFixed(0)}`}</title>
                  </rect>
                );
              })}
              <text x={center} y={H - 14} textAnchor="middle" className="finance-chart__label">
                {row.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="finance-chart__legend">
        <li>
          <i className="finance-chart__swatch finance-chart__swatch--expense" />
          Expense
        </li>
        <li>
          <i className="finance-chart__swatch finance-chart__swatch--total" />
          Total amount
        </li>
        <li>
          <i className="finance-chart__swatch finance-chart__swatch--profit" />
          Profit
        </li>
      </ul>
    </div>
  );
};

export default FinanceBarChart;
