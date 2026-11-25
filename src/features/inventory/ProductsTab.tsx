import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Power, Search, Trash2 } from "lucide-react";

import {
  Badge,
  EmptyState,
  Field,
  FormError,
  Modal,
  Panel,
} from "../../components/ui";
import { useAuth } from "../auth/useAuth";
import { formatCurrency, getErrorMessage, roundMoney } from "../../lib/format";
import {
  inventoryApi,
  productsApi,
  type Category,
  type NewVariantInput,
  type Product,
  type Variant,
} from "../../services/business.api";

const SIZE_UNITS = ["ml", "L", "g", "kg", "pcs"];

/* =========================================
   VARIANT FIELDS (shared by new product,
   add variant and edit variant)
========================================= */

interface VariantDraft {
  variant_name: string;
  size_value: string;
  size_unit: string;
  pieces_per_case: string;
  landing: string;
  mrp: string;
  stock: string;
}

const emptyVariant: VariantDraft = {
  variant_name: "",
  size_value: "",
  size_unit: "ml",
  pieces_per_case: "",
  landing: "",
  mrp: "",
  stock: "",
};

function draftFromVariant(variant: Variant): VariantDraft {
  return {
    variant_name: variant.variant_name,
    size_value: variant.size_value ? String(variant.size_value) : "",
    size_unit: variant.size_unit || "ml",
    pieces_per_case: String(variant.pieces_per_case),
    landing: String(variant.landing_price_per_case),
    mrp: String(variant.mrp_per_case),
    stock: "",
  };
}

/** Returns an error message or null, and the parsed numbers. */
function parseVariant(draft: VariantDraft, label: string) {
  const pieces = Number(draft.pieces_per_case);
  const landing = Number(draft.landing);
  const mrp = Number(draft.mrp);
  const stock = draft.stock === "" ? 0 : Number(draft.stock);
  const size = draft.size_value === "" ? null : Number(draft.size_value);

  if (!draft.variant_name.trim()) {
    return { error: `${label}: enter a variant name (for example “500 ml”).` };
  }
  if (!Number.isInteger(pieces) || pieces <= 0) {
    return { error: `${label}: pieces per case must be a whole number above zero.` };
  }
  if (draft.landing === "" || !Number.isFinite(landing) || landing < 0) {
    return { error: `${label}: enter a valid landing price per case.` };
  }
  if (draft.mrp === "" || !Number.isFinite(mrp) || mrp < 0) {
    return { error: `${label}: enter a valid MRP per case.` };
  }
  if (size !== null && (!Number.isFinite(size) || size <= 0)) {
    return { error: `${label}: size must be a positive number.` };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { error: `${label}: opening stock must be a whole number of cases.` };
  }

  return {
    values: {
      name: draft.variant_name.trim(),
      size,
      unit: size === null ? null : draft.size_unit,
      pieces,
      landing,
      mrp,
      stock,
      landingPiece: roundMoney(landing / pieces),
      mrpPiece: roundMoney(mrp / pieces),
    },
  };
}

function VariantFields({
  draft,
  onChange,
  showStock,
}: {
  draft: VariantDraft;
  onChange: (draft: VariantDraft) => void;
  showStock: boolean;
}) {
  const set = (key: keyof VariantDraft, value: string) =>
    onChange({ ...draft, [key]: value });

  const pieces = Number(draft.pieces_per_case);
  const perPiece = (value: string) =>
    pieces > 0 && value !== "" ? formatCurrency(Number(value) / pieces) : "-";

  return (
    <div className="ui-form-grid">
      <Field label="Variant name" required hint="Example: 500 ml, 1 L, 250 ml">
        <input
          value={draft.variant_name}
          onChange={(e) => set("variant_name", e.target.value)}
        />
      </Field>

      <Field label="Pieces in one case" required>
        <input
          type="number"
          min={1}
          step={1}
          value={draft.pieces_per_case}
          onChange={(e) => set("pieces_per_case", e.target.value)}
        />
      </Field>

      <Field label="Size (optional)">
        <input
          type="number"
          min={0}
          step="any"
          value={draft.size_value}
          onChange={(e) => set("size_value", e.target.value)}
        />
      </Field>

      <Field label="Unit">
        <select
          value={draft.size_unit}
          onChange={(e) => set("size_unit", e.target.value)}
        >
          {SIZE_UNITS.map((unit) => (
            <option key={unit}>{unit}</option>
          ))}
        </select>
      </Field>

      <Field
        label="Landing price per case (₹)"
        required
        hint={`Your cost per case · ${perPiece(draft.landing)} per piece`}
      >
        <input
          type="number"
          min={0}
          step="0.01"
          value={draft.landing}
          onChange={(e) => set("landing", e.target.value)}
        />
      </Field>

      <Field
        label="MRP per case (₹)"
        required
        hint={`Maximum retail price · ${perPiece(draft.mrp)} per piece`}
      >
        <input
          type="number"
          min={0}
          step="0.01"
          value={draft.mrp}
          onChange={(e) => set("mrp", e.target.value)}
        />
      </Field>

      {showStock && (
        <Field
          label="Opening stock (cases)"
          span={2}
          hint="Cases you already have today. Leave empty if you will record a purchase instead."
        >
          <input
            type="number"
            min={0}
            step={1}
            value={draft.stock}
            onChange={(e) => set("stock", e.target.value)}
          />
        </Field>
      )}
    </div>
  );
}

/* =========================================
   NEW PRODUCT
========================================= */

function NewProductModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const active = categories.filter((category) => category.is_active);

  const [categoryId, setCategoryId] = useState(active[0]?.id ?? "");
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!categoryId) {
      setError("Please choose a category. Create one in the Categories tab first.");
      return;
    }
    if (!productName.trim()) {
      setError("Please enter the product name.");
      return;
    }

    const parsed: NewVariantInput[] = [];
    const names = new Set<string>();

    for (let index = 0; index < variants.length; index += 1) {
      const result = parseVariant(variants[index], `Variant ${index + 1}`);

      if (result.error || !result.values) {
        setError(result.error ?? "Invalid variant.");
        return;
      }

      const key = result.values.name.toLowerCase();

      if (names.has(key)) {
        setError(`Variant name “${result.values.name}” is used twice.`);
        return;
      }
      names.add(key);

      const v = result.values;

      parsed.push({
        variant_name: v.name,
        size_value: v.size,
        size_unit: v.unit,
        pieces_per_case: v.pieces,
        landing_price_per_case: v.landing,
        mrp_per_case: v.mrp,
        landing_price_per_piece: v.landingPiece,
        mrp_per_piece: v.mrpPiece,
        initial_stock_cases: v.stock,
      });
    }

    setSaving(true);

    try {
      await productsApi.createWithVariants({
        categoryId,
        productName: productName.trim(),
        brandName: brandName.trim() || undefined,
        description: description.trim() || undefined,
        variants: parsed,
      });

      toast.success("Product added.");
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to add product."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add product"
      subtitle="A product has one or more sizes (variants), each sold by the case"
      size="lg"
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
            {saving ? "Saving..." : "Save product"}
          </button>
        </>
      }
    >
      {active.length === 0 ? (
        <div className="ui-hint-box">
          You have no active category yet. Open the <b>Categories</b> tab and
          create one (for example “Water”) before adding a product.
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="ui-form-grid">
            <Field label="Category" required>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {active.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Product name" required>
              <input
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  setError("");
                }}
                autoFocus
              />
            </Field>

            <Field label="Brand">
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </Field>

            <Field label="Description">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>

          <h4 style={{ margin: "24px 0 12px" }}>Variants (sizes)</h4>

          <div className="ui-lines">
            {variants.map((variant, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #e9edf3",
                  borderRadius: 10,
                  padding: 16,
                  background: "#fafbfd",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <strong style={{ fontSize: 13 }}>Variant {index + 1}</strong>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      className="ui-icon-btn ui-danger"
                      onClick={() =>
                        setVariants(variants.filter((_, i) => i !== index))
                      }
                      aria-label="Remove variant"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <VariantFields
                  draft={variant}
                  showStock
                  onChange={(next) => {
                    setVariants(variants.map((v, i) => (i === index ? next : v)));
                    setError("");
                  }}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="ui-btn ui-btn-outline ui-btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => setVariants([...variants, emptyVariant])}
          >
            <Plus size={14} />
            Add another size
          </button>

          <button type="submit" hidden />
        </form>
      )}

      <FormError message={error} />
    </Modal>
  );
}

/* =========================================
   ADD / EDIT ONE VARIANT
========================================= */

function VariantModal({
  product,
  variant,
  onClose,
  onSaved,
}: {
  product: Product;
  variant: Variant | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<VariantDraft>(
    variant ? draftFromVariant(variant) : emptyVariant
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const result = parseVariant(draft, "Variant");

    if (result.error || !result.values) {
      setError(result.error ?? "Invalid variant.");
      return;
    }

    const v = result.values;

    setSaving(true);

    try {
      if (variant) {
        await productsApi.updateVariant(variant.id, {
          variantName: v.name,
          sizeValue: v.size,
          sizeUnit: v.unit,
          piecesPerCase: v.pieces,
          landingPricePerCase: v.landing,
          mrpPerCase: v.mrp,
          landingPricePerPiece: v.landingPiece,
          mrpPerPiece: v.mrpPiece,
        });

        toast.success("Variant updated.");
      } else {
        const response = await productsApi.addVariant({
          productId: product.id,
          variantName: v.name,
          ...(v.size !== null && { sizeValue: v.size, sizeUnit: v.unit ?? "ml" }),
          piecesPerCase: v.pieces,
          landingPricePerCase: v.landing,
          mrpPerCase: v.mrp,
        });

        const newId = (response.data as { variant?: { id: string } }).variant?.id;

        if (newId && v.stock > 0) {
          await inventoryApi.addMovement({
            product_variant_id: newId,
            movement_type: "opening_stock",
            quantity_cases: v.stock,
            remarks: "Opening stock entered while adding the variant",
          });
        }

        toast.success("Variant added.");
      }

      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save variant."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={variant ? "Edit variant & prices" : "Add variant"}
      subtitle={product.product_name}
      size="md"
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
      <form onSubmit={submit}>
        <VariantFields
          draft={draft}
          showStock={!variant}
          onChange={(next) => {
            setDraft(next);
            setError("");
          }}
        />
        <button type="submit" hidden />
      </form>

      {variant && (
        <p className="ui-footer-note">
          Changing prices only affects future sales and purchases. Past sales
          keep the cost and price recorded at that time.
        </p>
      )}

      <FormError message={error} />
    </Modal>
  );
}

/* =========================================
   EDIT PRODUCT
========================================= */

function EditProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [productName, setProductName] = useState(product.product_name);
  const [brandName, setBrandName] = useState(product.brand_name ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!productName.trim()) {
      setError("Product name is required.");
      return;
    }

    setSaving(true);

    try {
      await productsApi.update(product.id, {
        categoryId,
        productName: productName.trim(),
        brandName: brandName.trim() || null,
        description: description.trim() || null,
      });

      toast.success("Product updated.");
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Edit product"
      size="md"
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
            {saving ? "Saving..." : "Save changes"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="ui-form-grid">
        <Field label="Category">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories
              .filter(
                (category) =>
                  category.is_active || category.id === product.category_id
              )
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </Field>

        <Field label="Product name" required>
          <input
            value={productName}
            onChange={(e) => {
              setProductName(e.target.value);
              setError("");
            }}
          />
        </Field>

        <Field label="Brand">
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
          />
        </Field>

        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <button type="submit" hidden />
      </form>

      <FormError message={error} />
    </Modal>
  );
}

/* =========================================
   TAB
========================================= */

export default function ProductsTab({
  products,
  categories,
  onChanged,
}: {
  products: Product[];
  categories: Category[];
  onChanged: () => void;
}) {
  const { isOwner } = useAuth();

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [variantModal, setVariantModal] = useState<{
    product: Product;
    variant: Variant | null;
  } | null>(null);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return products;

    return products.filter((product) =>
      [
        product.product_name,
        product.brand_name,
        product.product_categories?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [products, search]);

  async function toggleProduct(product: Product) {
    try {
      await productsApi.update(product.id, { isActive: !product.is_active });
      toast.success(product.is_active ? "Product disabled." : "Product enabled.");
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function toggleVariant(variant: Variant) {
    try {
      await productsApi.updateVariant(variant.id, {
        isActive: !variant.is_active,
      });
      toast.success(variant.is_active ? "Variant disabled." : "Variant enabled.");
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Panel
      title="Products & prices"
      subtitle="Prices are per case. Disabled items are hidden from new sales and purchases."
      actions={
        isOwner && (
          <button
            className="ui-btn ui-btn-primary"
            onClick={() => setCreating(true)}
          >
            <Plus size={16} />
            Add product
          </button>
        )
      }
    >
      <div className="ui-toolbar">
        <div className="ui-search">
          <Search size={16} />
          <input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={products.length === 0 ? "No products yet" : "No matching products"}
          text={
            products.length === 0
              ? isOwner
                ? "Add your first product with its case size and prices."
                : "The owner has not added any product yet."
              : "Try a different search."
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((product) => (
            <div
              key={product.id}
              style={{
                border: "1px solid #e9edf3",
                borderRadius: 12,
                overflow: "hidden",
                opacity: product.is_active ? 1 : 0.65,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "14px 16px",
                  background: "#f8fafc",
                }}
              >
                <div>
                  <strong style={{ color: "#172033" }}>
                    {product.product_name}
                  </strong>
                  <span className="ui-sub">
                    {[product.brand_name, product.product_categories?.name]
                      .filter(Boolean)
                      .join(" · ") || "No brand"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {!product.is_active && <Badge tone="gray">Disabled</Badge>}

                  {isOwner && (
                    <>
                      <button
                        className="ui-btn ui-btn-outline ui-btn-sm"
                        onClick={() =>
                          setVariantModal({ product, variant: null })
                        }
                      >
                        <Plus size={13} />
                        Variant
                      </button>
                      <button
                        className="ui-icon-btn"
                        title="Edit product"
                        onClick={() => setEditProduct(product)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="ui-icon-btn"
                        title={product.is_active ? "Disable" : "Enable"}
                        onClick={() => toggleProduct(product)}
                      >
                        <Power size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="ui-table-wrap">
                <table className="ui-table" style={{ minWidth: 560 }}>
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th className="ui-num">Pieces / case</th>
                      <th className="ui-num">Landing / case</th>
                      <th className="ui-num">MRP / case</th>
                      <th className="ui-num">Margin / case</th>
                      <th>Status</th>
                      {isOwner && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {product.product_variants.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ color: "#8992a3" }}>
                          No variants yet.
                        </td>
                      </tr>
                    ) : (
                      product.product_variants.map((variant) => (
                        <tr
                          key={variant.id}
                          style={{ opacity: variant.is_active ? 1 : 0.55 }}
                        >
                          <td className="ui-strong">{variant.variant_name}</td>
                          <td className="ui-num">{variant.pieces_per_case}</td>
                          <td className="ui-num">
                            {formatCurrency(variant.landing_price_per_case)}
                          </td>
                          <td className="ui-num">
                            {formatCurrency(variant.mrp_per_case)}
                          </td>
                          <td className="ui-num">
                            {formatCurrency(
                              Number(variant.mrp_per_case) -
                                Number(variant.landing_price_per_case)
                            )}
                          </td>
                          <td>
                            <Badge tone={variant.is_active ? "green" : "gray"}>
                              {variant.is_active ? "Active" : "Disabled"}
                            </Badge>
                          </td>
                          {isOwner && (
                            <td>
                              <div className="ui-row-actions">
                                <button
                                  className="ui-icon-btn"
                                  title="Edit prices"
                                  onClick={() =>
                                    setVariantModal({ product, variant })
                                  }
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="ui-icon-btn"
                                  title={variant.is_active ? "Disable" : "Enable"}
                                  onClick={() => toggleVariant(variant)}
                                >
                                  <Power size={15} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <NewProductModal
          categories={categories}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            onChanged();
          }}
        />
      )}

      {editProduct && (
        <EditProductModal
          product={editProduct}
          categories={categories}
          onClose={() => setEditProduct(null)}
          onSaved={() => {
            setEditProduct(null);
            onChanged();
          }}
        />
      )}

      {variantModal && (
        <VariantModal
          product={variantModal.product}
          variant={variantModal.variant}
          onClose={() => setVariantModal(null)}
          onSaved={() => {
            setVariantModal(null);
            onChanged();
          }}
        />
      )}
    </Panel>
  );
}
