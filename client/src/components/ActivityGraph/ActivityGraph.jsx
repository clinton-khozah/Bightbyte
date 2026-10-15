import React, { useMemo } from "react";
import "./ActivityGraph.css";

const ActivityGraph = ({ seed = 7 }) => {
  const cells = useMemo(
    () =>
      Array.from({ length: 84 }, (_, i) => {
        const n = (Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1;
        return Math.abs(n) > 0.55 ? Math.ceil(Math.abs(n) * 4) : 0;
      }),
    [seed],
  );
  return (
    <section className="gh-graph">
      <h3>{cells.filter(Boolean).length * 11} events in 2026</h3>
      <div className="gh-graph__grid">
        {cells.map((level, i) => (
          <span key={i} className={`gh-graph__cell gh-graph__cell--${level}`} />
        ))}
      </div>
    </section>
  );
};

export default ActivityGraph;
