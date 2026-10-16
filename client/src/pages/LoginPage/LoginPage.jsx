import React, { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import "./LoginPage.css";

const emailFromLink = (value) => {
  let email = String(value || "").trim();
  const angled = email.match(/<([^>]+@[^>]+)>/);
  if (angled) email = angled[1];
  return email.replace(/^mailto:/i, "").trim();
};

const LoginPage = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    email: emailFromLink(searchParams.get("email")),
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
      }
      if (!form.email || !form.password) {
        throw new Error("Enter your work email and password.");
      }
      await login(form.email, form.password);
      enterApp();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className={`bb-auth${leaving ? " is-leaving" : ""}`}>
      <form className={`bb-auth__card${isLogin ? "" : " is-register"}`} onSubmit={submit}>
        <div className="bb-auth__logo">
          <img src="/Brightbyte%20Fleet%20Management%20Logo.png" alt="BrightByte" />
        </div>
        <h1 className="bb-auth__title">
          {isLogin ? "Sign in to continue to BrightByte" : "Create a BrightByte workspace"}
        </h1>
        {isLogin ? (
          <>
            <button type="button" className="bb-auth__google" disabled>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.7 7.5l6.3 5.3C38.2 37.3 44 32 44 24c0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              Continue with Google
            </button>
            <div className="bb-auth__or">
              <span>OR</span>
            </div>
          </>
        ) : null}
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
          Email
          <input
            type="text"
            inputMode="email"
            autoComplete="username"
            required={isLogin}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="bb-auth__field bb-auth__field--password">
          Password
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path d="M1 12.5C2.6 8.1 7 5 12 5s9.4 3.1 11 7.5c-1.6 4.4-6 7.5-11 7.5S2.6 16.9 1 12.5z" />
              <circle cx="12" cy="12.5" r="3" />
            </svg>
          </button>
        </label>
        {isLogin ? (
          <button type="button" className="bb-auth__forgot" onClick={() => setError("Ask your admin to reset your password.")}>
            Forgot password?
          </button>
        ) : null}
        {error ? <p className="fc-error">{error}</p> : null}
        <button className="bb-auth__submit" type="submit" disabled={busy}>
          {busy ? "Opening…" : isLogin ? "Sign in" : "Create workspace"}
        </button>
        <p className="bb-auth__footer">
          {isLogin ? "New to BrightByte? " : "Already have an account? "}
          <button
            type="button"
            className="bb-auth__switch"
            onClick={() => {
              setError("");
              setMode(isLogin ? "register" : "login");
            }}
          >
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </p>
        {isLogin ? (
          <p className="bb-auth__legal">
            By continuing, you agree to our <span>Terms &amp; Conditions</span> and acknowledge our <span>Privacy Policy</span>.
          </p>
        ) : null}
      </form>
      <p className="bb-auth__powered">Powered by Brainstak</p>
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
