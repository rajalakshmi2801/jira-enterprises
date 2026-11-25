import { useState } from "react";
import { Boxes, IndianRupee, RefreshCw, TriangleAlert } from "lucide-react";

import {
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
  Tabs,
} from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { formatCurrency, formatNumber } from "../../lib/format";
import { LOW_STOCK_LIMIT } from "../../lib/constants";
import {
  categoriesApi,
  inventoryApi,
  productsApi,
} from "../../services/business.api";

import StockTab from "./StockTab";
import ProductsTab from "./ProductsTab";
import CategoriesTab from "./CategoriesTab";
import MovementsTab from "./MovementsTab";

type TabId = "stock" | "products" | "categories" | "history";

export default function InventoryPage() {
  const [tab, setTab] = useState<TabId>("stock");

  const inventory = useAsync(() => inventoryApi.list(), []);
  const products = useAsync(() => productsApi.list(), []);
  const categories = useAsync(() => categoriesApi.list(), []);

  function reloadAll() {
    inventory.reload();
    products.reload();
    categories.reload();
  }

  const items = inventory.data ?? [];

  const totalCases = items.reduce(
    (total, item) => total + item.available_cases,
    0
  );
  const stockValue = items.reduce(
    (total, item) =>
      total + item.available_cases * Number(item.landing_price_per_case),
    0
  );
  const lowCount = items.filter(
    (item) => item.available_cases <= LOW_STOCK_LIMIT
  ).length;

  const loadingFirst =
    (inventory.loading && !inventory.data) ||
    (products.loading && !products.data) ||
    (categories.loading && !categories.data);

  const error = inventory.error || products.error || categories.error;

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="STOCK CONTROL"
        title="Inventory"
        description="Products, case prices and live stock levels. Everything is counted in cases."
        actions={
          <button className="ui-btn ui-btn-outline" onClick={reloadAll}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />

      <div className="ui-stats">
        <StatCard
          icon={<Boxes size={21} />}
          label="Cases in stock"
          value={formatNumber(totalCases)}
          hint={`${items.length} active variant(s)`}
        />
        <StatCard
          tone="green"
          icon={<IndianRupee size={21} />}
          label="Stock value (landing cost)"
          value={formatCurrency(stockValue)}
        />
        <StatCard
          tone={lowCount > 0 ? "orange" : "green"}
          icon={<TriangleAlert size={21} />}
          label="Low / out of stock"
          value={lowCount}
          hint={`${LOW_STOCK_LIMIT} cases or fewer`}
        />
      </div>

      <Tabs<TabId>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "stock", label: "Current stock" },
          { id: "products", label: "Products & prices" },
          { id: "categories", label: "Categories" },
          { id: "history", label: "Stock history" },
        ]}
      />

      {loadingFirst ? (
        <LoadingState text="Loading inventory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reloadAll} />
      ) : (
        <>
          {tab === "stock" && (
            <StockTab items={items} onChanged={reloadAll} />
          )}
          {tab === "products" && (
            <ProductsTab
              products={products.data ?? []}
              categories={categories.data ?? []}
              onChanged={reloadAll}
            />
          )}
          {tab === "categories" && (
            <CategoriesTab
              categories={categories.data ?? []}
              onChanged={reloadAll}
            />
          )}
          {tab === "history" && <MovementsTab items={items} />}
        </>
      )}
    </div>
  );
}
