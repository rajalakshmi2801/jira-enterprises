import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { KeyRound, LoaderCircle } from "lucide-react";

import { useAuth } from "./useAuth";
import { resetOwnerPin } from "./auth.service";
import { getErrorMessage } from "../../lib/format";
import Logo from "../../components/Logo";
import { Field, FormError } from "../../components/ui";

/** Owner recovery: reset a forgotten PIN with the backend setup secret. */
export default function ForgotPinPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    mobile: "",
    newPin: "",
    confirmPin: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\+?[0-9]{10,15}$/.test(form.mobile.trim())) {
      setError("Enter the owner's mobile number (10 to 15 digits).");
      return;
    }
    if (!/^\d{6}$/.test(form.newPin)) {
      setError("The new PIN must be exactly 6 digits.");
      return;
    }
    if (form.newPin !== form.confirmPin) {
      setError("The two PIN entries do not match.");
      return;
    }
    setSubmitting(true);

    try {
      await resetOwnerPin({
        mobile: form.mobile,
        newPin: form.newPin,
      });

      toast.success("PIN reset. Please sign in with your new PIN.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to reset the PIN."));
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

        <div className="login-heading setup-heading">
          <span className="login-welcome-label">OWNER RECOVERY</span>
          <h2>Reset your PIN</h2>
          <p>
            Enter the owner mobile number and choose a new PIN. Viewers should
            ask the owner to reset their PIN from the Users page.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="ui-form-grid">
            <Field label="Owner mobile number" required span={2}>
              <input
                type="tel"
                value={form.mobile}
                onChange={(e) =>
                  update("mobile", e.target.value.replace(/[^\d+]/g, ""))
                }
                maxLength={16}
                autoFocus
              />
            </Field>

            <Field label="New 6-digit PIN" required>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={form.newPin}
                onChange={(e) =>
                  update("newPin", e.target.value.replace(/\D/g, ""))
                }
              />
            </Field>

            <Field label="Confirm new PIN" required>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={form.confirmPin}
                onChange={(e) =>
                  update("confirmPin", e.target.value.replace(/\D/g, ""))
                }
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
                Resetting...
              </>
            ) : (
              <>
                <KeyRound size={18} />
                Reset PIN
              </>
            )}
          </button>

          <p className="setup-back">
            Remembered it? <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
