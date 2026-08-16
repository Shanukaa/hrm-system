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
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8 animate-fade-in-up">
          <img src={logo} alt="HairSkiin Sri Lanka" className="h-12 w-auto object-contain" />
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-7 space-y-4 shadow-sm animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <div>
            <h1 className="font-display text-lg text-ink mb-1">Sign in</h1>
            <p className="text-sm text-muted">Enter your account details to continue.</p>
          </div>

          {error && (
            <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm border border-line rounded-md px-3.5 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              placeholder="you@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm border border-line rounded-md px-3.5 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-sm font-medium px-4 py-2.5 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
