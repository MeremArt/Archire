import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ─── Win2000 primitives ─────────────────────────────────────── */

const WIN_BG      = "#d4d0c8";   // classic desktop gray
const WIN_DARK    = "#808080";
const WIN_DARKER  = "#404040";
const WIN_LIGHT   = "#ffffff";
const WIN_FACE    = "#d4d0c8";
const TITLEBAR_START = "#0a246a";
const TITLEBAR_END   = "#a6caf0";
const WIN_BLUE    = "#000080";   // classic Windows navy

const raised = {
  borderTop:    `2px solid ${WIN_LIGHT}`,
  borderLeft:   `2px solid ${WIN_LIGHT}`,
  borderBottom: `2px solid ${WIN_DARKER}`,
  borderRight:  `2px solid ${WIN_DARKER}`,
};

const sunken = {
  borderTop:    `2px solid ${WIN_DARKER}`,
  borderLeft:   `2px solid ${WIN_DARKER}`,
  borderBottom: `2px solid ${WIN_LIGHT}`,
  borderRight:  `2px solid ${WIN_LIGHT}`,
};

const innerSunken = {
  borderTop:    `1px solid ${WIN_DARK}`,
  borderLeft:   `1px solid ${WIN_DARK}`,
  borderBottom: `1px solid ${WIN_LIGHT}`,
  borderRight:  `1px solid ${WIN_LIGHT}`,
};

/* ─── Eye icon ───────────────────────────────────────────────── */

function EyeIcon({ open }) {
  return open ? (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

/* ─── Win2000 Button ─────────────────────────────────────────── */

function Win2kButton({ children, onClick, type = "button", disabled = false, primary = false, style = {} }) {
  const [pressed, setPressed] = useState(false);

  const base = {
    fontFamily: "'Tahoma', 'MS Sans Serif', sans-serif",
    fontSize: "11px",
    background: WIN_FACE,
    color: disabled ? WIN_DARK : "#000000",
    cursor: disabled ? "default" : "pointer",
    padding: "3px 12px",
    minWidth: "75px",
    height: "23px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    outline: "none",
    ...(pressed || disabled ? sunken : raised),
    ...style,
  };

  if (primary) {
    base.outline = `1px solid #000080`;
    base.outlineOffset = "-3px";
  }

  return (
    <button
      type={type}
      disabled={disabled}
      style={base}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* ─── Win2000 Text Input ─────────────────────────────────────── */

function Win2kInput({ type = "text", value, onChange, placeholder, autoComplete, id }) {
  return (
    <input
      id={id}
      type={type}
      required
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        fontFamily: "'Tahoma', 'MS Sans Serif', sans-serif",
        fontSize: "11px",
        width: "100%",
        height: "21px",
        padding: "0 3px",
        background: WIN_LIGHT,
        color: "#000000",
        boxSizing: "border-box",
        outline: "none",
        ...sunken,
      }}
    />
  );
}

/* ─── Password Input ─────────────────────────────────────────── */

function PasswordInput({ value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        style={{
          fontFamily: "'Tahoma', 'MS Sans Serif', sans-serif",
          fontSize: "11px",
          width: "100%",
          height: "21px",
          padding: "0 24px 0 3px",
          background: WIN_LIGHT,
          color: "#000000",
          boxSizing: "border-box",
          outline: "none",
          ...sunken,
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: "2px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 2px",
          color: WIN_DARKER,
          display: "flex",
          alignItems: "center",
        }}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}

/* ─── Win2000 Tab ────────────────────────────────────────────── */

function Win2kTabs({ tab, setTab }) {
  const tabs = [
    { id: "login",    label: "Sign In" },
    { id: "register", label: "Create Account" },
  ];

  return (
    <div style={{ display: "flex", marginBottom: "-1px", paddingLeft: "4px", gap: "2px" }}>
      {tabs.map(({ id, label }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              fontFamily: "'Tahoma', 'MS Sans Serif', sans-serif",
              fontSize: "11px",
              padding: "3px 10px",
              background: active ? WIN_FACE : "#bab8b0",
              color: "#000",
              cursor: "pointer",
              position: "relative",
              zIndex: active ? 2 : 1,
              borderTop:    `2px solid ${active ? WIN_LIGHT : WIN_DARK}`,
              borderLeft:   `2px solid ${active ? WIN_LIGHT : WIN_DARK}`,
              borderRight:  `2px solid ${active ? WIN_DARKER : WIN_DARK}`,
              borderBottom: active ? `2px solid ${WIN_FACE}` : `2px solid ${WIN_DARKER}`,
              marginBottom: active ? "-2px" : "0",
              outline: "none",
              userSelect: "none",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main Login Component ───────────────────────────────────── */

export default function Login() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "register" ? "register" : "login";
  const [tab, setTab] = useState(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          (tab === "login" ? "Invalid email or password." : "Registration failed.")
      );
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setError("");
    setPassword("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#3a6ea5",          /* classic Win2k desktop blue */
        backgroundImage: `
          radial-gradient(ellipse at 30% 60%, #2a5a9a 0%, transparent 50%),
          radial-gradient(ellipse at 70% 30%, #1e4e8c 0%, transparent 50%)
        `,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Tahoma', 'MS Sans Serif', sans-serif",
      }}
    >
      {/* Window */}
      <div
        style={{
          width: "360px",
          background: WIN_BG,
          ...raised,
          boxShadow: "2px 2px 8px rgba(0,0,0,0.4)",
        }}
      >

        {/* Title Bar */}
        <div
          style={{
            background: `linear-gradient(to right, ${TITLEBAR_START}, ${TITLEBAR_END})`,
            padding: "3px 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* App icon */}
            <div
              style={{
                width: "16px",
                height: "16px",
                background: "#4a90d9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span
              style={{
                color: "white",
                fontSize: "11px",
                fontWeight: "bold",
                letterSpacing: "0.02em",
              }}
            >
              ArcHire — {tab === "login" ? "Sign In" : "Create Account"}
            </span>
          </div>

          {/* Window controls */}
          <div style={{ display: "flex", gap: "2px" }}>
            {["−", "□", "✕"].map((ch, i) => (
              <button
                key={i}
                aria-label={["Minimize", "Maximize", "Close"][i]}
                style={{
                  width: "16px",
                  height: "14px",
                  fontSize: "9px",
                  fontWeight: "bold",
                  background: WIN_FACE,
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "default",
                  ...raised,
                  border: "1px solid #808080",
                }}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: "8px 8px 0", borderBottom: `2px solid ${WIN_DARKER}` }}>
          <Win2kTabs tab={tab} setTab={switchTab} />
        </div>

        {/* Window Content */}
        <div style={{ padding: "12px 16px 16px" }}>

          {/* Banner */}
          <div
            style={{
              background: WIN_BLUE,
              color: "white",
              padding: "8px 10px",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              ...sunken,
            }}
          >
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.5} style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "bold" }}>ArcHire</div>
              <div style={{ fontSize: "10px", opacity: 0.85 }}>
                {tab === "login"
                  ? "Enter your credentials to sign in."
                  : "Fill in the fields to create your account."}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            {/* Fieldset: Email */}
            <div
              style={{
                border: `1px solid ${WIN_DARK}`,
                padding: "8px 10px 10px",
                marginBottom: "10px",
                position: "relative",
              }}
            >
              <legend
                style={{
                  position: "absolute",
                  top: "-8px",
                  left: "8px",
                  background: WIN_BG,
                  padding: "0 4px",
                  fontSize: "10px",
                  color: "#000",
                  userSelect: "none",
                }}
              >
                Email Address
              </legend>
              <Win2kInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {/* Fieldset: Password */}
            <div
              style={{
                border: `1px solid ${WIN_DARK}`,
                padding: "8px 10px 10px",
                marginBottom: "12px",
                position: "relative",
              }}
            >
              <legend
                style={{
                  position: "absolute",
                  top: "-8px",
                  left: "8px",
                  background: WIN_BG,
                  padding: "0 4px",
                  fontSize: "10px",
                  color: "#000",
                  userSelect: "none",
                }}
              >
                Password{tab === "register" && " (min. 8 characters)"}
              </legend>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "6px",
                  marginBottom: "10px",
                  background: "#fff0f0",
                  padding: "6px 8px",
                  fontSize: "11px",
                  color: "#c00000",
                  ...sunken,
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: "1px" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Separator */}
            <div style={{ borderTop: `1px solid ${WIN_DARK}`, borderBottom: `1px solid ${WIN_LIGHT}`, margin: "10px 0" }} />

            {/* Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
              <Win2kButton
                type="submit"
                primary
                disabled={loading}
                style={{ minWidth: "90px" }}
              >
                {loading
                  ? (tab === "login" ? "Signing in…" : "Creating…")
                  : (tab === "login" ? "Sign In" : "Create Account")}
              </Win2kButton>
              <Win2kButton
                type="button"
                onClick={() => navigate("/welcome")}
                disabled={loading}
              >
                Cancel
              </Win2kButton>
            </div>
          </form>

          {/* Status bar */}
          <div
            style={{
              marginTop: "14px",
              display: "flex",
              gap: "4px",
            }}
          >
            <div
              style={{
                flex: 1,
                ...innerSunken,
                padding: "1px 4px",
                fontSize: "10px",
                color: WIN_DARKER,
              }}
            >
              {tab === "login" ? "Ready" : "All fields required"}
            </div>
            <div
              style={{
                width: "80px",
                ...innerSunken,
                padding: "1px 4px",
                fontSize: "10px",
                color: WIN_DARKER,
                textAlign: "center",
              }}
            >
              ArcHire v1.0
            </div>
          </div>
        </div>
      </div>

      {/* "Start bar" hint */}
      <div
        style={{
          position: "fixed",
          bottom: "0",
          left: "0",
          right: "0",
          height: "28px",
          background: WIN_BG,
          borderTop: `2px solid ${WIN_LIGHT}`,
          boxShadow: `0 -1px 0 ${WIN_DARKER}`,
          display: "flex",
          alignItems: "center",
          padding: "0 4px",
          gap: "4px",
        }}
      >
        {/* Start button */}
        <div
          style={{
            ...raised,
            background: WIN_FACE,
            padding: "2px 8px 2px 4px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: "bold",
            cursor: "default",
            userSelect: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" fill="#f25022" />
            <rect x="13" y="2" width="9" height="9" fill="#7fba00" />
            <rect x="2" y="13" width="9" height="9" fill="#00a4ef" />
            <rect x="13" y="13" width="9" height="9" fill="#ffb900" />
          </svg>
          Start
        </div>

        {/* Quick-launch separator */}
        <div style={{ width: "2px", height: "20px", borderLeft: `1px solid ${WIN_DARK}`, borderRight: `1px solid ${WIN_LIGHT}` }} />

        {/* Active task */}
        <div
          style={{
            ...sunken,
            background: "#c8c4bc",
            padding: "2px 8px",
            fontSize: "11px",
            cursor: "default",
            userSelect: "none",
          }}
        >
          ArcHire — {tab === "login" ? "Sign In" : "Create Account"}
        </div>

        {/* Clock */}
        <div
          style={{
            marginLeft: "auto",
            ...innerSunken,
            padding: "1px 8px",
            fontSize: "11px",
            cursor: "default",
            userSelect: "none",
          }}
        >
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
