import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IndianRupee, Pencil, Plus, Receipt, RefreshCw, Trash2 } from "lucide-react";

import {
  Badge,
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
  getErrorMessage,
  toDateInput,
} from "../../lib/format";
import {
  expensesApi,
  type Expense,
  type PaymentMethod,
} from "../../services/business.api";

const SUGGESTED_CATEGORIES = [
  "Transport",
  "Fuel",
  "Salary",
  "Loading / unloading",
  "Maintenance",
  "Rent",
  "Electricity",
  "Other",
];

function monthStart() {
  const now = new Date();

  return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

/* =========================================
   FORM
========================================= */

function ExpenseForm({
  expense,
  categories,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(expense?.expense_title ?? "");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [date, setDate] = useState(
    expense ? toDateInput(new Date(expense.expense_date)) : toDateInput()
  );
  const [method, setMethod] = useState<PaymentMethod>(
    expense?.payment_method ?? "cash"
  );
  const [description, setDescription] = useState(expense?.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const value = Number(amount);

    if (!title.trim()) {
      setError("Enter what the expense was for.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const input = {
        expense_title: title.trim(),
        category: category.trim() || null,
        amount: value,
        expense_date: dateInputToIso(date),
        payment_method: method,
        description: description.trim() || null,
      };

      if (expense) {
        await expensesApi.update(expense.id, input);
        toast.success("Expense updated.");
      } else {
        await expensesApi.create(input);
        toast.success("Expense added.");
      }

      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save the expense."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={expense ? "Edit expense" : "Add expense"}
      subtitle="Transport, fuel, salary, maintenance and other business costs"
      size="md"
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
            {saving ? "Saving..." : "Save expense"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="ui-form-grid">
        <Field label="Expense title" required span={2}>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            placeholder="e.g. Truck diesel"
            autoFocus
          />
        </Field>

        <Field label="Category">
          <input
            list="expense-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Choose or type"
          />
          <datalist id="expense-categories">
            {categories.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>

        <Field label="Amount (₹)" required>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
          />
        </Field>

        <Field label="Date">
          <input
            type="date"
            max={toDateInput()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        <Field label="Paid by">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </select>
        </Field>

        <Field label="Notes" span={2}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <button type="submit" hidden />
      </form>

      <FormError message={error} />
    </Modal>
  );
}

/* =========================================
   PAGE
========================================= */

export default function ExpensesPage() {
  const { isOwner } = useAuth();

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(toDateInput());
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Expense | "new" | null>(null);

  const { data, loading, error, reload } = useAsync(
    () => expensesApi.list({ from, to }),
    [from, to]
  );

  const expenses = useMemo(() => data ?? [], [data]);

  const categories = useMemo(() => {
    const names = new Set(SUGGESTED_CATEGORIES);

    expenses.forEach((expense) => expense.category && names.add(expense.category));

    return [...names];
  }, [expenses]);

  const filtered = expenses.filter(
    (expense) => !category || (expense.category ?? "Uncategorized") === category
  );

  const total = filtered.reduce((sum, expense) => sum + Number(expense.amount), 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();

    expenses.forEach((expense) => {
      const key = expense.category || "Uncategorized";

      map.set(key, (map.get(key) ?? 0) + Number(expense.amount));
    });

    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const allTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  async function remove(expense: Expense) {
    if (!window.confirm(`Delete the expense "${expense.expense_title}"?`)) return;

    try {
      await expensesApi.remove(expense.id);
      toast.success("Expense deleted.");
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="BUSINESS COSTS"
        title="Expenses"
        description="Track transport, fuel, salary and other costs that reduce your profit."
        actions={
          <>
            <button className="ui-btn ui-btn-outline" onClick={reload}>
              <RefreshCw size={15} />
              Refresh
            </button>
            {isOwner && (
              <button
                className="ui-btn ui-btn-primary"
                onClick={() => setEditing("new")}
              >
                <Plus size={16} />
                Add expense
              </button>
            )}
          </>
        }
      />

      <div className="ui-stats">
        <StatCard
          tone="red"
          icon={<IndianRupee size={21} />}
          label={category ? `${category} expenses` : "Total expenses"}
          value={formatCurrency(total)}
          hint={`${filtered.length} entries`}
        />
        <StatCard
          tone="orange"
          icon={<Receipt size={21} />}
          label="Biggest category"
          value={byCategory[0]?.[0] ?? "-"}
          hint={byCategory[0] ? formatCurrency(byCategory[0][1]) : undefined}
        />
      </div>

      <div className="ui-grid-2" style={{ gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)" }}>
        <Panel title="Expense list">
          <div className="ui-toolbar">
            <input
              type="date"
              className="ui-select-inline"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
            />
            <input
              type="date"
              className="ui-select-inline"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
            />
            <select
              className="ui-select-inline"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {[...new Set([...byCategory.map(([name]) => name)])].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {loading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No expenses in this period"
              text={isOwner ? "Add an expense or change the dates." : undefined}
            />
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Expense</th>
                    <th>Category</th>
                    <th>Paid by</th>
                    <th className="ui-num">Amount</th>
                    {isOwner && <th />}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatDate(expense.expense_date)}</td>
                      <td>
                        <span className="ui-strong">{expense.expense_title}</span>
                        {expense.description && (
                          <span className="ui-sub">{expense.description}</span>
                        )}
                      </td>
                      <td>{expense.category || "-"}</td>
                      <td>
                        {expense.payment_method ? (
                          <Badge
                            tone={expense.payment_method === "upi" ? "purple" : "blue"}
                          >
                            {expense.payment_method.toUpperCase()}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="ui-num ui-strong">
                        {formatCurrency(expense.amount)}
                      </td>
                      {isOwner && (
                        <td>
                          <div className="ui-row-actions">
                            <button
                              className="ui-icon-btn"
                              title="Edit"
                              onClick={() => setEditing(expense)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="ui-icon-btn ui-danger"
                              title="Delete"
                              onClick={() => remove(expense)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="By category" subtitle="Selected period">
          {byCategory.length === 0 ? (
            <EmptyState title="No data" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {byCategory.map(([name, value]) => (
                <div key={name}>
                  <div className="ui-kv" style={{ border: 0, padding: "0 0 6px" }}>
                    <span>{name}</span>
                    <strong>{formatCurrency(value)}</strong>
                  </div>
                  <div className="ui-progress">
                    <div
                      style={{
                        width: `${allTotal ? (value / allTotal) * 100 : 0}%`,
                        background: "#2563eb",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {editing && (
        <ExpenseForm
          expense={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
