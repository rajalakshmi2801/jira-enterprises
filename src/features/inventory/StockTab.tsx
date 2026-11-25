import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search, SlidersHorizontal } from "lucide-react";

import {
  Badge,
  EmptyState,
  Field,
  FormError,
  Modal,
  Panel,
} from "../../components/ui";
import { useAuth } from "../auth/useAuth";
import { formatCurrency, formatNumber, getErrorMessage } from "../../lib/format";
import {
  inventoryApi,
  type InventoryItem,
} from "../../services/business.api";
import { LOW_STOCK_LIMIT } from "../../lib/constants";

type AdjustKind = "add" | "remove" | "damage" | "return" | "opening";

const kindLabels: Record<AdjustKind, string> = {
  add: "Add stock (correction)",
  remove: "Remove stock (correction)",
  damage: "Damaged / broken cases",
  return: "Returned cases",
  opening: "Opening stock",
};

function AdjustModal({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<AdjustKind>("damage");
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const cases = Number(quantity);

    if (!Number.isInteger(cases) || cases <= 0) {
      setError("Enter a whole number of cases greater than zero.");
      return;
    }

    if ((kind === "remove" || kind === "damage") && cases > item.available_cases) {
      setError(`Only ${item.available_cases} case(s) are available.`);
      return;
    }

    setSaving(true);

    try {
      await inventoryApi.addMovement({
        product_variant_id: item.product_variant_id,
        movement_type:
          kind === "add" || kind === "remove"
            ? "adjustment"
            : kind === "opening"
              ? "opening_stock"
              : kind,
        quantity_cases: kind === "remove" ? -cases : cases,
        remarks: remarks.trim() || undefined,
      });

      toast.success("Stock updated.");
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Adjust stock"
      subtitle={`${item.product_name} · ${item.variant_name} — ${item.available_cases} case(s) now`}
      size="sm"
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
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="ui-form-grid">
        <Field label="Reason" span={2}>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as AdjustKind);
              setError("");
            }}
          >
            {(Object.keys(kindLabels) as AdjustKind[]).map((key) => (
              <option key={key} value={key}>
                {kindLabels[key]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Number of cases" required span={2}>
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setError("");
            }}
            autoFocus
          />
        </Field>

        <Field label="Remarks" span={2}>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional note"
          />
        </Field>
        <button type="submit" hidden />
      </form>

      <FormError message={error} />
    </Modal>
  );
}

export default function StockTab({
  items,
  onChanged,
}: {
  items: InventoryItem[];
  onChanged: () => void;
}) {
  const { isOwner } = useAuth();
  const [search, setSearch] = useState("");
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const list = keyword
      ? items.filter((item) =>
          [item.product_name, item.brand_name, item.variant_name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        )
      : items;

    return [...list].sort((a, b) => a.available_cases - b.available_cases);
  }, [items, search]);

  return (
    <Panel
      title="Current stock"
      subtitle="Lowest stock is shown first so you know what to reorder"
    >
      <div className="ui-toolbar">
        <div className="ui-search">
          <Search size={16} />
          <input
            placeholder="Search product or variant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No stock to show"
          text={
            items.length === 0
              ? "Add products in the “Products & prices” tab, then record a purchase to bring stock in."
              : "No product matches your search."
          }
        />
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th className="ui-num">Pieces / case</th>
                <th className="ui-num">Cost / case</th>
                <th className="ui-num">MRP / case</th>
                <th className="ui-num">Stock (cases)</th>
                <th className="ui-num">Stock value</th>
                {isOwner && <th />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.product_variant_id}>
                  <td>
                    <span className="ui-strong">{item.product_name}</span>
                    {item.brand_name && (
                      <span className="ui-sub">{item.brand_name}</span>
                    )}
                  </td>
                  <td>{item.variant_name}</td>
                  <td className="ui-num">{item.pieces_per_case}</td>
                  <td className="ui-num">
                    {formatCurrency(item.landing_price_per_case)}
                  </td>
                  <td className="ui-num">
                    {formatCurrency(item.mrp_per_case)}
                  </td>
                  <td className="ui-num">
                    <Badge
                      tone={
                        item.available_cases <= 0
                          ? "red"
                          : item.available_cases <= LOW_STOCK_LIMIT
                            ? "orange"
                            : "green"
                      }
                    >
                      {formatNumber(item.available_cases)}
                      {item.available_cases <= 0
                        ? " · out"
                        : item.available_cases <= LOW_STOCK_LIMIT
                          ? " · low"
                          : ""}
                    </Badge>
                  </td>
                  <td className="ui-num">
                    {formatCurrency(
                      item.available_cases *
                        Number(item.landing_price_per_case)
                    )}
                  </td>
                  {isOwner && (
                    <td>
                      <div className="ui-row-actions">
                        <button
                          className="ui-btn ui-btn-outline ui-btn-sm"
                          onClick={() => setAdjusting(item)}
                        >
                          <SlidersHorizontal size={13} />
                          Adjust
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

      {adjusting && (
        <AdjustModal
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={() => {
            setAdjusting(null);
            onChanged();
          }}
        />
      )}
    </Panel>
  );
}
