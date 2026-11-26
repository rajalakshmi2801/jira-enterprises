import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  IndianRupee,
  Percent,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  StatCard,
} from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import {
  firstOf,
  formatCurrency,
  formatDate,
  toDateInput,
} from "../../lib/format";
import { customerLabel } from "../../lib/names";
import { paidOf, salesApi, type Sale } from "../../services/business.api";

type PayFilter = "all" | "paid" | "pending";

function statusOf(sale: Sale) {
  const pending = Number(sale.total_amount) - paidOf(sale);

  if (pending <= 0) return <Badge tone="green">Paid</Badge>;
  if (paidOf(sale) > 0) return <Badge tone="orange">Part paid</Badge>;

  return <Badge tone="red">Credit</Badge>;
}

export default function InvoicesPage() {
  const { data, loading, error, reload } = useAsync(
    () => salesApi.list(300),
    []
  );

  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState<PayFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const sales = useMemo(
    () => (data ?? []).filter((sale) => sale.status === "completed"),
    [data]
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const pending = Number(sale.total_amount) - paidOf(sale);

      if (payFilter === "paid" && pending > 0) return false;
      if (payFilter === "pending" && pending <= 0) return false;

      const day = toDateInput(new Date(sale.sale_date));

      if (from && day < from) return false;
      if (to && day > to) return false;

      if (!keyword) return true;

      return (
        (sale.invoice_number ?? "").toLowerCase().includes(keyword) ||
        customerLabel(sale.customers).toLowerCase().includes(keyword)
      );
    });
  }, [sales, search, payFilter, from, to]);

  const billed = filtered.reduce((total, sale) => total + Number(sale.total_amount), 0);
  const gst = filtered.reduce((total, sale) => total + Number(sale.gst_amount ?? 0), 0);

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="BILLING"
        title="Invoices"
        description="Generate and print the GST tax invoice for any sale."
        actions={
          <button className="ui-btn ui-btn-outline" onClick={reload}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />

      <div className="ui-stats">
        <StatCard
          icon={<FileText size={21} />}
          label="Invoices"
          value={filtered.length}
        />
        <StatCard
          tone="green"
          icon={<IndianRupee size={21} />}
          label="Total billed"
          value={formatCurrency(billed)}
          hint="including GST"
        />
        <StatCard
          tone="purple"
          icon={<Percent size={21} />}
          label="GST collected"
          value={formatCurrency(gst)}
        />
      </div>

      <Panel
        title="All invoices"
        subtitle="Create a sale first (Sales → New sale), then generate its invoice here"
      >
        <div className="ui-toolbar">
          <div className="ui-search">
            <Search size={16} />
            <input
              placeholder="Search invoice or customer..."
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

          <select
            className="ui-select-inline"
            value={payFilter}
            onChange={(e) => setPayFilter(e.target.value as PayFilter)}
          >
            <option value="all">All payments</option>
            <option value="paid">Fully paid</option>
            <option value="pending">Pending / credit</option>
          </select>

          <input
            type="date"
            className="ui-select-inline"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
          />
          <input
            type="date"
            className="ui-select-inline"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
          />
        </div>

        {loading && !data ? (
          <LoadingState text="Loading invoices..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No invoices found"
            text={
              sales.length === 0
                ? "Invoices appear here after you record a sale."
                : "Try changing the search or filters."
            }
          />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th className="ui-num">GST</th>
                  <th className="ui-num">Total</th>
                  <th>Payment</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => {
                  const customer = firstOf(sale.customers);

                  return (
                    <tr key={sale.id}>
                      <td className="ui-strong">
                        {sale.invoice_number || sale.id.slice(0, 8)}
                      </td>
                      <td>{formatDate(sale.sale_date)}</td>
                      <td>
                        <span className="ui-strong">
                          {customerLabel(sale.customers)}
                        </span>
                        {customer?.gst_number && (
                          <span className="ui-sub">GSTIN {customer.gst_number}</span>
                        )}
                      </td>
                      <td className="ui-num">
                        {Number(sale.gst_amount ?? 0) > 0
                          ? formatCurrency(sale.gst_amount)
                          : "-"}
                      </td>
                      <td className="ui-num ui-strong">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td>{statusOf(sale)}</td>
                      <td>
                        <div className="ui-row-actions">
                          <Link
                            to={`/invoices/${sale.id}`}
                            className="ui-btn ui-btn-primary ui-btn-sm"
                          >
                            <FileText size={14} />
                            Generate invoice
                          </Link>
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
    </div>
  );
}
