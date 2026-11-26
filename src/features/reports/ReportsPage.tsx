import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  IndianRupee,
  Receipt,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  StatCard,
  Tabs,
} from "../../components/ui";
import DailySalesTab from "./DailySalesTab";
import { useAsync } from "../../lib/useAsync";
import {
  downloadCsv,
  formatCurrency,
  formatDate,
  formatNumber,
  toDateInput,
} from "../../lib/format";
import {
  inventoryApi,
  reportsApi,
  type ReportRange,
} from "../../services/business.api";

type TabId = "summary" | "sales" | "purchases" | "expenses";
type ViewId = "daily" | "period";

function presetRange(preset: string): ReportRange {
  const now = new Date();
  const today = toDateInput(now);

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const start = new Date(now);

      start.setDate(now.getDate() - 6);

      return { from: toDateInput(start), to: today };
    }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);

      return { from: toDateInput(start), to: toDateInput(end) };
    }
    case "year": {
      return { from: toDateInput(new Date(now.getFullYear(), 0, 1)), to: today };
    }
    default:
      return {
        from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: today,
      };
  }
}

const PRESETS = [
  ["today", "Today"],
  ["week", "Last 7 days"],
  ["month", "This month"],
  ["lastMonth", "Last month"],
  ["year", "This year"],
] as const;

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>(presetRange("month"));
  const [tab, setTab] = useState<TabId>("summary");
  const [view, setView] = useState<ViewId>("daily");

  const overview = useAsync(() => reportsApi.overview(range), [range.from, range.to]);
  const sales = useAsync(() => reportsApi.sales(range), [range.from, range.to]);
  const purchases = useAsync(() => reportsApi.purchases(range), [range.from, range.to]);
  const expenses = useAsync(() => reportsApi.expenses(range), [range.from, range.to]);
  const inventory = useAsync(() => inventoryApi.list().catch(() => []), []);

  const loading =
    (overview.loading && !overview.data) ||
    (sales.loading && !sales.data) ||
    (purchases.loading && !purchases.data) ||
    (expenses.loading && !expenses.data);

  const error = overview.error || sales.error || purchases.error || expenses.error;

  function reloadAll() {
    overview.reload();
    sales.reload();
    purchases.reload();
    expenses.reload();
  }

  const names = useMemo(() => {
    const map = new Map<string, string>();

    (inventory.data ?? []).forEach((item) =>
      map.set(item.product_variant_id, `${item.product_name} · ${item.variant_name}`)
    );

    return map;
  }, [inventory.data]);

  // Sales vs purchases per day for the chart
  const daily = useMemo(() => {
    const map = new Map<string, { day: string; Sales: number; Purchases: number; Expenses: number }>();

    const touch = (iso: string) => {
      const day = toDateInput(new Date(iso));

      if (!map.has(day)) {
        map.set(day, { day, Sales: 0, Purchases: 0, Expenses: 0 });
      }

      return map.get(day)!;
    };

    (sales.data?.sales ?? []).forEach((sale) => {
      touch(sale.sale_date).Sales += Number(sale.total_amount);
    });
    (purchases.data?.purchases ?? []).forEach((purchase) => {
      touch(purchase.purchase_date).Purchases += Number(purchase.total_amount);
    });
    (expenses.data?.expenses ?? []).forEach((expense) => {
      touch(expense.expense_date).Expenses += Number(expense.amount);
    });

    return [...map.values()]
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((row) => ({ ...row, label: formatDate(row.day) }));
  }, [sales.data, purchases.data, expenses.data]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { cases: number; revenue: number; profit: number }>();

    (sales.data?.saleItems ?? []).forEach((item) => {
      const current = map.get(item.product_variant_id) ?? {
        cases: 0,
        revenue: 0,
        profit: 0,
      };

      current.cases += Number(item.quantity_cases);
      current.revenue += Number(item.subtotal);
      current.profit +=
        Number(item.quantity_cases) *
        (Number(item.selling_price_per_case) - Number(item.cost_price_per_case));

      map.set(item.product_variant_id, current);
    });

    return [...map.entries()]
      .map(([id, value]) => ({ id, name: names.get(id) ?? "Inactive item", ...value }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales.data, names]);

  const expenseCategories = useMemo(
    () =>
      Object.entries(overview.data?.expenses.categorySummary ?? {}).sort(
        (a, b) => b[1] - a[1]
      ),
    [overview.data]
  );

  function exportCurrent() {
    const stamp = `${range.from}_to_${range.to}`;

    if (tab === "sales") {
      downloadCsv(`sales_${stamp}.csv`, [
        ["Invoice", "Date", "Discount", "Total"],
        ...(sales.data?.sales ?? []).map((sale) => [
          sale.invoice_number,
          formatDate(sale.sale_date),
          sale.discount_amount,
          sale.total_amount,
        ]),
      ]);
    } else if (tab === "purchases") {
      downloadCsv(`purchases_${stamp}.csv`, [
        ["Date", "Supplier", "Invoice", "Total"],
        ...(purchases.data?.purchases ?? []).map((purchase) => [
          formatDate(purchase.purchase_date),
          purchase.supplier_name,
          purchase.invoice_number,
          purchase.total_amount,
        ]),
      ]);
    } else if (tab === "expenses") {
      downloadCsv(`expenses_${stamp}.csv`, [
        ["Date", "Expense", "Category", "Paid by", "Amount"],
        ...(expenses.data?.expenses ?? []).map((expense) => [
          formatDate(expense.expense_date),
          expense.expense_title,
          expense.category,
          expense.payment_method,
          expense.amount,
        ]),
      ]);
    } else {
      const o = overview.data;

      if (!o) return;

      downloadCsv(`summary_${stamp}.csv`, [
        ["Metric", "Value"],
        ["Period", `${range.from} to ${range.to}`],
        ["Sales", o.profit.totalSales],
        ["Cost of goods sold", o.profit.costOfGoodsSold],
        ["Gross profit", o.profit.grossProfit],
        ["Expenses", o.profit.totalExpenses],
        ["Net profit", o.profit.netProfit],
        ["Purchases", o.purchases.totalPurchases],
        ["Cases sold", o.sales.totalCasesSold],
        ["Cases purchased", o.purchases.totalCasesPurchased],
      ]);
    }
  }

  const profit = overview.data?.profit;

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="BUSINESS INSIGHTS"
        title="Reports"
        description="Sales, purchases, expenses and profit for any period."
        actions={
          <>
            <button className="ui-btn ui-btn-outline" onClick={reloadAll}>
              <RefreshCw size={15} />
              Refresh
            </button>
            {view === "period" && (
              <button className="ui-btn ui-btn-outline" onClick={exportCurrent}>
                <Download size={15} />
                Export CSV
              </button>
            )}
          </>
        }
      />

      <Tabs<ViewId>
        active={view}
        onChange={setView}
        tabs={[
          { id: "daily", label: "Daily sales (customer-wise)" },
          { id: "period", label: "Period reports & profit" },
        ]}
      />

      {view === "daily" && <DailySalesTab />}

      {view === "period" && (
      <>
      <Panel>
        <div className="ui-toolbar" style={{ marginBottom: 0 }}>
          <div className="ui-chip-row">
            {PRESETS.map(([id, label]) => {
              const value = presetRange(id);
              const active = value.from === range.from && value.to === range.to;

              return (
                <button
                  key={id}
                  className={`ui-chip ${active ? "ui-chip-active" : ""}`}
                  onClick={() => setRange(value)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <input
              type="date"
              className="ui-select-inline"
              value={range.from}
              max={range.to}
              onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })}
              aria-label="From date"
            />
            <span style={{ color: "#8992a3" }}>to</span>
            <input
              type="date"
              className="ui-select-inline"
              value={range.to}
              min={range.from}
              onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })}
              aria-label="To date"
            />
          </div>
        </div>
      </Panel>

      {loading ? (
        <LoadingState text="Preparing report..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reloadAll} />
      ) : (
        <>
          <div className="ui-stats">
            <StatCard
              icon={<ShoppingCart size={21} />}
              label="Sales"
              value={formatCurrency(overview.data?.sales.totalSales)}
              hint={`${overview.data?.sales.salesCount ?? 0} invoices · ${formatNumber(
                overview.data?.sales.totalCasesSold
              )} cases`}
            />
            <StatCard
              tone="orange"
              icon={<Truck size={21} />}
              label="Purchases"
              value={formatCurrency(overview.data?.purchases.totalPurchases)}
              hint={`${formatNumber(overview.data?.purchases.totalCasesPurchased)} cases`}
            />
            <StatCard
              tone="red"
              icon={<Receipt size={21} />}
              label="Expenses"
              value={formatCurrency(overview.data?.expenses.totalExpenses)}
            />
            <StatCard
              tone={(profit?.netProfit ?? 0) >= 0 ? "green" : "red"}
              icon={
                (profit?.netProfit ?? 0) >= 0 ? (
                  <TrendingUp size={21} />
                ) : (
                  <TrendingDown size={21} />
                )
              }
              label="Net profit"
              value={formatCurrency(profit?.netProfit)}
              hint={`Gross ${formatCurrency(profit?.grossProfit)}`}
            />
          </div>

          <Tabs<TabId>
            active={tab}
            onChange={setTab}
            tabs={[
              { id: "summary", label: "Profit & summary" },
              { id: "sales", label: "Sales" },
              { id: "purchases", label: "Purchases" },
              { id: "expenses", label: "Expenses" },
            ]}
          />

          {tab === "summary" && (
            <>
              <Panel title="Daily activity" subtitle="Sales, purchases and expenses per day">
                {daily.length === 0 ? (
                  <EmptyState title="No activity in this period" />
                ) : (
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e9edf3" />
                        <XAxis dataKey="label" fontSize={11} />
                        <YAxis fontSize={11} width={70} tickFormatter={(v) => `₹${formatNumber(v)}`} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Bar dataKey="Sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Purchases" fill="#ea8a1a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>

              <div className="ui-grid-2">
                <Panel title="Profit statement">
                  <div className="ui-kv"><span>Sales (after discounts)</span><strong>{formatCurrency(profit?.totalSales)}</strong></div>
                  <div className="ui-kv"><span>Cost of goods sold</span><strong>- {formatCurrency(profit?.costOfGoodsSold)}</strong></div>
                  <div className="ui-kv"><span>Gross profit</span><strong className="ui-positive">{formatCurrency(profit?.grossProfit)}</strong></div>
                  <div className="ui-kv"><span>Expenses</span><strong>- {formatCurrency(profit?.totalExpenses)}</strong></div>
                  <div className="ui-kv">
                    <span>Net profit</span>
                    <strong className={(profit?.netProfit ?? 0) >= 0 ? "ui-positive" : "ui-negative"}>
                      {formatCurrency(profit?.netProfit)}
                    </strong>
                  </div>
                  <p className="ui-footer-note">
                    Cost of goods uses the landing price saved on each sale, so later price changes do not alter past profit.
                  </p>
                </Panel>

                <Panel title="Top selling products">
                  {topProducts.length === 0 ? (
                    <EmptyState title="No sales in this period" />
                  ) : (
                    <div className="ui-table-wrap">
                      <table className="ui-table" style={{ minWidth: 380 }}>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th className="ui-num">Cases</th>
                            <th className="ui-num">Revenue</th>
                            <th className="ui-num">Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topProducts.slice(0, 8).map((row) => (
                            <tr key={row.id}>
                              <td className="ui-strong">{row.name}</td>
                              <td className="ui-num">{row.cases}</td>
                              <td className="ui-num">{formatCurrency(row.revenue)}</td>
                              <td className={`ui-num ${row.profit >= 0 ? "ui-positive" : "ui-negative"}`}>
                                {formatCurrency(row.profit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>
              </div>
            </>
          )}

          {tab === "sales" && (
            <Panel title="Sales in period" subtitle={`${sales.data?.sales.length ?? 0} invoices`}>
              {(sales.data?.sales ?? []).length === 0 ? (
                <EmptyState title="No sales in this period" />
              ) : (
                <div className="ui-table-wrap">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th className="ui-num">Discount</th>
                        <th className="ui-num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.data!.sales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="ui-strong">{sale.invoice_number || sale.id.slice(0, 8)}</td>
                          <td>{formatDate(sale.sale_date)}</td>
                          <td className="ui-num">{formatCurrency(sale.discount_amount)}</td>
                          <td className="ui-num ui-strong">{formatCurrency(sale.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {tab === "purchases" && (
            <Panel title="Purchases in period" subtitle={`${purchases.data?.purchases.length ?? 0} purchases`}>
              {(purchases.data?.purchases ?? []).length === 0 ? (
                <EmptyState title="No purchases in this period" />
              ) : (
                <div className="ui-table-wrap">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>Invoice</th>
                        <th className="ui-num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.data!.purchases.map((purchase) => (
                        <tr key={purchase.id}>
                          <td>{formatDate(purchase.purchase_date)}</td>
                          <td className="ui-strong">{purchase.supplier_name || "-"}</td>
                          <td>{purchase.invoice_number || "-"}</td>
                          <td className="ui-num ui-strong">{formatCurrency(purchase.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {tab === "expenses" && (
            <div className="ui-grid-2">
              <Panel title="Expenses in period" subtitle={`${expenses.data?.expenses.length ?? 0} entries`}>
                {(expenses.data?.expenses ?? []).length === 0 ? (
                  <EmptyState title="No expenses in this period" />
                ) : (
                  <div className="ui-table-wrap">
                    <table className="ui-table" style={{ minWidth: 420 }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Expense</th>
                          <th>Category</th>
                          <th className="ui-num">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.data!.expenses.map((expense) => (
                          <tr key={expense.id}>
                            <td>{formatDate(expense.expense_date)}</td>
                            <td className="ui-strong">{expense.expense_title}</td>
                            <td>{expense.category || "-"}</td>
                            <td className="ui-num ui-strong">{formatCurrency(expense.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <Panel title="By category">
                {expenseCategories.length === 0 ? (
                  <EmptyState title="No data" />
                ) : (
                  expenseCategories.map(([name, value]) => (
                    <div className="ui-kv" key={name}>
                      <span>{name}</span>
                      <strong>{formatCurrency(value)}</strong>
                    </div>
                  ))
                )}
              </Panel>
            </div>
          )}
        </>
      )}

      <p className="ui-footer-note" style={{ marginTop: -6 }}>
        <IndianRupee size={12} style={{ verticalAlign: "-1px" }} /> All amounts in Indian Rupees.
      </p>
      </>
      )}
    </div>
  );
}
