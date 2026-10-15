import React from "react";
import "./DriverCheckinHistory.css";

const stateLabel = {
  on_time: "On time",
  late: "Late",
  missed: "Missed",
  pending: "Due today",
};

const DriverCheckinHistory = ({ score }) => {
  const history = score?.history || [];
  const max = Math.max(...history.map((d) => d.amount), 1);

  return (
    <section className="checkin-history">
      <h3>Check-in history</h3>
      <p>
        Each bar is a check-in, scored against the daily due time
        {score?.dueTime ? ` (${score.dueTime})` : ""}. Green is on time, amber is late, red is
        today missed.
      </p>
      {history.length ? (
        <>
          <div className="checkin-history__legend">
            <span className="is-on_time">{score?.onTime || 0} on time</span>
            <span className="is-late">{score?.late || 0} late</span>
            <span className="is-missed">{score?.missed || 0} missed</span>
          </div>
          <div className="checkin-history__chart" role="img" aria-label="Check-in schedule history">
            {history.map((day) => (
              <div key={day.key} className={`checkin-history__col is-${day.state}`}>
                <div className="checkin-history__track">
                  <span
                    style={{ height: `${day.amount ? Math.max(18, (day.amount / max) * 100) : 10}%` }}
                    title={`${day.date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })} · ${stateLabel[day.state]}${day.amount ? ` · R${Math.round(day.amount)}` : ""}`}
                  />
                </div>
                <small>
                  {day.date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}
                </small>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="checkin-history__empty">No check-ins on this driver yet.</div>
      )}
    </section>
  );
};

export default DriverCheckinHistory;
