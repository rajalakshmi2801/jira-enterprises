import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";

import {
  ErrorState,
  Field,
  FormError,
  LoadingState,
  Modal,
} from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { computeSaleTax } from "../../lib/gst";
import {
  dateInputToIso,
  formatCurrency,
  getErrorMessage,
  roundMoney,
  toDateInput,
} from "../../lib/format";
import {
  customersApi,
  inventoryApi,
  salesApi,
  type PaymentMethod,
} from "../../services/business.api";

interface Line {
  variantId: string;
  cases: string;
  price: string;
}

type CustomerMode = "existing" | "walkin" | "new";
type PayMode = "full" | "part" | "credit";

const emptyLine: Line = { variantId: "", cases: "1", price: "" };

export default function NewSaleModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (saleId: string) => void;
}) {
  const stock = useAsync(() => inventoryApi.list(), []);
  const customers = useAsync(() => customersApi.list(), []);

  const [customerMode, setCustomerMode] = useState<CustomerMode>("existing");
  const [customerId, setCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    customer_name: "",
    shop_name: "",
    mobile: "",
  });

  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [discount, setDiscount] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("full");
  const [partAmount, setPartAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => stock.data ?? [], [stock.data]);
  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.product_variant_id, item])),
    [items]
  );

  const lineTotal = (line: Line) =>
    Number(line.cases || 0) * Number(line.price || 0);

  const subtotal = lines.reduce((total, line) => total + lineTotal(line), 0);
  const discountValue = Number(discount || 0);
  // GST (CGST + SGST) is added on top of the price, per product rate.
  const tax = computeSaleTax(
    lines.map((line) => ({
      amount: lineTotal(line),
      gstPercent: itemMap.get(line.variantId)?.gst_percent ?? 0,
    })),
    Math.min(Math.max(discountValue, 0), subtotal)
  );
  const grandTotal = tax.total;

  const paidAmount =
    payMode === "full"
      ? grandTotal
      : payMode === "credit"
        ? 0
        : roundMoney(Number(partAmount || 0));

  const pendingAmount = roundMoney(grandTotal - paidAmount);

  function patchLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
    setError("");
  }

  function chooseVariant(index: number, variantId: string) {
    const item = itemMap.get(variantId);

    patchLine(index, {
      variantId,
      price: item ? String(item.mrp_per_case) : "",
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    // ----- items -----
    const used = new Map<string, number>();

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const item = itemMap.get(line.variantId);
      const cases = Number(line.cases);
      const price = Number(line.price);

      if (!item) {
        setError(`Item ${index + 1}: please choose a product.`);
        return;
      }
      if (!Number.isInteger(cases) || cases <= 0) {
        setError(`Item ${index + 1}: cases must be a whole number above zero.`);
        return;
      }
      if (line.price === "" || !Number.isFinite(price) || price < 0) {
        setError(`Item ${index + 1}: enter a valid selling price per case.`);
        return;
      }

      const total = (used.get(line.variantId) ?? 0) + cases;

      if (total > item.available_cases) {
        setError(
          `Not enough stock for ${item.product_name} · ${item.variant_name}. Available: ${item.available_cases} case(s).`
        );
        return;
      }

      used.set(line.variantId, total);
    }

    // ----- money -----
    if (discountValue < 0 || discountValue > subtotal) {
      setError("Discount cannot be negative or more than the subtotal.");
      return;
    }

    if (payMode === "part") {
      const amount = Number(partAmount);

      if (!Number.isFinite(amount) || amount <= 0 || amount >= grandTotal) {
        setError("For a part payment, enter an amount above zero and below the total.");
        return;
      }
    }

    if (pendingAmount > 0 && customerMode === "walkin") {
      setError("Credit sales need a customer. Choose or add the customer.");
      return;
    }

    if (customerMode === "existing" && !customerId) {
      setError("Please choose a customer, or switch to “Walk-in”.");
      return;
    }

    if (customerMode === "new" && !newCustomer.customer_name.trim()) {
      setError("Enter the new customer's name.");
      return;
    }

    setSaving(true);

    try {
      let finalCustomerId: string | null = null;

      if (customerMode === "existing") {
        finalCustomerId = customerId;
      } else if (customerMode === "new") {
        const created = await customersApi.create({
          customer_name: newCustomer.customer_name.trim(),
          ...(newCustomer.shop_name.trim() && {
            shop_name: newCustomer.shop_name.trim(),
          }),
          ...(newCustomer.mobile.trim() && {
            mobile: newCustomer.mobile.trim(),
          }),
        });

        finalCustomerId = created.id;
      }

      const result = await salesApi.create({
        customer_id: finalCustomerId,
        sale_date: date === toDateInput() ? undefined : dateInputToIso(date),
        discount_amount: discountValue > 0 ? discountValue : undefined,
        notes: notes.trim() || undefined,
        items: lines.map((line) => ({
          product_variant_id: line.variantId,
          quantity_cases: Number(line.cases),
          selling_price_per_case: Number(line.price),
        })),
        paid_amount: paidAmount,
        payment_method: paidAmount > 0 ? method : null,
        transaction_reference:
          paidAmount > 0 && method === "upi" && reference.trim()
            ? reference.trim()
            : undefined,
      });

      toast.success(
        pendingAmount > 0
          ? `Sale saved. ${formatCurrency(pendingAmount)} is pending.`
          : "Sale saved."
      );
      onSaved(result.sale_id);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save the sale."));
    } finally {
      setSaving(false);
    }
  }

  const available = items.filter((item) => item.available_cases > 0);

  return (
    <Modal
      title="New sale"
      subtitle="Sell cases to a shop. Stock is reduced automatically."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ui-btn ui-btn-primary"
            onClick={submit}
            disabled={saving || stock.loading}
          >
            {saving ? "Saving..." : `Save sale · ${formatCurrency(grandTotal)}`}
          </button>
        </>
      }
    >
      {stock.loading && !stock.data ? (
        <LoadingState text="Loading products..." />
      ) : stock.error ? (
        <ErrorState message={stock.error} onRetry={stock.reload} />
      ) : available.length === 0 ? (
        <div className="ui-hint-box">
          No product has stock right now. Record a purchase (or opening stock)
          first, then come back to create a sale.
        </div>
      ) : (
        <form onSubmit={submit}>
          {/* ---------- customer ---------- */}
          <h4 style={{ margin: "0 0 10px" }}>1. Customer</h4>

          <div className="ui-chip-row" style={{ marginBottom: 12 }}>
            {(
              [
                ["existing", "Existing customer"],
                ["new", "New customer"],
                ["walkin", "Walk-in (no record)"],
              ] as Array<[CustomerMode, string]>
            ).map(([mode, label]) => (
              <button
                type="button"
                key={mode}
                className={`ui-chip ${customerMode === mode ? "ui-chip-active" : ""}`}
                onClick={() => {
                  setCustomerMode(mode);
                  setError("");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {customerMode === "existing" && (
            <Field label="Customer">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Select a customer...</option>
                {(customers.data ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.shop_name
                      ? `${customer.shop_name} (${customer.customer_name})`
                      : customer.customer_name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {customerMode === "new" && (
            <div className="ui-form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
              <Field label="Customer name" required>
                <input
                  value={newCustomer.customer_name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, customer_name: e.target.value })
                  }
                />
              </Field>
              <Field label="Shop name">
                <input
                  value={newCustomer.shop_name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, shop_name: e.target.value })
                  }
                />
              </Field>
              <Field label="Mobile">
                <input
                  type="tel"
                  value={newCustomer.mobile}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, mobile: e.target.value })
                  }
                />
              </Field>
            </div>
          )}

          {/* ---------- items ---------- */}
          <h4 style={{ margin: "24px 0 10px" }}>2. Items (cases)</h4>

          <div className="ui-lines">
            {lines.map((line, index) => {
              const item = itemMap.get(line.variantId);

              return (
                <div className="ui-line-item" key={index}>
                  <Field label="Product">
                    <select
                      value={line.variantId}
                      onChange={(e) => chooseVariant(index, e.target.value)}
                    >
                      <option value="">Select product...</option>
                      {available.map((option) => (
                        <option
                          key={option.product_variant_id}
                          value={option.product_variant_id}
                        >
                          {option.product_name} · {option.variant_name} — stock{" "}
                          {option.available_cases}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Cases"
                    hint={item ? `Max ${item.available_cases}` : undefined}
                  >
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={line.cases}
                      onChange={(e) => patchLine(index, { cases: e.target.value })}
                    />
                  </Field>

                  <Field
                    label="Price / case (₹)"
                    hint={
                      item
                        ? `Cost ${formatCurrency(item.landing_price_per_case)} · ${
                            item.gst_percent > 0
                              ? `GST ${item.gst_percent}% extra`
                              : "No GST"
                          }`
                        : undefined
                    }
                  >
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.price}
                      onChange={(e) => patchLine(index, { price: e.target.value })}
                    />
                  </Field>

                  <div className="ui-line-total">
                    Amount
                    <strong>{formatCurrency(lineTotal(line))}</strong>
                  </div>

                  <button
                    type="button"
                    className="ui-icon-btn ui-danger"
                    style={{ marginBottom: 4 }}
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines(lines.filter((_, i) => i !== index))
                    }
                    aria-label="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="ui-btn ui-btn-outline ui-btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => setLines([...lines, { ...emptyLine }])}
          >
            <Plus size={14} />
            Add another item
          </button>

          {/* ---------- payment ---------- */}
          <h4 style={{ margin: "24px 0 10px" }}>3. Payment</h4>

          <div className="ui-chip-row" style={{ marginBottom: 14 }}>
            {(
              [
                ["full", "Paid in full"],
                ["part", "Part payment"],
                ["credit", "Credit - pay later"],
              ] as Array<[PayMode, string]>
            ).map(([mode, label]) => (
              <button
                type="button"
                key={mode}
                className={`ui-chip ${payMode === mode ? "ui-chip-active" : ""}`}
                onClick={() => {
                  setPayMode(mode);
                  setError("");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ui-form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            <Field label="Discount (₹)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(e) => {
                  setDiscount(e.target.value);
                  setError("");
                }}
              />
            </Field>

            {payMode === "part" && (
              <Field label="Amount received now (₹)" required>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={partAmount}
                  onChange={(e) => {
                    setPartAmount(e.target.value);
                    setError("");
                  }}
                />
              </Field>
            )}

            {paidAmount > 0 && (
              <Field label="Paid by">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </Field>
            )}

            {paidAmount > 0 && method === "upi" && (
              <Field label="UPI reference">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Transaction ID (optional)"
                />
              </Field>
            )}

            <Field label="Sale date">
              <input
                type="date"
                max={toDateInput()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>

            <Field label="Notes" span={3}>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>

          <div className="ui-totals">
            <div className="ui-kv">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div className="ui-kv">
              <span>Discount</span>
              <strong>- {formatCurrency(discountValue)}</strong>
            </div>
            <div className="ui-kv">
              <span>Taxable value</span>
              <strong>{formatCurrency(tax.taxable)}</strong>
            </div>
            <div className="ui-kv">
              <span>CGST</span>
              <strong>{formatCurrency(tax.gst / 2)}</strong>
            </div>
            <div className="ui-kv">
              <span>SGST</span>
              <strong>{formatCurrency(tax.gst / 2)}</strong>
            </div>
            <div className="ui-kv ui-grand">
              <span>Total (incl. GST)</span>
              <strong>{formatCurrency(grandTotal)}</strong>
            </div>
            <div className="ui-kv">
              <span>Received now</span>
              <strong>{formatCurrency(paidAmount)}</strong>
            </div>
            <div className="ui-kv">
              <span>Pending (credit)</span>
              <strong className={pendingAmount > 0 ? "ui-negative" : "ui-positive"}>
                {formatCurrency(pendingAmount)}
              </strong>
            </div>
          </div>

          <button type="submit" hidden />
        </form>
      )}

      <FormError message={error} />
    </Modal>
  );
}
