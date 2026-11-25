import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Power } from "lucide-react";

import {
  Badge,
  EmptyState,
  Field,
  FormError,
  Modal,
  Panel,
} from "../../components/ui";
import { useAuth } from "../auth/useAuth";
import { formatDate, getErrorMessage } from "../../lib/format";
import { categoriesApi, type Category } from "../../services/business.api";

function CategoryForm({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (name.trim().length < 2) {
      setError("Category name must have at least 2 characters.");
      return;
    }

    setSaving(true);

    try {
      const input = {
        name: name.trim(),
        description: description.trim() || null,
      };

      if (category) {
        await categoriesApi.update(category.id, input);
        toast.success("Category updated.");
      } else {
        await categoriesApi.create(input);
        toast.success("Category added.");
      }

      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={category ? "Edit category" : "Add category"}
      subtitle="Examples: Water bottles, Juice, Soft drinks"
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
        <Field label="Category name" required span={2}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            autoFocus
          />
        </Field>
        <Field label="Description" span={2}>
          <textarea
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

export default function CategoriesTab({
  categories,
  onChanged,
}: {
  categories: Category[];
  onChanged: () => void;
}) {
  const { isOwner } = useAuth();
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  async function toggle(category: Category) {
    try {
      await categoriesApi.setStatus(category.id, !category.is_active);
      toast.success(category.is_active ? "Category disabled." : "Category enabled.");
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Panel
      title="Product categories"
      subtitle="Group your products. Disabled categories cannot be used for new products."
      actions={
        isOwner && (
          <button
            className="ui-btn ui-btn-primary"
            onClick={() => setEditing("new")}
          >
            <Plus size={16} />
            Add category
          </button>
        )
      }
    >
      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          text={
            isOwner
              ? "Create a category first (for example “Water”), then add products to it."
              : "The owner has not created any category yet."
          }
        />
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created</th>
                <th>Status</th>
                {isOwner && <th />}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="ui-strong">{category.name}</td>
                  <td>{category.description || "-"}</td>
                  <td>{formatDate(category.created_at)}</td>
                  <td>
                    <Badge tone={category.is_active ? "green" : "gray"}>
                      {category.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  {isOwner && (
                    <td>
                      <div className="ui-row-actions">
                        <button
                          className="ui-icon-btn"
                          title="Edit"
                          onClick={() => setEditing(category)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="ui-icon-btn"
                          title={category.is_active ? "Disable" : "Enable"}
                          onClick={() => toggle(category)}
                        >
                          <Power size={15} />
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

      {editing && (
        <CategoryForm
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </Panel>
  );
}
