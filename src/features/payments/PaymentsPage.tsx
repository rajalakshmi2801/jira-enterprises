import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Banknote,
  IndianRupee,
  RefreshCw,
  Smartphone,
  Wallet,
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
  Tabs,
} from "../../components/ui";
import { useAuth } from "../auth/useAuth";
import { useAsync } from "../../lib/useAsync";
import {
  dateInputToIso,
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
  roundMoney,
  toDateInput,
} from "../../lib/format";
import { customerLabel } from "../../lib/names";
import {
  paidOf,
  salesApi,
  type CustomerOutstanding,
  type PaymentMethod,
} from "../../services/business.api";

type TabId = "outstanding" | "history";

/* =========================================
   COLLECT FROM A CUSTOMER (oldest invoice first)
========================================= */

function CollectFromCustomer({
  row,
  onClose,
  onSaved,
}: {
  row: CustomerOutstanding;
  onClose: () => void;
  onSaved: () => void;
}) {
  const name = customerLabel(row.customer);

  const { data: sales, loading, error, reload } = useAsync(
    () => salesApi.customerSales(row.customer_id),
    [row.customer_id]
  );

  const pendingSales = useMemo(
    () =>
      (sales ?? [])
        .filter((sale) => sale.status === "completed")
        .map((sale) => ({
          ...sale,
          pending: roundMoney(Number(sale.total_amount) - paidOf(sale)),
        }))
        .filter((sale) => sale.pending > 0)
        .sort(
          (a, b) =>
            new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
        ),
    [sales]
  );

  const totalPending = roundMoney(
    pendingSales.reduce((total, sale) => total + sale.pending, 0)
  );

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [date, setDate] = useState(toDateInput());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const entered = amount === "" ? totalPending : Number(amount);

  // Preview: how the amount is spread across invoices.
  const allocation = useMemo(() => {
    let remaining = Number.isFinite(entered) ? roundMoney(entered) : 0;
    const result: Array<{
      sale: (typeof pendingSales)[number];
      take: number;
    }> = [];

    for (const sale of pendingSales) {
      const take = Math.min(remaining, sale.pending);

      remaining = roundMoney(remaining - take);

      if (take > 0) {
        result.push({ sale, take: roundMoney(take) });
      }
    }

    return result;
  }, [pendingSales, entered]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!Number.isFinite(entered) || entered <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    if (roundMoney(entered) > totalPending) {
      setFormError(
        `The amount cannot be more than the total pending ${formatCurrency(totalPending)}.`
      );
      return;
    }

    setSaving(true);

    let done = 0;

    try {
      for (const item of allocation) {
        await salesApi.collectPayment({
          sale_id: item.sale.id,
          amount: item.take,
          payment_method: method,
          payment_date: date === toDateInput() ? undefined : dateInputToIso(date),
          transaction_reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        done += 1;
      }

      toast.success(`${formatCurrency(entered)} received from ${name}.`);
      onSaved();
    } catch (err) {
      const message = getErrorMessage(err, "Unable to record the payment.");

      if (done > 0) {
        toast.error(
          `${done} invoice payment(s) were saved before an error occurred. Please refresh and check.`
        );
        onSaved();
      } else {
        setFormError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Collect payment"
      subtitle={`${name} owes ${formatCurrency(row.outstanding_amount)}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ui-btn ui-btn-success"
            onClick={submit}
            disabled={saving || loading || pendingSales.length === 0}
          >
            {saving ? "Saving..." : "Record payment"}
          </button>
        </>
      }
    >
      {loading && !sales ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : pendingSales.length === 0 ? (
        <EmptyState title="Nothing pending" text="This customer has no unpaid invoices." />
      ) : (
        <form onSubmit={submit}>
          <div className="ui-form-grid">
            <Field
              label="Amount received (₹)"
              required
              hint={`Leave empty to collect the full ${formatCurrency(totalPending)}`}
            >
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder={String(totalPending)}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setFormError("");
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

            <Field label="Received by">
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

            {method === "upi" ? (
              <Field label="UPI reference">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="UTR / reference number"
                />
              </Field>
            ) : (
              <Field label="Notes">
                <input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            )}
            <button type="submit" hidden />
          </div>

          <h4 style={{ margin: "22px 0 10px" }}>
            Applied to invoices (oldest first)
          </h4>

          <div className="ui-table-wrap">
            <table className="ui-table" style={{ minWidth: 480 }}>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th className="ui-num">Pending</th>
                  <th className="ui-num">This payment</th>
                </tr>
              </thead>
              <tbody>
                {pendingSales.map((sale) => {
                  const take =
                    allocation.find((item) => item.sale.id === sale.id)?.take ?? 0;

                  return (
                    <tr key={sale.id}>
                      <td className="ui-strong">
                        {sale.invoice_number || sale.id.slice(0, 8)}
                      </td>
                      <td>{formatDate(sale.sale_date)}</td>
                      <td className="ui-num">{formatCurrency(sale.pending)}</td>
                      <td
                        className={`ui-num ${take > 0 ? "ui-positive" : ""}`}
                      >
                        {take > 0 ? formatCurrency(take) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </form>
      )}

      <FormError message={formError} />
    </Modal>
  );
}

/* =========================================
   PAGE
========================================= */

export default function PaymentsPage() {
  const { isOwner } = useAuth();
  const [tab, setTab] = useState<TabId>("outstanding");
  const [methodFilter, setMethodFilter] = useState<"all" | PaymentMethod>("all");
  const [collecting, setCollecting] = useState<CustomerOutstanding | null>(null);

  const outstanding = useAsync(() => salesApi.outstanding(), []);
  const sales = useAsync(() => salesApi.list(300), []);

  function reloadAll() {
    outstanding.reload();
    sales.reload();
  }

  const rows = useMemo(
    () =>
      [...(outstanding.data ?? [])].sort(
        (a, b) => b.outstanding_amount - a.outstanding_amount
      ),
    [outstanding.data]
  );

  const totalPending = rows.reduce(
    (total, row) => total + row.outstanding_amount,
    0
  );

  const payments = useMemo(
    () =>
      (sales.data ?? [])
        .flatMap((sale) =>
          sale.payments.map((payment) => ({
            ...payment,
            invoice: sale.invoice_number || sale.id.slice(0, 8),
            customer: customerLabel(sale.customers),
          }))
        )
        .filter((payment) => methodFilter === "all" || payment.payment_method === methodFilter)
        .sort(
          (a, b) =>
            new Date(b.payment_date).getTime() -
            new Date(a.payment_date).getTime()
        ),
    [sales.data, methodFilter]
  );

  const today = toDateInput();
  const todayTotal = payments
    .filter((payment) => toDateInput(new Date(payment.payment_date)) === today)
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const cashTotal = payments
    .filter((payment) => payment.payment_method === "cash")
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const upiTotal = payments
    .filter((payment) => payment.payment_method === "upi")
    .reduce((total, payment) => total + Number(payment.amount), 0);

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="CREDIT & COLLECTIONS"
        title="Payments & Credit"
        description="See which shops still owe money and record cash or UPI payments."
        actions={
          <button className="ui-btn ui-btn-outline" onClick={reloadAll}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />

      <div className="ui-stats">
        <StatCard
          tone="red"
          icon={<Wallet size={21} />}
          label="Total credit pending"
          value={formatCurrency(totalPending)}
          hint={`${rows.length} customer(s)`}
        />
        <StatCard
          tone="green"
          icon={<IndianRupee size={21} />}
          label="Collected today"
          value={formatCurrency(todayTotal)}
        />
        <StatCard
          icon={<Banknote size={21} />}
          label="Cash received"
          value={formatCurrency(cashTotal)}
          hint="in the loaded history"
        />
        <StatCard
          tone="purple"
          icon={<Smartphone size={21} />}
          label="UPI received"
          value={formatCurrency(upiTotal)}
          hint="in the loaded history"
        />
      </div>

      <Tabs<TabId>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "outstanding", label: "Customers who owe" },
          { id: "history", label: "Payment history" },
        ]}
      />

      {tab === "outstanding" ? (
        <Panel
          title="Outstanding balances"
          subtitle="Highest balance first"
        >
          {outstanding.loading && !outstanding.data ? (
            <LoadingState />
          ) : outstanding.error ? (
            <ErrorState message={outstanding.error} onRetry={outstanding.reload} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No pending credit"
              text="Every customer has paid in full."
            />
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th className="ui-num">Total sales</th>
                    <th className="ui-num">Paid</th>
                    <th className="ui-num">Outstanding</th>
                    {isOwner && <th />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const customer = Array.isArray(row.customer)
                      ? row.customer[0]
                      : row.customer;

                    return (
                      <tr key={row.customer_id}>
                        <td>
                          <span className="ui-strong">
                            {customerLabel(row.customer)}
                          </span>
                          {customer?.shop_name && (
                            <span className="ui-sub">{customer.customer_name}</span>
                          )}
                        </td>
                        <td>{customer?.mobile || "-"}</td>
                        <td className="ui-num">{formatCurrency(row.total_sales)}</td>
                        <td className="ui-num">{formatCurrency(row.total_paid)}</td>
                        <td className="ui-num">
                          <Badge tone="red">
                            {formatCurrency(row.outstanding_amount)}
                          </Badge>
                        </td>
                        {isOwner && (
                          <td>
                            <div className="ui-row-actions">
                              <button
                                className="ui-btn ui-btn-success ui-btn-sm"
                                onClick={() => setCollecting(row)}
                              >
                                <Wallet size={13} />
                                Collect
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : (
        <Panel
          title="Payment history"
          subtitle="Latest payments from your most recent 300 sales"
          actions={
            <select
              className="ui-select-inline"
              value={methodFilter}
              onChange={(e) =>
                setMethodFilter(e.target.value as "all" | PaymentMethod)
              }
            >
              <option value="all">Cash & UPI</option>
              <option value="cash">Cash only</option>
              <option value="upi">UPI only</option>
            </select>
          }
        >
          {sales.loading && !sales.data ? (
            <LoadingState />
          ) : sales.error ? (
            <ErrorState message={sales.error} onRetry={sales.reload} />
          ) : payments.length === 0 ? (
            <EmptyState title="No payments recorded yet" />
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Invoice</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th className="ui-num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDateTime(payment.payment_date)}</td>
                      <td className="ui-strong">{payment.customer}</td>
                      <td>{payment.invoice}</td>
                      <td>
                        <Badge
                          tone={payment.payment_method === "upi" ? "purple" : "blue"}
                        >
                          {payment.payment_method.toUpperCase()}
                        </Badge>
                      </td>
                      <td>{payment.transaction_reference || "-"}</td>
                      <td className="ui-num ui-positive">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {collecting && (
        <CollectFromCustomer
          row={collecting}
          onClose={() => setCollecting(null)}
          onSaved={() => {
            setCollecting(null);
            reloadAll();
          }}
        />
      )}
    </div>
  );
}
