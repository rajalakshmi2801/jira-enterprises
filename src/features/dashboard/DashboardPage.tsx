
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  IndianRupee,
  Wallet,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  Receipt,
  CreditCard,
  ArrowUpRight,
  ArrowRight,
  Users,
  AlertTriangle,
  RefreshCw,
  ClipboardList,
} from "lucide-react";

import { getDashboardData } from "./dashboard.service";

import type {
  DashboardData,
  DashboardRecentSale,
} from "./dashboard.types";

import "./dashboard.css";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCustomerName(sale: DashboardRecentSale) {
  return (
    sale.customer?.shop_name ||
    sale.customer?.customer_name ||
    "Walk-in Customer"
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="dashboard-stat-card">
      <div className="dashboard-stat-top">
        <div className={`dashboard-stat-icon ${color}`}>
          <Icon size={21} />
        </div>
      </div>

      <p className="dashboard-stat-label">{title}</p>

      <h3>{value}</h3>

      <span className="dashboard-stat-description">
        {description}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setError("");

      const data = await getDashboardData();

      setDashboard(data);
    } catch (err: unknown) {
      console.error("Dashboard loading error:", err);

      setError(
        "Unable to load dashboard information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    getDashboardData()
        .then((data) => {
            if (active) {
                setDashboard(data);
            }
        })
        .catch((err: unknown) => {
            console.error("Dashboard loading error:", err);

            if (active) {
                setError(
                    "Unable to load dashboard information. Please try again."
                );
            }
        })
        .finally(() => {
            if (active) {
                setLoading(false);
            }
        });

    return () => {
        active = false;
    };
}, []);

  if (loading) {
    return (
      <div className="dashboard-state">
        <RefreshCw className="spin-icon" size={28} />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="dashboard-state dashboard-error">
        <AlertTriangle size={30} />
        <h3>Dashboard unavailable</h3>
        <p>{error || "No dashboard data available."}</p>

        <button
          className="dashboard-primary-button"
          onClick={() => {
            setLoading(true);
            loadDashboard();
          }}
        >
          <RefreshCw size={17} />
          Retry
        </button>
      </div>
    );
  }

  const { today, credit, inventory, recentSales, pendingNotes } =
    dashboard;

  return (
    <div className="dashboard-page">

      {/* PAGE HEADER */}

      <div className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow">
            BUSINESS OVERVIEW
          </span>

          <h2>Dashboard</h2>

          <p>
            Here is your business performance for today.
          </p>
        </div>

        <button
          className="dashboard-refresh-button"
          onClick={() => {
            setLoading(true);
            loadDashboard();
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* TODAY'S PERFORMANCE */}

      <div className="dashboard-section-heading">
        <h3>Today's Performance</h3>
        <span>
          {new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="dashboard-stats-grid">

        <StatCard
          title="Today's Sales"
          value={formatCurrency(today.totalSales)}
          description={`${today.salesCount} completed sales`}
          icon={ShoppingCart}
          color="stat-blue"
        />

        <StatCard
          title="Amount Received"
          value={formatCurrency(today.totalReceived)}
          description="Payments received today"
          icon={IndianRupee}
          color="stat-green"
        />

        <StatCard
          title="Today's Expenses"
          value={formatCurrency(today.totalExpenses)}
          description="Business expenses"
          icon={Receipt}
          color="stat-orange"
        />

        <StatCard
          title="Outstanding Credit"
          value={formatCurrency(credit.outstanding)}
          description="Pending customer payments"
          icon={Wallet}
          color="stat-purple"
        />

        <StatCard
          title="Gross Profit"
          value={formatCurrency(today.grossProfit)}
          description="Sales minus cost of goods"
          icon={TrendingUp}
          color="stat-green"
        />

        <StatCard
          title="Estimated Net Profit"
          value={formatCurrency(today.estimatedNetProfit)}
          description="Gross profit minus expenses"
          icon={TrendingDown}
          color="stat-blue"
        />
      </div>

      {/* INVENTORY OVERVIEW */}

      <div className="dashboard-section-heading">
        <h3>Inventory Overview</h3>

        <Link to="/inventory" className="dashboard-text-link">
          View Inventory <ArrowRight size={15} />
        </Link>
      </div>

      <div className="dashboard-inventory-grid">

        <div className="dashboard-info-card">
          <div className="dashboard-info-icon stat-purple">
            <Package size={22} />
          </div>

          <div>
            <span>Total Stock Available</span>
            <h3>
              {Number(inventory.totalStockCases).toLocaleString("en-IN")}
              <small> cases</small>
            </h3>
          </div>
        </div>

        <div className="dashboard-info-card">
          <div className="dashboard-info-icon stat-blue">
            <ClipboardList size={22} />
          </div>

          <div>
            <span>Active Variants</span>
            <h3>{inventory.totalVariants}</h3>
          </div>
        </div>

        <div className="dashboard-info-card">
          <div className="dashboard-info-icon stat-orange">
            <AlertTriangle size={22} />
          </div>

          <div>
            <span>Low Stock Items</span>
            <h3>{inventory.lowStockCount}</h3>
          </div>
        </div>

      </div>

      {/* MAIN CONTENT */}

      <div className="dashboard-content-grid">

        {/* RECENT SALES */}

        <section className="dashboard-panel">

          <div className="dashboard-panel-header">
            <div>
              <h3>Recent Sales</h3>
              <p>Latest completed transactions</p>
            </div>

            <Link to="/sales" className="dashboard-text-link">
              View All <ArrowUpRight size={15} />
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <div className="dashboard-empty">
              <ShoppingCart size={28} />
              <p>No sales recorded yet.</p>
            </div>
          ) : (
            <div className="dashboard-table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="dashboard-invoice">
                        {sale.invoice_number}
                      </td>

                      <td>{getCustomerName(sale)}</td>

                      <td>{formatDate(sale.sale_date)}</td>

                      <td className="dashboard-amount">
                        {formatCurrency(sale.total_amount)}
                      </td>

                      <td>
                        <span className="dashboard-status">
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>

        {/* LOW STOCK */}

        <section className="dashboard-panel">

          <div className="dashboard-panel-header">
            <div>
              <h3>Low Stock Alerts</h3>
              <p>Products requiring attention</p>
            </div>

            <AlertTriangle size={19} className="alert-icon" />
          </div>

          {inventory.lowStockItems.length === 0 ? (
            <div className="dashboard-empty">
              <Package size={28} />
              <p>No low-stock items.</p>
            </div>
          ) : (
            <div className="dashboard-list">

              {inventory.lowStockItems.map((item) => (
                <div
                  className="dashboard-list-item"
                  key={item.variantId}
                >
                  <div>
                    <strong>
                      {item.product?.product_name || "Product"}
                    </strong>

                    <span>
                      {item.variantName}
                    </span>
                  </div>

                  <span className="low-stock-quantity">
                    {item.stockCases} cases
                  </span>
                </div>
              ))}

            </div>
          )}

        </section>

        {/* PENDING NOTES */}

        <section className="dashboard-panel">

          <div className="dashboard-panel-header">
            <div>
              <h3>Pending Reminders</h3>
              <p>Your upcoming business tasks</p>
            </div>

            <Link to="/notes" className="dashboard-text-link">
              View All <ArrowUpRight size={15} />
            </Link>
          </div>

          {pendingNotes.length === 0 ? (
            <div className="dashboard-empty">
              <ClipboardList size={28} />
              <p>No pending reminders.</p>
            </div>
          ) : (
            <div className="dashboard-list">

              {pendingNotes.map((note) => (
                <div
                  className="dashboard-list-item"
                  key={note.id}
                >
                  <div>
                    <strong>{note.title}</strong>

                    <span>
                      {note.reminder_at
                        ? formatDate(note.reminder_at)
                        : "No reminder date"}
                    </span>
                  </div>

                  <ClipboardList size={18} />
                </div>
              ))}

            </div>
          )}

        </section>

      </div>

      {/* QUICK ACTIONS */}

      <section className="dashboard-panel dashboard-quick-actions">

        <div className="dashboard-panel-header">
          <div>
            <h3>Quick Actions</h3>
            <p>Navigate to frequently used modules</p>
          </div>
        </div>

        <div className="dashboard-actions-grid">

          <Link to="/sales" className="dashboard-action">
            <ShoppingCart size={20} />
            <span>Sales</span>
            <ArrowUpRight size={15} />
          </Link>

          <Link to="/customers" className="dashboard-action">
            <Users size={20} />
            <span>Customers</span>
            <ArrowUpRight size={15} />
          </Link>

          <Link to="/inventory" className="dashboard-action">
            <Package size={20} />
            <span>Inventory</span>
            <ArrowUpRight size={15} />
          </Link>

          <Link to="/payments" className="dashboard-action">
            <CreditCard size={20} />
            <span>Payments</span>
            <ArrowUpRight size={15} />
          </Link>

        </div>

      </section>

    </div>
  );
}
