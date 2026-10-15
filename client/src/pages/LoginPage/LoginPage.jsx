import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import "./LoginPage.css";

const LoginPage = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    companyName: "",
    fullName: "",
    companyAddress: "",
  });

  if (user && !leaving && !busy) return <Navigate to="/dashboard" replace />;

  const enterApp = () => {
    setLeaving(true);
    window.setTimeout(() => navigate("/dashboard"), 320);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        if (!form.companyName || !form.fullName || !form.companyAddress || !form.email || !form.password) {
          throw new Error("Fill in company name, address, your name, email and password.");
        }
        await register(form);
        setBusy(false);
        setSubmitted(true);
        return;
      } else {
        if (!form.email || !form.password) {
          throw new Error("Enter your work email and password.");
        }
        await login(form.email, form.password);
      }
      enterApp();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className={`bb-auth${leaving ? " is-leaving" : ""}`}>
      <aside className="bb-auth__aside">
        <div className="bb-auth__aside-inner">
          <p className="bb-auth__brand">BrightByte</p>
          <span className="bb-auth__rule" aria-hidden="true" />
          <h2>Fleet operations in one place</h2>
          <p className="bb-auth__tag">The SaaS fleet management platform</p>
        </div>
      </aside>
      <main className="bb-auth__main">
        <form className={`bb-auth__card${isLogin ? "" : " is-register"}`} onSubmit={submit}>
          <div className="bb-auth__copy">
            <h1>{isLogin ? "Sign in" : "Create a workspace"}</h1>
            <p className="bb-auth__lead">
              {isLogin ? "Continue to your fleet workspace." : "Open a workspace for your fleet."}
            </p>
          </div>
          <div className="bb-auth__extra" aria-hidden={isLogin}>
            <div className="bb-auth__extra-inner">
              <label className="bb-auth__field">
                Company name
                <input
                  tabIndex={isLogin ? -1 : 0}
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </label>
              <label className="bb-auth__field">
                Your name
                <input
                  tabIndex={isLogin ? -1 : 0}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </label>
              <label className="bb-auth__field">
                Company address
                <input
                  tabIndex={isLogin ? -1 : 0}
                  value={form.companyAddress}
                  onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
                />
              </label>
            </div>
          </div>
          <label className="bb-auth__field">
            Work email
            <input
              type="email"
              autoComplete="username"
              required={isLogin}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="bb-auth__field">
            Password
            <span className="bb-auth__password">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={isLogin}
              />
              <button
                type="button"
                className="bb-auth__eye"
                onClick={() => setShowPassword((on) => !on)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                    <path d="M9.9 5.1A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7.5a11.7 11.7 0 01-4 5.2" />
                    <path d="M6.1 6.1C4 7.6 2.4 9.6 1 12.5c1.6 4.4 6 7.5 11 7.5 1.4 0 2.7-.2 4-.7" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M1 12.5C2.6 8.1 7 5 12 5s9.4 3.1 11 7.5c-1.6 4.4-6 7.5-11 7.5S2.6 16.9 1 12.5z" />
                    <circle cx="12" cy="12.5" r="3" />
                  </svg>
                )}
              </button>
            </span>
          </label>
          {error ? <p className="fc-error">{error}</p> : null}
          <button className="bb-auth__submit" type="submit" disabled={busy}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
            </svg>
            {busy ? "Opening…" : isLogin ? "Sign in" : "Create workspace"}
          </button>
          <button
            type="button"
            className="bb-auth__switch"
            onClick={() => {
              setError("");
              setMode(isLogin ? "register" : "login");
            }}
          >
            {isLogin ? "Register a company" : "Back to sign in"}
          </button>
          <p className="bb-auth__powered">powered by brainstak</p>
        </form>
      </main>
      <SuccessModal
        open={submitted}
        title="Company submitted"
        subtitle="A super admin will review this workspace."
        message="The company has been successfully submitted. Wait for a super admin to approve it before you can sign in."
        onClose={() => {
          setSubmitted(false);
          setMode("login");
          setForm((f) => ({ ...f, companyName: "", fullName: "", companyAddress: "", password: "" }));
        }}
      />
    </div>
  );
};

export default LoginPage;
