import { useState } from "react";
import toast from "react-hot-toast";

import { Field, FormError, Modal } from "../../components/ui";
import {
  dateInputToIso,
  formatCurrency,
  getErrorMessage,
  roundMoney,
  toDateInput,
} from "../../lib/format";
import { salesApi, type PaymentMethod } from "../../services/business.api";

/** Records a payment against one sale (used by Sales and Payments pages). */
export default function CollectPaymentModal({
  saleId,
  invoice,
  customerName,
  pending,
  onClose,
  onSaved,
}: {
  saleId: string;
  invoice: string;
  customerName: string;
  pending: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(roundMoney(pending)));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [date, setDate] = useState(toDateInput());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (roundMoney(value) > roundMoney(pending)) {
      setError(`The amount cannot be more than the pending ${formatCurrency(pending)}.`);
      return;
    }

    setSaving(true);

    try {
      await salesApi.collectPayment({
        sale_id: saleId,
        amount: roundMoney(value),
        payment_method: method,
        payment_date: date === toDateInput() ? undefined : dateInputToIso(date),
        transaction_reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success("Payment recorded.");
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to record payment."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Collect payment"
      subtitle={`${customerName} · ${invoice}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ui-btn ui-btn-success"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Record payment"}
          </button>
        </>
      }
    >
      <div className="ui-hint-box" style={{ marginBottom: 16 }}>
        Pending on this invoice: <b>{formatCurrency(pending)}</b>
      </div>

      <form onSubmit={submit} className="ui-form-grid">
        <Field label="Amount received (₹)" required>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            autoFocus
          />
        </Field>

        <Field label="Payment date">
          <input
            type="date"
            max={toDateInput()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        <Field label="Received by" span={2}>
          <div className="ui-chip-row">
            {(["cash", "upi"] as PaymentMethod[]).map((option) => (
              <button
                type="button"
                key={option}
                className={`ui-chip ${method === option ? "ui-chip-active" : ""}`}
                onClick={() => setMethod(option)}
              >
                {option === "cash" ? "Cash" : "UPI"}
              </button>
            ))}
          </div>
        </Field>

        {method === "upi" && (
          <Field label="UPI transaction reference" span={2}>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR / reference number"
            />
          </Field>
        )}

        <Field label="Notes" span={2}>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <button type="submit" hidden />
      </form>

      <FormError message={error} />
    </Modal>
  );
}
