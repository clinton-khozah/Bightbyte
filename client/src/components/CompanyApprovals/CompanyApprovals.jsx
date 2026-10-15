import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import ConfirmModal from "../ConfirmModal/ConfirmModal";
import SuccessModal from "../SuccessModal/SuccessModal";
import "./CompanyApprovals.css";

const CompanyApprovals = ({ rows = [], onChange }) => {
  const [approveTarget, setApproveTarget] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  if (!rows.length && !approveTarget && !success && !error) return null;

  return (
    <section className="company-approvals">
      {rows.length ? (
        <>
          <div className="sb-section__head">
            <div>
              <h2>Companies waiting for approval</h2>
              <p>New workspaces stay locked until a super admin approves them.</p>
            </div>
            <Link className="sb-link-btn" to="/companies">
              Open companies
            </Link>
          </div>
          <div className="sb-card">
            <div className="sb-keys">
              <div className="sb-keys__row sb-keys__row--head company-approvals__row">
                <span>Company</span>
                <span>Address</span>
                <span></span>
              </div>
              {rows.map((row) => (
                <div className="sb-keys__row company-approvals__row" key={row.id}>
                  <div>
                    <strong>{row.name}</strong>
                    <small>{row.contact_email || "—"}</small>
                  </div>
                  <div>
                    <strong>{row.address || "—"}</strong>
                    <small>{row.code}</small>
                  </div>
                  <button
                    className="fc-btn fc-btn--primary"
                    type="button"
                    onClick={() => setApproveTarget(row)}
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
      <ConfirmModal
        open={Boolean(approveTarget)}
        title="Are you sure?"
        message={
          approveTarget
            ? `Approve ${approveTarget.name}? They will be able to sign in after this.`
            : ""
        }
        confirmLabel="Approve"
        tone="primary"
        onCancel={() => setApproveTarget(null)}
        onConfirm={async () => {
          try {
            const name = approveTarget.name;
            await api(`/api/companies/${approveTarget.id}/approve`, { method: "POST" });
            setApproveTarget(null);
            setError("");
            setSuccess(`${name} was successfully approved.`);
            onChange?.();
          } catch (err) {
            setApproveTarget(null);
            setError(err.message);
          }
        }}
      />
      {error ? <p className="fc-error">{error}</p> : null}
      <SuccessModal
        open={Boolean(success)}
        title="Completed successfully"
        message={success}
        onClose={() => setSuccess("")}
      />
    </section>
  );
};

export default CompanyApprovals;
