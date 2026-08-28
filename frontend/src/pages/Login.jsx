import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "../assets/logo.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Could not log in. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      {/* Thin brand bar across the very top of the page */}
      <div className="fixed top-0 inset-x-0 h-1.5 bg-ink" />

      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-2xl shadow-card p-8 space-y-5 animate-fade-in-up">
          <div className="flex flex-col items-center text-center">
            <img src={logo} alt="HairSkiin Sri Lanka" className="h-11 w-auto object-contain mb-3" />
            <p className="text-sm text-muted">Sign in to continue</p>
          </div>

          {error && (
            <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm text-ink">
              <span className="text-alert mr-0.5">*</span>Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm border border-line rounded-xl px-3.5 py-2.5 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-ink">
              <span className="text-alert mr-0.5">*</span>Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm border border-line rounded-xl px-3.5 py-2.5 pr-10 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-ink transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-sm font-medium px-4 py-3 rounded-xl bg-accent text-white shadow-soft hover:bg-accentDark hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M2.5 2.5l15 15M8.3 8.4a2.5 2.5 0 003.3 3.3M6 4.9C7.2 4.3 8.5 4 10 4c5.5 0 8.5 6 8.5 6a15 15 0 01-3 3.8M4.6 6.1C2.7 7.6 1.5 10 1.5 10s3 6 8.5 6c1 0 1.9-.2 2.7-.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

