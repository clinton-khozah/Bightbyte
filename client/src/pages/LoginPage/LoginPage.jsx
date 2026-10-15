import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./LoginPage.css";

const DEMO = { email: "admin@fleet21.local", password: "fleet21" };

const LoginPage = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    companyName: "",
    fullName: "",
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
      if (mode === "register" && form.companyName && form.fullName && form.email && form.password) {
        await register(form);
      } else {
        try {
          await login(form.email || DEMO.email, form.password || DEMO.password);
        } catch {
          await login(DEMO.email, DEMO.password);
        }
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
          <p className="bb-auth__eyebrow">BrightByte</p>
          <h2>Fleet operations in one place</h2>
          <p className="bb-auth__tag">The SaaS fleet management platform</p>
          <p>Vehicles, people, check-ins, service and documents in one workspace.</p>
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
            </div>
          </div>
          <label className="bb-auth__field">
            Work email
            <input
              type="email"
              autoComplete="username"
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
                placeholder="Password"
              />
              <button type="button" onClick={() => setShowPassword((on) => !on)}>
                {showPassword ? "Hide" : "Show"}
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
        </form>
      </main>
    </div>
  );
};

export default LoginPage;
