import { useEffect, type ReactNode } from "react";
import {
  AlertCircle,
  Inbox,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";

/* =========================================
   PAGE HEADER
========================================= */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="ui-page-header">
      <div>
        <span className="ui-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {actions && <div className="ui-header-actions">{actions}</div>}
    </div>
  );
}

/* =========================================
   STATES
========================================= */

export function LoadingState({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="ui-state">
      <LoaderCircle size={26} className="spin-icon" />
      <p>{text}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="ui-state ui-state-error">
      <AlertCircle size={28} />
      <p>{message}</p>

      {onRetry && (
        <button className="ui-btn ui-btn-outline" onClick={onRetry}>
          <RefreshCw size={15} />
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ui-state">
      <Inbox size={32} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/* =========================================
   CARDS
========================================= */

export type Tone = "blue" | "green" | "orange" | "purple" | "red";

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="ui-stat">
      <div className={`ui-stat-icon ui-tone-${tone}`}>{icon}</div>

      <div>
        <span>{label}</span>
        <h3>{value}</h3>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ui-panel">
      {(title || actions) && (
        <div className="ui-panel-header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>

          {actions && <div className="ui-header-actions">{actions}</div>}
        </div>
      )}

      {children}
    </section>
  );
}

export function Badge({
  tone = "blue",
  children,
}: {
  tone?: Tone | "gray";
  children: ReactNode;
}) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}

/* =========================================
   TABS
========================================= */

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="ui-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === active}
          className={tab.id === active ? "ui-tab ui-tab-active" : "ui-tab"}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* =========================================
   MODAL
========================================= */

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="ui-modal-overlay" onMouseDown={onClose}>
      <section
        className={`ui-modal ui-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="ui-modal-body">{children}</div>

        {footer && <footer className="ui-modal-footer">{footer}</footer>}
      </section>
    </div>
  );
}

/* =========================================
   FORM FIELD
========================================= */

export function Field({
  label,
  hint,
  required,
  children,
  span,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  span?: 2 | 3;
}) {
  return (
    <label className={`ui-field ${span ? `ui-span-${span}` : ""}`}>
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="ui-form-error" role="alert">
      <AlertCircle size={16} />
      {message}
    </div>
  );
}
