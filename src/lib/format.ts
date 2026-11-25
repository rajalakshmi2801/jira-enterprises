import axios from "axios";

export function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** yyyy-mm-dd in the user's local time zone (for <input type="date">). */
export function toDateInput(date: Date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

/** yyyy-mm-ddThh:mm in local time (for <input type="datetime-local">). */
export function toDateTimeInput(value?: string | null) {
  const date = value ? new Date(value) : new Date();

  return `${toDateInput(date)}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

/** Converts a date / datetime-local input value to an ISO string. */
export function inputToIso(value: string) {
  return new Date(value).toISOString();
}

/** Turns a plain date (yyyy-mm-dd) into ISO at the current time of day. */
export function dateInputToIso(value: string) {
  const now = new Date();
  const [year, month, day] = value.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds()
  ).toISOString();
}

/** Extracts the best human readable message from any thrown value. */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (!error.response) {
      return "Cannot reach the server. Please check that the backend is running.";
    }

    return error.response.data?.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Supabase returns many-to-one relations as an object, but be defensive. */
export function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;

  return value ?? null;
}

export function downloadCsv(
  filename: string,
  rows: Array<Array<string | number | null | undefined>>
) {
  const escape = (cell: string | number | null | undefined) => {
    const text = cell === null || cell === undefined ? "" : String(cell);

    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/** True when the given date/time is now or in the past. */
export function isPast(value: string | null | undefined) {
  if (!value) return false;

  return new Date(value).getTime() <= Date.now();
}
