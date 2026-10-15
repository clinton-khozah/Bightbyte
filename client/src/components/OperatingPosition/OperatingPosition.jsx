import React from "react";
import FinanceBarChart from "../FinanceBarChart/FinanceBarChart";
import "./OperatingPosition.css";

const money = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n || 0));

const OperatingPosition = ({ months = [], totals = { expense: 0, total: 0, profit: 0 } }) => (
  <section className="op-panel">
    <header className="op-panel__head">
      <div>
        <h2>Operating position</h2>
        <p>Expense, check-in and revenue as a grouped bar chart.</p>
      </div>
      <span className="op-panel__chip">Last 6 months</span>
    </header>
    <div className="op-panel__card">
      <FinanceBarChart months={months} />
      <div className="op-panel__keys">
        <div className="op-panel__row op-panel__row--head">
          <span>Metric</span>
          <span>Amount</span>
        </div>
        <div className="op-panel__row">
          <div>
            <strong>Expense</strong>
            <small>Fuel and operating outlay</small>
          </div>
          <code>{money(totals.expense)}</code>
        </div>
        <div className="op-panel__row">
          <div>
            <strong>Check-in</strong>
            <small>Captured cash check-ins</small>
          </div>
          <code>{money(totals.total)}</code>
        </div>
        <div className="op-panel__row">
          <div>
            <strong>Revenue</strong>
            <small>Check-in less expense</small>
          </div>
          <code className={totals.profit >= 0 ? "is-up" : "is-down"}>{money(totals.profit)}</code>
        </div>
      </div>
    </div>
  </section>
);

export default OperatingPosition;
