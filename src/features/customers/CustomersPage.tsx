import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Eye,
  IndianRupee,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";

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
  formatCurrency,
  formatDate,
  getErrorMessage,
} from "../../lib/format";
import {
  customersApi,
  salesApi,
  paidOf,
  type Customer,
  type CustomerInput,
} from "../../services/business.api";

const emptyForm = {
  customer_name: "",
  shop_name: "",
  mobile: "",
  address: "",
  notes: "",
};

type FormState = typeof emptyForm;

/* =========================================
   ADD / EDIT MODAL
========================================= */

function CustomerForm({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    customer
      ? {
          customer_name: customer.customer_name,
          shop_name: customer.shop_name ?? "",
          mobile: customer.mobile ?? "",
          address: customer.address ?? "",
          notes: customer.notes ?? "",
        }
      : emptyForm
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.customer_name.trim()) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);

    try {
      if (customer) {
        const input: CustomerInput = {
          customer_name: form.customer_name.trim(),
          shop_name: form.shop_name.trim() || null,
          mobile: form.mobile.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        };

        await customersApi.update(customer.id, input);
        toast.success("Customer updated.");
      } else {
        const input: CustomerInput = {
          customer_name: form.customer_name.trim(),
          ...(form.shop_name.trim() && { shop_name: form.shop_name.trim() }),
          ...(form.mobile.trim() && { mobile: form.mobile.trim() }),
          ...(form.address.trim() && { address: form.address.trim() }),
          ...(form.notes.trim() && { notes: form.notes.trim() }),
        };

        await customersApi.create(input);
        toast.success("Customer added.");
      }

      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save customer."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={customer ? "Edit customer" : "Add customer"}
      subtitle="Shops and retailers you sell cases to"
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
            {saving ? "Saving..." : customer ? "Save changes" : "Add customer"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="ui-form-grid">
        <Field label="Customer name" required>
          <input
            value={form.customer_name}
            onChange={(e) => update("customer_name", e.target.value)}
            autoFocus
          />
        </Field>

        <Field label="Shop name">
          <input
            value={form.shop_name}
            onChange={(e) => update("shop_name", e.target.value)}
          />
        </Field>

        <Field label="Mobile number" span={2}>
          <input
            type="tel"
            value={form.mobile}
            onChange={(e) => update("mobile", e.target.value)}
          />
        </Field>

        <Field label="Address" span={2}>
          <textarea
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </Field>

        <Field label="Notes" span={2}>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>

        <button type="submit" hidden />
      </form>

      <FormError message={error} />
    </Modal>
  );
}

/* =========================================
   DETAILS MODAL
========================================= */

function CustomerDetails({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const { data: credit } = useAsync(
    () => customersApi.credit(customer.id),
    [customer.id]
  );
  const { data: sales, loading, error } = useAsync(
    () => salesApi.customerSales(customer.id),
    [customer.id]
  );

  return (
    <Modal
      title={customer.shop_name || customer.customer_name}
      subtitle={customer.shop_name ? customer.customer_name : undefined}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Link to="/payments" className="ui-btn ui-btn-outline">
            <Wallet size={15} />
            Go to payments
          </Link>
          <button className="ui-btn ui-btn-primary" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="ui-stats" style={{ marginBottom: 20 }}>
        <StatCard
          icon={<IndianRupee size={20} />}
          label="Total sales"
          value={formatCurrency(credit?.total_sales)}
        />
        <StatCard
          tone="green"
          icon={<IndianRupee size={20} />}
          label="Total paid"
          value={formatCurrency(credit?.total_paid)}
        />
        <StatCard
          tone={credit && credit.outstanding_amount > 0 ? "red" : "green"}
          icon={<Wallet size={20} />}
          label="Outstanding"
          value={formatCurrency(credit?.outstanding_amount)}
        />
      </div>

      <div className="ui-kv">
        <span>Mobile</span>
        <strong>{customer.mobile || "-"}</strong>
      </div>
      <div className="ui-kv">
        <span>Address</span>
        <strong>{customer.address || "-"}</strong>
      </div>
      {customer.notes && (
        <div className="ui-kv">
          <span>Notes</span>
          <strong>{customer.notes}</strong>
        </div>
      )}

      <h4 style={{ margin: "22px 0 10px" }}>Sales history</h4>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : !sales || sales.length === 0 ? (
        <EmptyState title="No sales yet" />
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th className="ui-num">Total</th>
                <th className="ui-num">Paid</th>
                <th className="ui-num">Pending</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const paid = paidOf(sale);
                const pending = Number(sale.total_amount) - paid;

                return (
                  <tr key={sale.id}>
                    <td className="ui-strong">
                      {sale.invoice_number || sale.id.slice(0, 8)}
                    </td>
                    <td>{formatDate(sale.sale_date)}</td>
                    <td className="ui-num">
                      {formatCurrency(sale.total_amount)}
                    </td>
                    <td className="ui-num">{formatCurrency(paid)}</td>
                    <td
                      className={`ui-num ${
                        pending > 0 ? "ui-negative" : "ui-positive"
                      }`}
                    >
                      {pending > 0 ? formatCurrency(pending) : "Paid"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

/* =========================================
   PAGE
========================================= */

export default function CustomersPage() {
  const { isOwner } = useAuth();

  const { data: customers, loading, error, reload } = useAsync(
    () => customersApi.list(),
    []
  );
  const { data: outstanding, reload: reloadOutstanding } = useAsync(
    () => salesApi.outstanding().catch(() => []),
    []
  );

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);

  const outstandingMap = useMemo(() => {
    const map = new Map<string, number>();

    (outstanding ?? []).forEach((row) =>
      map.set(row.customer_id, row.outstanding_amount)
    );

    return map;
  }, [outstanding]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return customers ?? [];

    return (customers ?? []).filter((customer) =>
      [customer.customer_name, customer.shop_name, customer.mobile]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [customers, search]);

  const totalOutstanding = (outstanding ?? []).reduce(
    (total, row) => total + row.outstanding_amount,
    0
  );

  async function deactivate(customer: Customer) {
    const name = customer.shop_name || customer.customer_name;

    if (
      !window.confirm(
        `Remove "${name}" from your active customers? Their past sales stay in your records.`
      )
    ) {
      return;
    }

    try {
      await customersApi.deactivate(customer.id);
      toast.success("Customer removed.");
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function refreshAll() {
    reload();
    reloadOutstanding();
  }

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="CUSTOMER MANAGEMENT"
        title="Customers"
        description="Shops and retailers you supply, with their credit balance."
        actions={
          <>
            <button className="ui-btn ui-btn-outline" onClick={refreshAll}>
              <RefreshCw size={15} />
              Refresh
            </button>
            {isOwner && (
              <button
                className="ui-btn ui-btn-primary"
                onClick={() => setEditing("new")}
              >
                <Plus size={16} />
                Add customer
              </button>
            )}
          </>
        }
      />

      <div className="ui-stats">
        <StatCard
          icon={<Users size={21} />}
          label="Active customers"
          value={customers?.length ?? 0}
        />
        <StatCard
          tone="red"
          icon={<Wallet size={21} />}
          label="Total credit pending"
          value={formatCurrency(totalOutstanding)}
          hint={`${outstanding?.length ?? 0} customer(s) owe money`}
        />
      </div>

      <Panel
        title="Customer list"
        subtitle="Search by name, shop or mobile number"
      >
        <div className="ui-toolbar">
          <div className="ui-search">
            <Search size={16} />
            <input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="ui-icon-btn"
                style={{ border: 0, width: 24, height: 24 }}
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {loading && !customers ? (
          <LoadingState text="Loading customers..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No matching customers" : "No customers yet"}
            text={
              search
                ? "Try a different search."
                : isOwner
                  ? "Add your first shop to start recording sales."
                  : "Customers added by the owner will appear here."
            }
          />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Address</th>
                  <th className="ui-num">Outstanding</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => {
                  const due = outstandingMap.get(customer.id) ?? 0;

                  return (
                    <tr key={customer.id}>
                      <td>
                        <span className="ui-strong">
                          {customer.shop_name || customer.customer_name}
                        </span>
                        {customer.shop_name && (
                          <span className="ui-sub">
                            {customer.customer_name}
                          </span>
                        )}
                      </td>
                      <td>
                        {customer.mobile ? (
                          <a href={`tel:${customer.mobile}`}>
                            <Phone
                              size={13}
                              style={{ verticalAlign: "-2px", marginRight: 5 }}
                            />
                            {customer.mobile}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{customer.address || "-"}</td>
                      <td className="ui-num">
                        {due > 0 ? (
                          <Badge tone="red">{formatCurrency(due)}</Badge>
                        ) : (
                          <Badge tone="green">Clear</Badge>
                        )}
                      </td>
                      <td>
                        <div className="ui-row-actions">
                          <button
                            className="ui-icon-btn"
                            title="View details"
                            onClick={() => setViewing(customer)}
                          >
                            <Eye size={15} />
                          </button>
                          {isOwner && (
                            <>
                              <button
                                className="ui-icon-btn"
                                title="Edit"
                                onClick={() => setEditing(customer)}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                className="ui-icon-btn ui-danger"
                                title="Remove"
                                onClick={() => deactivate(customer)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && (
        <CustomerForm
          customer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refreshAll();
          }}
        />
      )}

      {viewing && (
        <CustomerDetails
          customer={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
