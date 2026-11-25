import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Boxes,
  Eye,
  IndianRupee,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
} from "lucide-react";

import {
  EmptyState,
  ErrorState,
  Field,
  FormError,
  LoadingState,
  Modal,
  PageHeader,
  Panel,
  StatCard,
} from "../../components/ui";
import { useAuth } from "../auth/useAuth";
import { useAsync } from "../../lib/useAsync";
import {
  dateInputToIso,
  formatCurrency,
  formatDate,
  formatNumber,
  getErrorMessage,
  roundMoney,
  toDateInput,
} from "../../lib/format";
import {
  inventoryApi,
  purchasesApi,
  type InventoryItem,
  type Purchase,
} from "../../services/business.api";

interface Line {
  variantId: string;
  cases: string;
  price: string;
}

const emptyLine: Line = { variantId: "", cases: "1", price: "" };

/* =========================================
   NEW PURCHASE
========================================= */

function NewPurchaseModal({
  items,
  onClose,
  onSaved,
}: {
  items: InventoryItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [supplier, setSupplier] = useState("");
  const [invoice, setInvoice] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.product_variant_id, item])),
    [items]
  );

  const total = lines.reduce(
    (sum, line) => sum + Number(line.cases || 0) * Number(line.price || 0),
    0
  );
  const totalCases = lines.reduce((sum, line) => sum + Number(line.cases || 0), 0);

  function patch(index: number, change: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...change } : line))
    );
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const cases = Number(line.cases);
      const price = Number(line.price);

      if (!itemMap.has(line.variantId)) {
        setError(`Item ${index + 1}: please choose a product.`);
        return;
      }
      if (!Number.isInteger(cases) || cases <= 0) {
        setError(`Item ${index + 1}: cases must be a whole number above zero.`);
        return;
      }
      if (line.price === "" || !Number.isFinite(price) || price < 0) {
        setError(`Item ${index + 1}: enter a valid purchase price per case.`);
        return;
      }
    }

    setSaving(true);

    try {
      await purchasesApi.create({
        supplier_name: supplier.trim() || undefined,
        invoice_number: invoice.trim() || undefined,
        purchase_date: date === toDateInput() ? undefined : dateInputToIso(date),
        notes: notes.trim() || undefined,
        items: lines.map((line) => ({
          product_variant_id: line.variantId,
          quantity_cases: Number(line.cases),
          purchase_price_per_case: Number(line.price),
        })),
      });

      toast.success("Purchase recorded and stock updated.");
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to record the purchase."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Record purchase"
      subtitle="Cases bought from your supplier. Stock increases automatically."
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
            disabled={saving}
          >
            {saving ? "Saving..." : `Save purchase · ${formatCurrency(total)}`}
          </button>
        </>
      }
    >
      {items.length === 0 ? (
        <div className="ui-hint-box">
          You need at least one active product first. Add products in
          <b> Inventory → Products &amp; prices</b>.
        </div>
      ) : (
        <form onSubmit={submit}>
          <div
            className="ui-form-grid"
            style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}
          >
            <Field label="Supplier / distributor">
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </Field>
            <Field label="Supplier invoice no.">
              <input value={invoice} onChange={(e) => setInvoice(e.target.value)} />
            </Field>
            <Field label="Purchase date">
              <input
                type="date"
                max={toDateInput()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>

          <h4 style={{ margin: "22px 0 10px" }}>Items (cases)</h4>

          <div className="ui-lines">
            {lines.map((line, index) => {
              const item = itemMap.get(line.variantId);

              return (
                <div className="ui-line-item" key={index}>
                  <Field label="Product">
                    <select
                      value={line.variantId}
                      onChange={(e) => {
                        const chosen = itemMap.get(e.target.value);

                        patch(index, {
                          variantId: e.target.value,
                          price: chosen ? String(chosen.landing_price_per_case) : "",
                        });
                      }}
                    >
                      <option value="">Select product...</option>
                      {items.map((option) => (
                        <option
                          key={option.product_variant_id}
                          value={option.product_variant_id}
                        >
                          {option.product_name} · {option.variant_name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Cases"
                    hint={item ? `${item.pieces_per_case} pcs/case` : undefined}
                  >
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={line.cases}
                      onChange={(e) => patch(index, { cases: e.target.value })}
                    />
                  </Field>

                  <Field label="Price / case (₹)">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.price}
                      onChange={(e) => patch(index, { price: e.target.value })}
                    />
                  </Field>

                  <div className="ui-line-total">
                    Amount
                    <strong>
                      {formatCurrency(
                        Number(line.cases || 0) * Number(line.price || 0)
                      )}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="ui-icon-btn ui-danger"
                    style={{ marginBottom: 4 }}
                    disabled={lines.length === 1}
                    onClick={() => setLines(lines.filter((_, i) => i !== index))}
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

          <div style={{ marginTop: 18 }}>
            <Field label="Notes">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>

          <div className="ui-totals">
            <div className="ui-kv">
              <span>Total cases</span>
              <strong>{formatNumber(totalCases)}</strong>
            </div>
            <div className="ui-kv ui-grand">
              <span>Total amount</span>
              <strong>{formatCurrency(roundMoney(total))}</strong>
            </div>
          </div>
          <button type="submit" hidden />
        </form>
      )}

      <FormError message={error} />
    </Modal>
  );
}

/* =========================================
   PAGE
========================================= */

export default function PurchasesPage() {
  const { isOwner } = useAuth();

  const purchases = useAsync(() => purchasesApi.list(300), []);
  const inventory = useAsync(() => inventoryApi.list(), []);

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Purchase | null>(null);

  const names = useMemo(() => {
    const map = new Map<string, string>();

    (inventory.data ?? []).forEach((item) =>
      map.set(item.product_variant_id, `${item.product_name} · ${item.variant_name}`)
    );

    return map;
  }, [inventory.data]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return (purchases.data ?? []).filter(
      (purchase) =>
        !keyword ||
        (purchase.supplier_name ?? "").toLowerCase().includes(keyword) ||
        (purchase.invoice_number ?? "").toLowerCase().includes(keyword)
    );
  }, [purchases.data, search]);

  const totalAmount = filtered.reduce(
    (total, purchase) => total + Number(purchase.total_amount),
    0
  );
  const totalCases = filtered.reduce(
    (total, purchase) =>
      total +
      purchase.items.reduce((sum, item) => sum + Number(item.quantity_cases), 0),
    0
  );

  function reloadAll() {
    purchases.reload();
    inventory.reload();
  }

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="STOCK PURCHASING"
        title="Purchases"
        description="Bulk cases bought from suppliers. Each purchase adds to your stock."
        actions={
          <>
            <button className="ui-btn ui-btn-outline" onClick={reloadAll}>
              <RefreshCw size={15} />
              Refresh
            </button>
            {isOwner && (
              <button
                className="ui-btn ui-btn-primary"
                onClick={() => setCreating(true)}
              >
                <Plus size={16} />
                Record purchase
              </button>
            )}
          </>
        }
      />

      <div className="ui-stats">
        <StatCard
          icon={<Truck size={21} />}
          label="Purchases"
          value={filtered.length}
        />
        <StatCard
          tone="orange"
          icon={<IndianRupee size={21} />}
          label="Amount spent"
          value={formatCurrency(totalAmount)}
        />
        <StatCard
          tone="green"
          icon={<Boxes size={21} />}
          label="Cases purchased"
          value={formatNumber(totalCases)}
        />
      </div>

      <Panel title="Purchase history" subtitle="Newest first">
        <div className="ui-toolbar">
          <div className="ui-search">
            <Search size={16} />
            <input
              placeholder="Search supplier or invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {purchases.loading && !purchases.data ? (
          <LoadingState text="Loading purchases..." />
        ) : purchases.error ? (
          <ErrorState message={purchases.error} onRetry={purchases.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No purchases found"
            text={
              (purchases.data ?? []).length === 0
                ? isOwner
                  ? "Record your first stock purchase to add cases to inventory."
                  : "Purchases recorded by the owner will appear here."
                : "Try a different search."
            }
          />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Invoice</th>
                  <th className="ui-num">Cases</th>
                  <th className="ui-num">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>{formatDate(purchase.purchase_date)}</td>
                    <td className="ui-strong">{purchase.supplier_name || "-"}</td>
                    <td>{purchase.invoice_number || "-"}</td>
                    <td className="ui-num">
                      {purchase.items.reduce(
                        (sum, item) => sum + Number(item.quantity_cases),
                        0
                      )}
                    </td>
                    <td className="ui-num ui-strong">
                      {formatCurrency(purchase.total_amount)}
                    </td>
                    <td>
                      <div className="ui-row-actions">
                        <button
                          className="ui-btn ui-btn-outline ui-btn-sm"
                          onClick={() => setViewing(purchase)}
                        >
                          <Eye size={14} />
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {creating && (
        <NewPurchaseModal
          items={inventory.data ?? []}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reloadAll();
          }}
        />
      )}

      {viewing && (
        <Modal
          title="Purchase details"
          subtitle={viewing.supplier_name ?? undefined}
          size="md"
          onClose={() => setViewing(null)}
          footer={
            <button className="ui-btn ui-btn-primary" onClick={() => setViewing(null)}>
              Close
            </button>
          }
        >
          <div className="ui-kv">
            <span>Date</span>
            <strong>{formatDate(viewing.purchase_date)}</strong>
          </div>
          <div className="ui-kv">
            <span>Supplier invoice</span>
            <strong>{viewing.invoice_number || "-"}</strong>
          </div>
          {viewing.notes && (
            <div className="ui-kv">
              <span>Notes</span>
              <strong>{viewing.notes}</strong>
            </div>
          )}

          <h4 style={{ margin: "20px 0 10px" }}>Items</h4>
          <div className="ui-table-wrap">
            <table className="ui-table" style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="ui-num">Cases</th>
                  <th className="ui-num">Price / case</th>
                  <th className="ui-num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {viewing.items.map((item) => (
                  <tr key={item.id}>
                    <td className="ui-strong">
                      {names.get(item.product_variant_id) ?? "Inactive item"}
                    </td>
                    <td className="ui-num">{item.quantity_cases}</td>
                    <td className="ui-num">
                      {formatCurrency(item.purchase_price_per_case)}
                    </td>
                    <td className="ui-num ui-strong">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ui-totals">
            <div className="ui-kv ui-grand">
              <span>Total</span>
              <strong>{formatCurrency(viewing.total_amount)}</strong>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
