import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";

import { useAuth } from "./useAuth";
import { getSetupStatus, setupOwner } from "./auth.service";
import { getErrorMessage } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import Logo from "../../components/Logo";
import { Field, FormError, LoadingState } from "../../components/ui";

/** One-time screen where the business owner creates their account + PIN. */
export default function SetupPage() {
  const { isAuthenticated, refresh } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    ownerName: "",
    email: "",
    mobile: "",
    pin: "",
    confirmPin: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: needsSetup, loading } = useAsync(
    () => getSetupStatus().catch(() => true),
    []
  );

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.ownerName.trim()) {
      setError("Please enter the owner name.");
      return;
    }

    if (!/^\+?[0-9]{10,15}$/.test(form.mobile.trim())) {
      setError("Please enter a valid mobile number (10 to 15 digits).");
      return;
    }

    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Please enter a valid email address or leave it empty.");
      return;
    }

    if (!/^\d{6}$/.test(form.pin)) {
      setError("The PIN must be exactly 6 digits.");
      return;
    }

    if (form.pin !== form.confirmPin) {
      setError("The two PIN entries do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await setupOwner({
        ownerName: form.ownerName.trim(),
        email: form.email.trim() || undefined,
        mobile: form.mobile.trim(),
        pin: form.pin,
      });

      // The backend starts a session; pick it up and open the dashboard.
      await refresh();
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Owner setup failed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="setup-logo">
          <Logo />
        </div>

        {loading ? (
          <LoadingState text="Checking setup status..." />
        ) : needsSetup === false ? (
          <div className="setup-done">
            <ShieldCheck size={34} />
            <h2>Setup already completed</h2>
            <p>
              The owner account has already been created. Please sign in with
              your mobile number and PIN.
            </p>
            <Link to="/login" className="login-submit-button setup-link">
              Go to sign in
              <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <>
            <div className="login-heading setup-heading">
              <span className="login-welcome-label">FIRST-TIME SETUP</span>
              <h2>Create the owner account</h2>
              <p>
                You are the business owner with full access. You can add
                view-only users later from the Users page.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="ui-form-grid">
                <Field label="Owner name" required>
                  <input
                    value={form.ownerName}
                    onChange={(e) => update("ownerName", e.target.value)}
                    placeholder="Your full name"
                    autoFocus
                  />
                </Field>

                <Field label="Mobile number" required hint="Used to sign in">
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) =>
                      update("mobile", e.target.value.replace(/[^\d+]/g, ""))
                    }
                    placeholder="10-digit mobile number"
                    maxLength={16}
                  />
                </Field>

                <Field label="Email (optional)" span={2}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>

                <Field label="Create 6-digit PIN" required>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pin}
                    onChange={(e) =>
                      update("pin", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="------"
                  />
                </Field>

                <Field label="Confirm PIN" required>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.confirmPin}
                    onChange={(e) =>
                      update("confirmPin", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="------"
                  />
                </Field>

              </div>

              <FormError message={error} />

              <button
                type="submit"
                className="login-submit-button setup-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <LoaderCircle size={18} className="spin-icon" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <KeyRound size={18} />
                    Create owner account
                  </>
                )}
              </button>

              <p className="setup-back">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
