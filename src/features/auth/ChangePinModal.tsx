import { useState } from "react";
import toast from "react-hot-toast";

import { Field, FormError, Modal } from "../../components/ui";
import { getErrorMessage } from "../../lib/format";
import { changePin } from "./auth.service";

/** Lets the signed-in user change their own PIN without being signed out. */
export default function ChangePinModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const digits = (setter: (value: string) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value.replace(/\D/g, "").slice(0, 6));
      setError("");
    };

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!/^\d{6}$/.test(current)) {
      setError("Enter your current 6-digit PIN.");
      return;
    }
    if (!/^\d{6}$/.test(next)) {
      setError("The new PIN must be exactly 6 digits.");
      return;
    }
    if (next === current) {
      setError("The new PIN must be different from the current PIN.");
      return;
    }
    if (next !== confirm) {
      setError("The two new PIN entries do not match.");
      return;
    }

    setSaving(true);

    try {
      await changePin(current, next);
      toast.success("PIN changed. Other devices have been signed out.");
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to change PIN."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Change my PIN"
      subtitle="You stay signed in on this device"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ui-btn ui-btn-primary"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Change PIN"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="ui-form-grid">
        <Field label="Current PIN" required span={2}>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={current}
            onChange={digits(setCurrent)}
            autoFocus
          />
        </Field>
        <Field label="New 6-digit PIN" required span={2}>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={next}
            onChange={digits(setNext)}
          />
        </Field>
        <Field label="Confirm new PIN" required span={2}>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={confirm}
            onChange={digits(setConfirm)}
          />
        </Field>
        <button type="submit" hidden />
      </form>

      <FormError message={error} />
    </Modal>
  );
}
