import { useState } from "react";
import toast from "react-hot-toast";
import {
  Boxes,
  Download,
  IndianRupee,
  LoaderCircle,
  ReceiptText,
  Wallet,
} from "lucide-react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  StatCard,
} from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import {
  formatCurrency,
  formatDate,
  downloadCsv,
  formatNumber,
  getErrorMessage,
  toDateInput,
} from "../../lib/format";
import { downloadDailySalesExcel } from "../../lib/excel";
import {
  reportsApi,
  settingsApi,
  type ReportRange,
} from "../../services/business.api";

function shiftDay(days: number) {
  const date = new Date();

  date.setDate(date.getDate() + days);

  return toDateInput(date);
}

/** Daily sales: date, customer, products, cases, amount, paid, pending. */
export default function DailySalesTab() {
  const [range, setRange] = useState<ReportRange>({
    from: toDateInput(),
    to: toDateInput(),
  });
  const [downloading, setDownloading] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => reportsApi.dailySales(range),
    [range.from, range.to]
  );

  const today = toDateInput();
  const yesterday = shiftDay(-1);

  async function download() {
    if (!data) return;

    setDownloading(true);

    try {
      const settings = await settingsApi.get().catch(() => null);

      await downloadDailySalesExcel(data, {
        name: settings?.business_name || "Jira Enterprises",
        gst: settings?.gst_number ?? null,
      });
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to create the Excel file."));
    } finally {
      setDownloading(false);
    }
  }

  function downloadCsvFile() {
    if (!data) return;

    const stamp =
      data.period.from === data.period.to
        ? data.period.from
        : `${data.period.from}_to_${data.period.to}`;

    downloadCsv(`daily_sales_${stamp}.csv`, [
      ["Date", "Invoice", "Customer", "Customer GSTIN", "Products", "Cases", "Amount", "Paid", "Pending"],
      ...data.rows.map((row) => [
        formatDate(row.sale_date),
        row.invoice_number,
        row.customer_name,
        row.customer_gst,
        row.products.map((item) => `${item.name} x ${item.cases}`).join("; "),
        row.total_cases,
        row.total_amount,
        row.paid_amount,
        row.pending_amount,
      ]),
      ["", "", "", "", "TOTAL", data.summary.cases, data.summary.amount, data.summary.paid, data.summary.pending],
    ]);
  }

  const summary = data?.summary;

  return (
    <>
      <Panel>
        <div className="ui-toolbar" style={{ marginBottom: 0 }}>
          <div className="ui-chip-row">
            <button
              className={`ui-chip ${
                range.from === today && range.to === today ? "ui-chip-active" : ""
              }`}
              onClick={() => setRange({ from: today, to: today })}
            >
              Today
            </button>
            <button
              className={`ui-chip ${
                range.from === yesterday && range.to === yesterday
                  ? "ui-chip-active"
                  : ""
              }`}
              onClick={() => setRange({ from: yesterday, to: yesterday })}
            >
              Yesterday
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              type="date"
              className="ui-select-inline"
              value={range.from}
              max={range.to}
              onChange={(e) =>
                e.target.value && setRange({ ...range, from: e.target.value })
              }
              aria-label="From date"
            />
            <span style={{ color: "#8992a3" }}>to</span>
            <input
              type="date"
              className="ui-select-inline"
              value={range.to}
              min={range.from}
              onChange={(e) =>
                e.target.value && setRange({ ...range, to: e.target.value })
              }
              aria-label="To date"
            />
          </div>

          <button
            className="ui-btn ui-btn-outline"
            style={{ marginLeft: "auto" }}
            onClick={downloadCsvFile}
            disabled={loading || !data || data.rows.length === 0}
          >
            <Download size={15} />
            Download CSV
          </button>

          <button
            className="ui-btn ui-btn-success"
            onClick={download}
            disabled={downloading || loading || !data || data.rows.length === 0}
          >
            {downloading ? (
              <LoaderCircle size={15} className="spin-icon" />
            ) : (
              <Download size={15} />
            )}
            Download Excel
          </button>
        </div>
      </Panel>

      {loading && !data ? (
        <LoadingState text="Loading daily sales..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <div className="ui-stats">
            <StatCard
              icon={<ReceiptText size={21} />}
              label="Invoices"
              value={summary?.invoices ?? 0}
            />
            <StatCard
              tone="purple"
              icon={<Boxes size={21} />}
              label="Cases sold"
              value={formatNumber(summary?.cases)}
            />
            <StatCard
              icon={<IndianRupee size={21} />}
              label="Sales amount"
              value={formatCurrency(summary?.amount)}
            />
            <StatCard
              tone="green"
              icon={<IndianRupee size={21} />}
              label="Paid"
              value={formatCurrency(summary?.paid)}
            />
            <StatCard
              tone={(summary?.pending ?? 0) > 0 ? "red" : "green"}
              icon={<Wallet size={21} />}
              label="Pending"
              value={formatCurrency(summary?.pending)}
            />
          </div>

          <Panel
            title="Sales by date"
            subtitle="Paid and pending are the payment status of each invoice as of now"
          >
            {!data || data.rows.length === 0 ? (
              <EmptyState
                title="No sales on the selected date(s)"
                text="Pick another date or range."
              />
            ) : (
              <div className="ui-table-wrap">
                <table className="ui-table" style={{ minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Products</th>
                      <th className="ui-num">Cases</th>
                      <th className="ui-num">Amount</th>
                      <th className="ui-num">Paid</th>
                      <th className="ui-num">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.sale_id}>
                        <td>
                          {formatDate(row.sale_date)}
                          <span className="ui-sub">{row.invoice_number}</span>
                        </td>
                        <td>
                          <span className="ui-strong">{row.customer_name}</span>
                          {row.customer_gst && (
                            <span className="ui-sub">GSTIN {row.customer_gst}</span>
                          )}
                        </td>
                        <td>
                          {row.products.map((item, index) => (
                            <div key={index}>
                              {item.name}{" "}
                              <span style={{ color: "#8992a3" }}>
                                × {item.cases}
                              </span>
                            </div>
                          ))}
                        </td>
                        <td className="ui-num">{row.total_cases}</td>
                        <td className="ui-num ui-strong">
                          {formatCurrency(row.total_amount)}
                        </td>
                        <td className="ui-num ui-positive">
                          {formatCurrency(row.paid_amount)}
                        </td>
                        <td className="ui-num">
                          {row.pending_amount > 0 ? (
                            <Badge tone="red">
                              {formatCurrency(row.pending_amount)}
                            </Badge>
                          ) : (
                            <Badge tone="green">Paid</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="ui-strong">
                        Total
                      </td>
                      <td className="ui-num ui-strong">{summary?.cases}</td>
                      <td className="ui-num ui-strong">
                        {formatCurrency(summary?.amount)}
                      </td>
                      <td className="ui-num ui-strong">
                        {formatCurrency(summary?.paid)}
                      </td>
                      <td className="ui-num ui-strong">
                        {formatCurrency(summary?.pending)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
