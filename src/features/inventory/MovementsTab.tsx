import { useMemo, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  type Tone,
} from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { formatDateTime } from "../../lib/format";
import {
  inventoryApi,
  type InventoryItem,
  type MovementType,
} from "../../services/business.api";

const typeInfo: Record<MovementType, { label: string; tone: Tone | "gray" }> = {
  opening_stock: { label: "Opening stock", tone: "purple" },
  purchase: { label: "Purchase", tone: "green" },
  sale: { label: "Sale", tone: "blue" },
  adjustment: { label: "Adjustment", tone: "orange" },
  return: { label: "Return", tone: "green" },
  damage: { label: "Damage", tone: "red" },
};

export default function MovementsTab({ items }: { items: InventoryItem[] }) {
  const [variantId, setVariantId] = useState("");

  const { data, loading, error, reload } = useAsync(
    () =>
      inventoryApi.movements(
        variantId ? { product_variant_id: variantId } : undefined
      ),
    [variantId]
  );

  const names = useMemo(() => {
    const map = new Map<string, string>();

    items.forEach((item) =>
      map.set(
        item.product_variant_id,
        `${item.product_name} · ${item.variant_name}`
      )
    );

    return map;
  }, [items]);

  return (
    <Panel
      title="Stock history"
      subtitle="Every addition and deduction, newest first (last 200)"
    >
      <div className="ui-toolbar">
        <select
          className="ui-select-inline"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
        >
          <option value="">All products</option>
          {items.map((item) => (
            <option
              key={item.product_variant_id}
              value={item.product_variant_id}
            >
              {item.product_name} · {item.variant_name}
            </option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No stock movements yet" />
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th className="ui-num">Cases</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {data.map((movement) => {
                const info = typeInfo[movement.movement_type];

                return (
                  <tr key={movement.id}>
                    <td>{formatDateTime(movement.movement_date)}</td>
                    <td className="ui-strong">
                      {names.get(movement.product_variant_id) ?? "Inactive item"}
                    </td>
                    <td>
                      <Badge tone={info.tone}>{info.label}</Badge>
                    </td>
                    <td
                      className={`ui-num ${
                        movement.quantity_cases < 0
                          ? "ui-negative"
                          : "ui-positive"
                      }`}
                    >
                      {movement.quantity_cases > 0 ? "+" : ""}
                      {movement.quantity_cases}
                    </td>
                    <td>{movement.remarks || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
