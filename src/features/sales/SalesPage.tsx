import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Eye,
  IndianRupee,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Wallet,
  X,
} from "lucide-react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  Panel,
  StatCard,
} from "../../components/ui";
import { useAuth } from "../auth/useAuth";
import { useAsync } from "../../lib/useAsync";
import { customerLabel } from "../../lib/names";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
  toDateInput,
} from "../../lib/format";
import { printInvoice } from "../../lib/invoice";
import {
  paidOf,
  salesApi,
  type Sale,
} from "../../services/business.api";
import CollectPaymentModal from "../payments/CollectPaymentModal";
import NewSaleModal from "./NewSaleModal";

type PayFilter = "all" | "paid" | "pending";

function customerNameOf(sale: Sale) {
  return customerLabel(sale.customers);
}

function PaymentBadge({ sale }: { sale: Sale }) {
  const pending = Number(sale.total_amount) - paidOf(sale);

  if (sale.status === "cancelled") return <Badge tone="gray">Cancelled</Badge>;
  if (pending <= 0) return <Badge tone="green">Paid</Badge>;
  if (paidOf(sale) > 0) return <Badge tone="orange">Part paid</Badge>;

  return <Badge tone="red">Credit</Badge>;
}

/* =========================================
   DETAILS
========================================= */

function SaleDetails({
  saleId,
  onClose,
  onChanged,
}: {
  saleId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { isOwner } = useAuth();
  const { data: sale, loading, error, reload } = useAsync(
    () => salesApi.get(saleId),
    [saleId]
  );
  const [collecting, setCollecting] = useState(false);

  const paid = sale ? paidOf(sale) : 0;
  const pending = sale ? Number(sale.total_amount) - paid : 0;

  function print() {
    if (!sale) return;

    try {
      printInvoice(sale);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Modal
      title="Sale details"
      subtitle={sale?.invoice_number ?? undefined}
      size="lg"
      onClose={onClose}
      footer={
        sale && (
          <>
            <button className="ui-btn ui-btn-outline" onClick={print}>
              <Printer size={15} />
              Print invoice
            </button>
            {isOwner && pending > 0 && sale.status === "completed" && (
              <button
                className="ui-btn ui-btn-success"
                onClick={() => setCollecting(true)}
              >
                <Wallet size={15} />
                Collect payment
              </button>
            )}
            <button className="ui-btn ui-btn-primary" onClick={onClose}>
              Close
            </button>
          </>
        )
      }
    >
      {loading && !sale ? (
        <LoadingState />
      ) : error || !sale ? (
        <ErrorState message={error ?? "Sale not found."} onRetry={reload} />
      ) : (
        <>
          <div className="ui-stats" style={{ marginBottom: 18 }}>
            <StatCard
              icon={<IndianRupee size={20} />}
              label="Total"
              value={formatCurrency(sale.total_amount)}
              hint={
                Number(sale.discount_amount) > 0
                  ? `after ${formatCurrency(sale.discount_amount)} discount`
                  : undefined
              }
            />
            <StatCard
              tone="green"
              icon={<IndianRupee size={20} />}
              label="Paid"
              value={formatCurrency(paid)}
            />
            <StatCard
              tone={pending > 0 ? "red" : "green"}
              icon={<Wallet size={20} />}
              label="Pending"
              value={formatCurrency(Math.max(pending, 0))}
            />
          </div>

          <div className="ui-kv">
            <span>Customer</span>
            <strong>{customerNameOf(sale)}</strong>
          </div>
          <div className="ui-kv">
            <span>Date</span>
            <strong>{formatDateTime(sale.sale_date)}</strong>
          </div>
          <div className="ui-kv">
            <span>Payment status</span>
            <strong>
              <PaymentBadge sale={sale} />
            </strong>
          </div>
          {sale.notes && (
            <div className="ui-kv">
              <span>Notes</span>
              <strong>{sale.notes}</strong>
            </div>
          )}

          <h4 style={{ margin: "22px 0 10px" }}>Items</h4>
          <div className="ui-table-wrap">
            <table className="ui-table" style={{ minWidth: 480 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="ui-num">Cases</th>
                  <th className="ui-num">Rate / case</th>
                  <th className="ui-num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.sale_items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="ui-strong">
                        {item.product_variants?.products?.product_name ??
                          "Product"}
                      </span>
                      <span className="ui-sub">
                        {item.product_variants?.variant_name}
                      </span>
                    </td>
                    <td className="ui-num">{item.quantity_cases}</td>
                    <td className="ui-num">
                      {formatCurrency(item.selling_price_per_case)}
                    </td>
                    <td className="ui-num ui-strong">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 style={{ margin: "22px 0 10px" }}>Payments received</h4>
          {sale.payments.length === 0 ? (
            <p className="ui-footer-note">
              No payment received yet — the full amount is on credit.
            </p>
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table" style={{ minWidth: 420 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th className="ui-num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDateTime(payment.payment_date)}</td>
                      <td>
                        <Badge tone={payment.payment_method === "upi" ? "purple" : "blue"}>
                          {payment.payment_method.toUpperCase()}
                        </Badge>
                      </td>
                      <td>{payment.transaction_reference || "-"}</td>
                      <td className="ui-num ui-strong">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {collecting && (
            <CollectPaymentModal
              saleId={sale.id}
              invoice={sale.invoice_number ?? sale.id.slice(0, 8)}
              customerName={customerNameOf(sale)}
              pending={pending}
              onClose={() => setCollecting(false)}
              onSaved={() => {
                setCollecting(false);
                reload();
                onChanged();
              }}
            />
          )}
        </>
      )}
    </Modal>
  );
}

/* =========================================
   PAGE
========================================= */

export default function SalesPage() {
  const { isOwner } = useAuth();
  const { data, loading, error, reload } = useAsync(
    () => salesApi.list(300),
    []
  );

  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState<PayFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const sales = useMemo(() => data ?? [], [data]);

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
        customerNameOf(sale).toLowerCase().includes(keyword)
      );
    });
  }, [sales, search, payFilter, from, to]);

  const completed = filtered.filter((sale) => sale.status === "completed");
  const totalValue = completed.reduce(
    (total, sale) => total + Number(sale.total_amount),
    0
  );
  const totalPaid = completed.reduce((total, sale) => total + paidOf(sale), 0);

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="TRANSACTION MANAGEMENT"
        title="Sales"
        description="Cases sold to shops, with payment and credit status."
        actions={
          <>
            <button className="ui-btn ui-btn-outline" onClick={reload}>
              <RefreshCw size={15} />
              Refresh
            </button>
            {isOwner && (
              <button
                className="ui-btn ui-btn-primary"
                onClick={() => setCreating(true)}
              >
                <Plus size={16} />
                New sale
              </button>
            )}
          </>
        }
      />

      <div className="ui-stats">
        <StatCard
          icon={<ShoppingCart size={21} />}
          label="Sales shown"
          value={completed.length}
        />
        <StatCard
          tone="green"
          icon={<IndianRupee size={21} />}
          label="Sales value"
          value={formatCurrency(totalValue)}
          hint={`${formatCurrency(totalPaid)} received`}
        />
        <StatCard
          tone="red"
          icon={<Wallet size={21} />}
          label="Pending credit"
          value={formatCurrency(Math.max(totalValue - totalPaid, 0))}
        />
      </div>

      <Panel title="Sales history" subtitle="Newest first">
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
          <LoadingState text="Loading sales..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No sales found"
            text={
              sales.length === 0
                ? isOwner
                  ? "Create your first sale with the “New sale” button."
                  : "Sales recorded by the owner will appear here."
                : "Try changing the search or filters."
            }
          />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th className="ui-num">Total</th>
                  <th className="ui-num">Pending</th>
                  <th>Payment</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => {
                  const pending = Number(sale.total_amount) - paidOf(sale);

                  return (
                    <tr key={sale.id}>
                      <td className="ui-strong">
                        {sale.invoice_number || sale.id.slice(0, 8)}
                      </td>
                      <td>{customerNameOf(sale)}</td>
                      <td>{formatDate(sale.sale_date)}</td>
                      <td className="ui-num ui-strong">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td
                        className={`ui-num ${pending > 0 ? "ui-negative" : ""}`}
                      >
                        {pending > 0 ? formatCurrency(pending) : "-"}
                      </td>
                      <td>
                        <PaymentBadge sale={sale} />
                      </td>
                      <td>
                        <div className="ui-row-actions">
                          <button
                            className="ui-btn ui-btn-outline ui-btn-sm"
                            onClick={() => setOpenId(sale.id)}
                          >
                            <Eye size={14} />
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && sales.length > 0 && (
          <div className="ui-footer-note">
            Showing {filtered.length} of {sales.length} records
          </div>
        )}
      </Panel>

      {creating && (
        <NewSaleModal
          onClose={() => setCreating(false)}
          onSaved={(saleId) => {
            setCreating(false);
            reload();
            setOpenId(saleId);
          }}
        />
      )}

      {openId && (
        <SaleDetails
          saleId={openId}
          onClose={() => setOpenId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
