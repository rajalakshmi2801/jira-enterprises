import { useState } from "react";
import toast from "react-hot-toast";
import { KeyRound, Plus, Power, RefreshCw, ShieldCheck, UserRound } from "lucide-react";

import {
  Badge,
  EmptyState,
  ErrorState,
  Field,
  FormError,
  LoadingState,
  Modal,
  PageHeader,
  Panel,
  StatCard,
} from "../../components/ui";
import { useAuth } from "../auth/useAuth";
import ChangePinModal from "../auth/ChangePinModal";
import { useAsync } from "../../lib/useAsync";
import { formatDate, getErrorMessage } from "../../lib/format";
import { usersApi, type UserRow } from "../../services/business.api";

/* =========================================
   ADD VIEWER
========================================= */

function AddViewerModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    ownerName: "",
    mobile: "",
    email: "",
    pin: "",
    confirmPin: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.ownerName.trim()) {
      setError("Enter the viewer's name.");
      return;
    }
    if (!/^\+?[0-9]{10,15}$/.test(form.mobile.trim())) {
      setError("Enter a valid mobile number (10 to 15 digits).");
      return;
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Enter a valid email or leave it empty.");
      return;
    }
    if (!/^\d{6}$/.test(form.pin)) {
      setError("The PIN must be exactly 6 digits.");
      return;
    }
    if (form.pin !== form.confirmPin) {
      setError("The two PIN entries do not match.");
      return;
    }

    setSaving(true);

    try {
      await usersApi.createViewer({
        ownerName: form.ownerName.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim() || undefined,
        pin: form.pin,
      });

      toast.success("Viewer added. Share the mobile number and PIN with them.");
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to add viewer."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add viewer"
      subtitle="Viewers can see everything but cannot add, edit or delete anything"
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
            {saving ? "Saving..." : "Add viewer"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="ui-form-grid">
        <Field label="Name" required>
          <input
            value={form.ownerName}
            onChange={(e) => set("ownerName", e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Mobile number" required hint="Used to sign in">
          <input
            type="tel"
            value={form.mobile}
            onChange={(e) => set("mobile", e.target.value.replace(/[^\d+]/g, ""))}
            maxLength={16}
          />
        </Field>
        <Field label="Email (optional)" span={2}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="6-digit PIN" required>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={form.pin}
            onChange={(e) => set("pin", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="Confirm PIN" required>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={form.confirmPin}
            onChange={(e) => set("confirmPin", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <button type="submit" hidden />
      </form>

      <FormError message={error} />
    </Modal>
  );
}

/* =========================================
   RESET PIN
========================================= */

function ResetPinModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!/^\d{6}$/.test(pin)) {
      setError("The PIN must be exactly 6 digits.");
      return;
    }
    if (pin !== confirm) {
      setError("The two PIN entries do not match.");
      return;
    }

    setSaving(true);

    try {
      await usersApi.resetPin(user.id, pin);
      toast.success(`PIN changed for ${user.owner_name}. They must sign in again.`);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to change the PIN."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Reset PIN"
      subtitle={`${user.owner_name} · ${user.mobile}`}
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
            {saving ? "Saving..." : "Change PIN"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="ui-form-grid">
        <Field label="New 6-digit PIN" required span={2}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setError("");
            }}
            autoFocus
          />
        </Field>
        <Field label="Confirm PIN" required span={2}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value.replace(/\D/g, ""));
              setError("");
            }}
          />
        </Field>
        <button type="submit" hidden />
      </form>

      <FormError message={error} />
    </Modal>
  );
}

/* =========================================
   PAGE
========================================= */

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data, loading, error, reload } = useAsync(() => usersApi.list(), []);

  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<UserRow | null>(null);
  const [changingOwn, setChangingOwn] = useState(false);

  const users = data ?? [];
  const viewers = users.filter((user) => user.role === "viewer");

  async function toggle(target: UserRow) {
    const action = target.is_active ? "deactivate" : "reactivate";

    if (
      !window.confirm(
        `Do you want to ${action} ${target.owner_name}?${
          target.is_active ? " They will be signed out immediately." : ""
        }`
      )
    ) {
      return;
    }

    try {
      await usersApi.setStatus(target.id, !target.is_active);
      toast.success(`User ${target.is_active ? "deactivated" : "reactivated"}.`);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="ACCESS CONTROL"
        title="Users"
        description="Add view-only team members. Only the owner can change data."
        actions={
          <>
            <button className="ui-btn ui-btn-outline" onClick={reload}>
              <RefreshCw size={15} />
              Refresh
            </button>
            <button
              className="ui-btn ui-btn-primary"
              onClick={() => setAdding(true)}
            >
              <Plus size={16} />
              Add viewer
            </button>
          </>
        }
      />

      <div className="ui-stats">
        <StatCard
          icon={<ShieldCheck size={21} />}
          label="Owner"
          value={users.filter((user) => user.role === "owner").length}
        />
        <StatCard
          tone="purple"
          icon={<UserRound size={21} />}
          label="Viewers"
          value={viewers.length}
          hint={`${viewers.filter((user) => user.is_active).length} active`}
        />
      </div>

      <Panel title="Team members">
        {loading && !data ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : users.length === 0 ? (
          <EmptyState title="No users" />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="ui-strong">
                      {user.owner_name}
                      {user.id === me?.id && <span className="ui-sub">You</span>}
                    </td>
                    <td>{user.mobile}</td>
                    <td>{user.email || "-"}</td>
                    <td>
                      <Badge tone={user.role === "owner" ? "blue" : "purple"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={user.is_active ? "green" : "gray"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className="ui-row-actions">
                        <button
                          className="ui-icon-btn"
                          title={
                            user.id === me?.id ? "Change my PIN" : "Reset PIN"
                          }
                          onClick={() =>
                            user.id === me?.id
                              ? setChangingOwn(true)
                              : setResetting(user)
                          }
                        >
                          <KeyRound size={15} />
                        </button>
                        {user.role !== "owner" && (
                          <button
                            className="ui-icon-btn"
                            title={user.is_active ? "Deactivate" : "Reactivate"}
                            onClick={() => toggle(user)}
                          >
                            <Power size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {adding && (
        <AddViewerModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            reload();
          }}
        />
      )}

      {changingOwn && (
        <ChangePinModal onClose={() => setChangingOwn(false)} />
      )}

      {resetting && (
        <ResetPinModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSaved={() => {
            setResetting(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
