import Logo from "../../components/Logo";
import { firstOf, formatDate, formatDateTime } from "../../lib/format";
import { amountInWords } from "../../lib/words";
import {
  paidOf,
  type BusinessSettings,
  type Sale,
} from "../../services/business.api";

const fmt = (value: number) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** The printable GST tax invoice (layout follows the distributor's standard format). */
export default function InvoiceDocument({
  sale,
  settings,
}: {
  sale: Sale;
  settings: BusinessSettings | null;
}) {
  const customer = firstOf(sale.customers);

  const rows = sale.sale_items.map((item) => {
    const amount = Number(item.subtotal);
    const discount = Number(item.discount_amount ?? 0);
    // Older sales (before GST was added) have no taxable value saved.
    const taxable =
      item.taxable_value !== null && item.taxable_value !== undefined
        ? Number(item.taxable_value)
        : amount - discount;
    const gstPercent = Number(item.gst_percent ?? 0);
    const cgst = Number(item.cgst_amount ?? 0);
    const sgst = Number(item.sgst_amount ?? 0);

    return {
      id: item.id,
      hsn: item.hsn_code || "-",
      description: `${item.product_variants?.products?.product_name ?? "Product"} ${
        item.product_variants?.variant_name ?? ""
      }`.trim(),
      cases: Number(item.quantity_cases),
      rate: Number(item.selling_price_per_case),
      amount,
      discount,
      taxable,
      halfRate: gstPercent / 2,
      cgst,
      sgst,
      net: taxable + cgst + sgst,
    };
  });

  const sum = (pick: (row: (typeof rows)[number]) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);

  const hasGst = rows.some((row) => row.halfRate > 0);
  const invoiceValue = Number(sale.total_amount);
  const paid = paidOf(sale);
  const balance = Math.max(invoiceValue - paid, 0);
  const businessName = settings?.business_name || "Jira Enterprises";

  return (
    <div className="invoice-sheet">
      <div className="invoice-top">
        <div className="invoice-logo">
          <Logo />
        </div>
        <div className="invoice-datetime">{formatDateTime(sale.sale_date)}</div>
      </div>

      <h2 className="invoice-title">{hasGst ? "TAX INVOICE" : "INVOICE"}</h2>

      <div className="invoice-parties">
        <p>
          <b>Supplier :</b> {businessName.toUpperCase()}
          {settings?.business_address && <> &nbsp;Address : {settings.business_address}</>}
          {settings?.mobile && <> &nbsp;Mobile : {settings.mobile}</>}
          {settings?.gst_number && (
            <>
              {" "}
              &nbsp;GSTIN No : <b>{settings.gst_number}</b>
            </>
          )}
        </p>
        <p>
          <b>Recipient :</b>{" "}
          {customer
            ? (customer.shop_name || customer.customer_name).toUpperCase()
            : "WALK-IN CUSTOMER"}
          {customer?.address && <> &nbsp;Address : {customer.address}</>}
          {customer?.mobile && <> &nbsp;{customer.mobile}</>}
          {customer?.gst_number && (
            <>
              {" "}
              &nbsp;GSTIN NO : <b>{customer.gst_number}</b>
            </>
          )}
        </p>
        <div className="invoice-meta">
          <span>
            Lic No : {settings?.licence_number || "-"}
          </span>
          <span>
            Lic Exp Date :{" "}
            {settings?.licence_expiry ? formatDate(settings.licence_expiry) : "-"}
          </span>
        </div>
        <div className="invoice-meta invoice-meta-line">
          <span>
            <b>Invoice No - Date :</b> {sale.invoice_number || sale.id.slice(0, 8)} -{" "}
            {formatDate(sale.sale_date)}
          </span>
        </div>
      </div>

      <div className="invoice-table-wrap">
        <table className="invoice-table">
          <thead>
            <tr>
              <th rowSpan={2}>HSN Code</th>
              <th rowSpan={2} className="left">
                Description of Goods
              </th>
              <th rowSpan={2}>Qty (CS)</th>
              <th rowSpan={2}>Rate</th>
              <th rowSpan={2}>Total</th>
              <th rowSpan={2}>Discount</th>
              <th rowSpan={2}>Taxable Value</th>
              <th colSpan={2}>CGST</th>
              <th colSpan={2}>SGST</th>
              <th colSpan={2}>CESS</th>
              <th rowSpan={2}>Net Amt</th>
            </tr>
            <tr>
              <th>Rate%</th>
              <th>Amt</th>
              <th>Rate%</th>
              <th>Amt</th>
              <th>Rate%</th>
              <th>Amt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.hsn}</td>
                <td className="left">{row.description}</td>
                <td>{row.cases.toFixed(2)}</td>
                <td className="num">{fmt(row.rate)}</td>
                <td className="num">{fmt(row.amount)}</td>
                <td className="num">{fmt(row.discount)}</td>
                <td className="num">{fmt(row.taxable)}</td>
                <td>{row.halfRate}</td>
                <td className="num">{fmt(row.cgst)}</td>
                <td>{row.halfRate}</td>
                <td className="num">{fmt(row.sgst)}</td>
                <td>0</td>
                <td className="num">0</td>
                <td className="num">{fmt(row.net)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="left">
                <b>Total</b>
              </td>
              <td className="num">{fmt(sum((row) => row.amount))}</td>
              <td className="num">{fmt(sum((row) => row.discount))}</td>
              <td className="num">{fmt(sum((row) => row.taxable))}</td>
              <td />
              <td className="num">{fmt(sum((row) => row.cgst))}</td>
              <td />
              <td className="num">{fmt(sum((row) => row.sgst))}</td>
              <td />
              <td className="num">0.00</td>
              <td className="num">{fmt(sum((row) => row.net))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="invoice-summary">
        <div>
          <p>
            <b>Total Invoice Value (In Rupees) :</b> {fmt(invoiceValue)}
          </p>
          <p>
            <b>Total Invoice Value (In Words) :</b> {amountInWords(invoiceValue)}
          </p>
        </div>
        <div className="invoice-summary-right">
          <p>
            <b>Total Saving :</b> {fmt(Number(sale.discount_amount))}
          </p>
          <p>
            <b>Paid :</b> {fmt(paid)}
          </p>
          <p>
            <b>Balance :</b> {balance > 0 ? fmt(balance) : "NIL (Paid)"}
          </p>
        </div>
      </div>

      {sale.notes && (
        <p className="invoice-notes">
          <b>Notes :</b> {sale.notes}
        </p>
      )}

      <div className="invoice-sign">
        <div>
          <p>Name of the Signatory :</p>
          <p>Designation / Status :</p>
        </div>
        <div className="invoice-sign-right">
          <p>For {businessName}</p>
          <p className="invoice-sign-space">Authorised Signatory</p>
        </div>
      </div>

      <p className="invoice-foot">Freshness Reaches You</p>
    </div>
  );
}
