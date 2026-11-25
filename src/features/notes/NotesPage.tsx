import { useState } from "react";
import toast from "react-hot-toast";
import {
  BellRing,
  CheckCircle2,
  Circle,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  Badge,
  EmptyState,
  ErrorState,
  Field,
  FormError,
  LoadingState,
  Modal,
  PageHeader,
  StatCard,
  Tabs,
} from "../../components/ui";
import { useAuth } from "../auth/useAuth";
import { useAsync } from "../../lib/useAsync";
import {
  isPast,
  formatDateTime,
  getErrorMessage,
  toDateTimeInput,
} from "../../lib/format";
import { notesApi, type Note } from "../../services/business.api";

type Filter = "all" | "pending" | "completed";

function NoteForm({
  note,
  onClose,
  onSaved,
}: {
  note: Note | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [description, setDescription] = useState(note?.description ?? "");
  const [reminder, setReminder] = useState(
    note?.reminder_at ? toDateTimeInput(note.reminder_at) : ""
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    setSaving(true);

    try {
      const input = {
        title: title.trim(),
        description: description.trim() || null,
        reminder_at: reminder ? new Date(reminder).toISOString() : null,
      };

      if (note) {
        await notesApi.update(note.id, input);
        toast.success("Note updated.");
      } else {
        await notesApi.create(input);
        toast.success("Note added.");
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
      title={note ? "Edit note" : "Add note"}
      subtitle="Reminders appear on the dashboard until you complete them"
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
            {saving ? "Saving..." : "Save note"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="ui-form-grid">
        <Field label="Title" required span={2}>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            placeholder="e.g. Call Sri Balaji Stores about pending payment"
            autoFocus
          />
        </Field>

        <Field label="Details" span={2}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Remind me at (optional)" span={2}>
          <input
            type="datetime-local"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          />
        </Field>
        <button type="submit" hidden />
      </form>

      <FormError message={error} />
    </Modal>
  );
}

export default function NotesPage() {
  const { isOwner } = useAuth();
  const [filter, setFilter] = useState<Filter>("pending");
  const [editing, setEditing] = useState<Note | "new" | null>(null);

  const { data, loading, error, reload } = useAsync(
    () => notesApi.list(filter),
    [filter]
  );
  const pendingCount = useAsync(() => notesApi.list("pending"), []);

  const notes = data ?? [];
  const dueCount = (pendingCount.data ?? []).filter((note) =>
    isPast(note.reminder_at)
  ).length;

  function reloadAll() {
    reload();
    pendingCount.reload();
  }

  async function toggle(note: Note) {
    try {
      await notesApi.setCompleted(note.id, !note.is_completed);
      reloadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function remove(note: Note) {
    if (!window.confirm(`Delete the note "${note.title}"?`)) return;

    try {
      await notesApi.remove(note.id);
      toast.success("Note deleted.");
      reloadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="REMINDERS"
        title="Notes"
        description="Business notes and reminders - follow-ups, orders to place, payments to chase."
        actions={
          <>
            <button className="ui-btn ui-btn-outline" onClick={reloadAll}>
              <RefreshCw size={15} />
              Refresh
            </button>
            {isOwner && (
              <button
                className="ui-btn ui-btn-primary"
                onClick={() => setEditing("new")}
              >
                <Plus size={16} />
                Add note
              </button>
            )}
          </>
        }
      />

      <div className="ui-stats">
        <StatCard
          icon={<NotebookPen size={21} />}
          label="Pending notes"
          value={pendingCount.data?.length ?? 0}
        />
        <StatCard
          tone={dueCount > 0 ? "red" : "green"}
          icon={<BellRing size={21} />}
          label="Reminders due"
          value={dueCount}
        />
      </div>

      <Tabs<Filter>
        active={filter}
        onChange={setFilter}
        tabs={[
          { id: "pending", label: "Pending" },
          { id: "completed", label: "Completed" },
          { id: "all", label: "All" },
        ]}
      />

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : notes.length === 0 ? (
        <div className="ui-panel">
          <EmptyState
            title="No notes here"
            text={
              isOwner
                ? "Add a note to remember something important."
                : "Notes added by the owner will appear here."
            }
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notes.map((note) => {
            const overdue = !note.is_completed && isPast(note.reminder_at);

            return (
              <div
                key={note.id}
                className="ui-panel"
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: 16,
                  opacity: note.is_completed ? 0.7 : 1,
                  borderColor: overdue ? "#f5c6c6" : undefined,
                }}
              >
                {isOwner ? (
                  <button
                    className="ui-icon-btn"
                    style={{ border: 0, flexShrink: 0 }}
                    onClick={() => toggle(note)}
                    title={note.is_completed ? "Mark as pending" : "Mark as done"}
                  >
                    {note.is_completed ? (
                      <CheckCircle2 size={22} color="#159957" />
                    ) : (
                      <Circle size={22} />
                    )}
                  </button>
                ) : (
                  <span style={{ paddingTop: 4 }}>
                    {note.is_completed ? (
                      <CheckCircle2 size={22} color="#159957" />
                    ) : (
                      <Circle size={22} color="#94a3b8" />
                    )}
                  </span>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong
                    style={{
                      color: "#172033",
                      textDecoration: note.is_completed ? "line-through" : "none",
                    }}
                  >
                    {note.title}
                  </strong>
                  {note.description && (
                    <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
                      {note.description}
                    </p>
                  )}
                  {note.reminder_at && (
                    <div style={{ marginTop: 8 }}>
                      <Badge tone={overdue ? "red" : "blue"}>
                        <BellRing
                          size={11}
                          style={{ verticalAlign: "-1px", marginRight: 4 }}
                        />
                        {formatDateTime(note.reminder_at)}
                        {overdue ? " · due" : ""}
                      </Badge>
                    </div>
                  )}
                </div>

                {isOwner && (
                  <div className="ui-row-actions">
                    <button
                      className="ui-icon-btn"
                      title="Edit"
                      onClick={() => setEditing(note)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="ui-icon-btn ui-danger"
                      title="Delete"
                      onClick={() => remove(note)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <NoteForm
          note={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reloadAll();
          }}
        />
      )}
    </div>
  );
}
