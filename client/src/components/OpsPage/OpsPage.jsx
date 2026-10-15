import React from "react";
import "./OpsPage.css";

const OpsPage = ({
  crumb,
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  extraLabel,
  onExtra,
  onExport,
  stats = [],
  activeStat,
  onStat,
  children,
}) => (
  <div className="ops-page">
    {crumb?.length ? (
      <p className="ops-page__crumb">
        {crumb[0]}
        <span>/</span>
        <b>{crumb[1] || title}</b>
      </p>
    ) : null}
    <div className="ops-page__header">
      <div>
        <h1 className="ops-page__title">{title}</h1>
        {subtitle ? <p className="ops-page__sub">{subtitle}</p> : null}
      </div>
      <div className="ops-page__actions">
        {onExport ? (
          <button type="button" className="ops-page__btn ops-page__btn--outline" onClick={onExport}>
            ⬇ Export
          </button>
        ) : null}
        {onSecondary ? (
          <button type="button" className="ops-page__btn ops-page__btn--outline" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        ) : null}
        {onExtra ? (
          <button type="button" className="ops-page__btn ops-page__btn--outline" onClick={onExtra}>
            + {extraLabel}
          </button>
        ) : null}
        {onPrimary ? (
          <button type="button" className="ops-page__btn ops-page__btn--primary" onClick={onPrimary}>
            + {primaryLabel}
          </button>
        ) : null}
      </div>
    </div>
    {stats.length ? (
      <div className="ops-page__stats">
        {stats.map((stat) => (
          <button
            key={stat.id}
            type="button"
            className={`ops-page__stat${activeStat === stat.id ? " ops-page__stat--active" : ""}`}
            onClick={() => onStat?.(stat.id)}
          >
            <span className={`ops-page__stat-icon ops-page__stat-icon--${stat.tone || "blue"}`}>
              {stat.icon}
            </span>
            <span className="ops-page__stat-copy">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </span>
            <span className="ops-page__chevron">▸</span>
          </button>
        ))}
      </div>
    ) : null}
    {children}
  </div>
);

export default OpsPage;
