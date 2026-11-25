import { useState } from "react";
import toast from "react-hot-toast";
import { Save } from "lucide-react";

import {
  ErrorState,
  Field,
  FormError,
  LoadingState,
  PageHeader,
  Panel,
} from "../../components/ui";
import Logo from "../../components/Logo";
import { useAuth } from "../auth/useAuth";
import { useAsync } from "../../lib/useAsync";
import { getErrorMessage } from "../../lib/format";
import {
  settingsApi,
  type BusinessSettings,
} from "../../services/business.api";

function SettingsForm({
  settings,
  canEdit,
  onSaved,
}: {
  settings: BusinessSettings;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [businessName, setBusinessName] = useState(settings.business_name ?? "");
  const [ownerName, setOwnerName] = useState(settings.owner_name);
  const [email, setEmail] = useState(settings.email ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (businessName.trim().length < 2) {
      setError("Business name must have at least 2 characters.");
      return;
    }
    if (ownerName.trim().length < 2) {
      setError("Owner name must have at least 2 characters.");
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);

    try {
      await settingsApi.update({
        business_name: businessName.trim(),
        owner_name: ownerName.trim(),
        email: email.trim() || null,
      });

      toast.success("Settings saved.");
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="ui-form-grid">
        <Field label="Business name" span={2}>
          <input
            value={businessName}
            onChange={(e) => {
              setBusinessName(e.target.value);
              setError("");
            }}
            placeholder="Jira Enterprises"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Owner name">
          <input
            value={ownerName}
            onChange={(e) => {
              setOwnerName(e.target.value);
              setError("");
            }}
            disabled={!canEdit}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!canEdit}
          />
        </Field>

        <Field label="Owner mobile (login ID)" hint="The mobile number cannot be changed here." span={2}>
          <input value={settings.mobile} disabled />
        </Field>
      </div>

      <FormError message={error} />

      {canEdit && (
        <div style={{ marginTop: 20 }}>
          <button className="ui-btn ui-btn-primary" disabled={saving}>
            <Save size={15} />
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      )}
    </form>
  );
}

export default function SettingsPage() {
  const { isOwner, user } = useAuth();
  const { data, loading, error, reload } = useAsync(
    () => settingsApi.get(),
    []
  );

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="PREFERENCES"
        title="Settings"
        description="Business profile shown across the application."
      />

      {!isOwner && (
        <div className="ui-readonly-banner">
          You are signed in as a viewer. Settings are view-only for your account.
        </div>
      )}

      <div className="ui-grid-2" style={{ gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)" }}>
        <Panel title="Business profile">
          {loading && !data ? (
            <LoadingState />
          ) : error || !data ? (
            <ErrorState message={error ?? "Settings not found."} onRetry={reload} />
          ) : (
            <SettingsForm
              key={`${data.business_name}-${data.owner_name}-${data.email}`}
              settings={data}
              canEdit={isOwner}
              onSaved={reload}
            />
          )}
        </Panel>

        <Panel title="Brand & account">
          <div style={{ maxWidth: 260, margin: "0 auto 18px" }}>
            <Logo />
          </div>
          <div className="ui-kv">
            <span>Signed in as</span>
            <strong>{user?.ownerName}</strong>
          </div>
          <div className="ui-kv">
            <span>Access level</span>
            <strong>{isOwner ? "Owner (full access)" : "Viewer (view only)"}</strong>
          </div>
          <div className="ui-kv">
            <span>Tagline</span>
            <strong>Freshness Reaches You</strong>
          </div>
        </Panel>
      </div>
    </div>
  );
}
