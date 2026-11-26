/** Indian GSTIN: 2-digit state code + PAN + entity no. + "Z" + checksum (15 chars). */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function normalizeGstin(value: string) {
  return value.replace(/[^0-9a-zA-Z]/g, "").toUpperCase().slice(0, 15);
}

/** Returns an error message, or "" when empty / valid. */
export function gstinError(value: string) {
  const text = value.trim();

  if (!text) return "";

  return GSTIN_PATTERN.test(text)
    ? ""
    : "Enter a valid 15-character GSTIN (example 33ABCDE1234F1Z5).";
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export interface TaxInputLine {
  /** cases x price per case (before discount) */
  amount: number;
  /** total GST % of the product (CGST + SGST); 0 for water */
  gstPercent: number;
}

export interface TaxedLine {
  amount: number;
  discount: number;
  taxable: number;
  gstPercent: number;
  cgst: number;
  sgst: number;
  net: number;
}

/**
 * Same rules as the database function create_sale:
 *  - invoice discount is shared across lines in proportion to line amount
 *    (the last line takes the rounding rest),
 *  - price EXCLUDES GST, CGST = SGST = taxable x (GST% / 2) / 100.
 */
export function computeSaleTax(lines: TaxInputLine[], discount: number) {
  const subtotal = lines.reduce((total, line) => total + line.amount, 0);
  let allocated = 0;

  const taxed: TaxedLine[] = lines.map((line, index) => {
    let lineDiscount: number;

    if (index === lines.length - 1) {
      lineDiscount = round2(discount - allocated);
    } else if (subtotal > 0) {
      lineDiscount = round2((discount * line.amount) / subtotal);
    } else {
      lineDiscount = 0;
    }

    allocated = round2(allocated + lineDiscount);

    const taxable = round2(line.amount - lineDiscount);
    const half = round2((taxable * (line.gstPercent / 2)) / 100);

    return {
      amount: line.amount,
      discount: lineDiscount,
      taxable,
      gstPercent: line.gstPercent,
      cgst: half,
      sgst: half,
      net: round2(taxable + half * 2),
    };
  });

  const taxable = round2(taxed.reduce((total, line) => total + line.taxable, 0));
  const gst = round2(taxed.reduce((total, line) => total + line.cgst + line.sgst, 0));

  return { lines: taxed, subtotal: round2(subtotal), taxable, gst, total: round2(taxable + gst) };
}
