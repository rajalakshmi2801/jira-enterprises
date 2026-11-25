import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  LockKeyhole,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
  Droplets,
  Truck,
} from "lucide-react";

import { useAuth } from "./useAuth";
import { getSetupStatus } from "./auth.service";
import { getErrorMessage } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import Logo from "../../components/Logo";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // First-run detection: show a link to create the owner account.
  const { data: needsSetup } = useAsync(
    () => getSetupStatus().catch(() => false),
    []
  );

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\+?[0-9]{10,15}$/.test(mobile.trim())) {
      setError("Please enter a valid mobile number (10 to 15 digits).");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      setError("Your PIN must be exactly 6 digits.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await login(mobile, pin);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Login failed. Please check your mobile number and PIN."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-logo-card">
            <Logo />
          </div>

          <p className="login-brand-description">
            Freshness reaches you. Manage purchases, stock, sales and
            customer credit for your juice and water distribution business.
          </p>

          <div className="login-feature-list">
            <div>
              <Truck size={18} />
              <span>Buy in bulk cases, sell to shops</span>
            </div>

            <div>
              <Droplets size={18} />
              <span>Live stock, credit and profit tracking</span>
            </div>

            <div>
              <ShieldCheck size={18} />
              <span>Owner and viewer access with PIN login</span>
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          Distribution Management System
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-form-container">
          <div className="login-mobile-logo">
            <Logo className="login-mobile-logo-img" />
          </div>

          <div className="login-heading">
            <span className="login-welcome-label">WELCOME BACK</span>
            <h2>Sign in to your account</h2>
            <p>Enter your mobile number and 6-digit PIN to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="mobile">Mobile number</label>

            <div className="pin-input-wrapper">
              <Smartphone size={18} />
              <input
                id="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="username"
                maxLength={16}
                placeholder="Enter your mobile number"
                value={mobile}
                onChange={(event) => {
                  setMobile(event.target.value.replace(/[^\d+]/g, ""));
                  setError("");
                }}
                disabled={submitting}
                autoFocus
              />
            </div>

            <label htmlFor="pin" className="login-second-label">
              Security PIN
            </label>

            <div className="pin-input-wrapper">
              <LockKeyhole size={18} />
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={6}
                placeholder="Enter your 6-digit PIN"
                value={pin}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, "");
                  setPin(value.slice(0, 6));
                  setError("");
                }}
                disabled={submitting}
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button
              type="submit"
              className="login-submit-button"
              disabled={submitting || mobile.length < 10 || pin.length < 6}
            >
              {submitting ? (
                <>
                  <LoaderCircle size={18} className="spin-icon" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="login-forgot">
            <Link to="/forgot-pin">Forgot PIN? (owner)</Link>
          </p>

          {needsSetup && (
            <div className="login-setup-note">
              <strong>First time here?</strong>
              <span>
                No owner account exists yet.{" "}
                <Link to="/setup">Create the owner account</Link>
              </span>
            </div>
          )}

          <div className="login-security-note">
            <ShieldCheck size={16} />
            <span>Your session is secured with encrypted authentication.</span>
          </div>
        </div>

        <div className="login-footer">
          © {new Date().getFullYear()} Jira Enterprises. All rights reserved.
        </div>
      </div>
    </div>
  );
}
