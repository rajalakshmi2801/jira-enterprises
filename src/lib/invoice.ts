import { firstOf, formatCurrency, formatDateTime } from "./format";
import { paidOf, type Sale } from "../services/business.api";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] as string
  );
}

/** Opens a print-ready invoice (with the company logo) in a new window. */
export function printInvoice(sale: Sale, businessName = "Jira Enterprises") {
  const customer = firstOf(sale.customers);
  const paid = paidOf(sale);
  const pending = Number(sale.total_amount) - paid;
  const subtotal = sale.sale_items.reduce(
    (total, item) => total + Number(item.subtotal),
    0
  );

  const rows = sale.sale_items
    .map((item) => {
      const variant = item.product_variants;
      const name = `${variant?.products?.product_name ?? "Product"} - ${
        variant?.variant_name ?? ""
      }`;

      return `<tr>
        <td>${escapeHtml(name)}</td>
        <td class="n">${escapeHtml(item.quantity_cases)}</td>
        <td class="n">${escapeHtml(formatCurrency(item.selling_price_per_case))}</td>
        <td class="n">${escapeHtml(formatCurrency(item.subtotal))}</td>
      </tr>`;
    })
    .join("");

  const payments = sale.payments
    .map(
      (payment) =>
        `<div>${escapeHtml(formatDateTime(payment.payment_date))} &middot; ${escapeHtml(
          payment.payment_method.toUpperCase()
        )} &middot; ${escapeHtml(formatCurrency(payment.amount))}</div>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Invoice ${escapeHtml(sale.invoice_number ?? "")}</title>
<style>
  *{box-sizing:border-box} body{font-family:Inter,Arial,sans-serif;color:#172033;margin:32px;font-size:13px}
  .top{display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:2px solid #2563eb;padding-bottom:16px}
  .top img{width:210px;height:auto}
  h1{margin:0;font-size:22px;color:#2563eb;text-align:right} .meta{text-align:right;color:#475569;line-height:1.7}
  .bill{margin:20px 0;line-height:1.7}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#f1f5f9;text-align:left;padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
  td{padding:10px;border-bottom:1px solid #e9edf3} .n{text-align:right} th.n{text-align:right}
  .totals{margin:18px 0 0 auto;width:280px} .totals div{display:flex;justify-content:space-between;padding:5px 0}
  .grand{font-size:16px;font-weight:700;border-top:2px solid #172033;margin-top:6px;padding-top:8px!important}
  .due{color:#dc2626;font-weight:700} .ok{color:#159957;font-weight:700}
  .pay{margin-top:18px;color:#475569;line-height:1.7} .foot{margin-top:40px;text-align:center;color:#64748b}
</style></head><body>
<div class="top">
  <img src="${window.location.origin}/logo.jpg" alt="${escapeHtml(businessName)}" />
  <div><h1>INVOICE</h1><div class="meta">
    <b>${escapeHtml(sale.invoice_number ?? sale.id.slice(0, 8))}</b><br/>
    ${escapeHtml(formatDateTime(sale.sale_date))}
  </div></div>
</div>
<div class="bill"><b>Billed to</b><br/>
  ${escapeHtml(customer?.shop_name || customer?.customer_name || "Walk-in customer")}<br/>
  ${customer?.shop_name ? escapeHtml(customer.customer_name) + "<br/>" : ""}
  ${customer?.mobile ? escapeHtml(customer.mobile) + "<br/>" : ""}
  ${customer?.address ? escapeHtml(customer.address) : ""}
</div>
<table><thead><tr><th>Item</th><th class="n">Cases</th><th class="n">Rate / case</th><th class="n">Amount</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="totals">
  <div><span>Subtotal</span><span>${escapeHtml(formatCurrency(subtotal))}</span></div>
  <div><span>Discount</span><span>- ${escapeHtml(formatCurrency(sale.discount_amount))}</span></div>
  <div class="grand"><span>Total</span><span>${escapeHtml(formatCurrency(sale.total_amount))}</span></div>
  <div><span>Paid</span><span>${escapeHtml(formatCurrency(paid))}</span></div>
  <div><span>Balance</span><span class="${pending > 0 ? "due" : "ok"}">${
    pending > 0 ? escapeHtml(formatCurrency(pending)) : "PAID"
  }</span></div>
</div>
${payments ? `<div class="pay"><b>Payments</b>${payments}</div>` : ""}
${sale.notes ? `<div class="pay"><b>Notes:</b> ${escapeHtml(sale.notes)}</div>` : ""}
<div class="foot">Thank you for your business &mdash; Freshness Reaches You</div>
<script>
  window.addEventListener('load', function(){ setTimeout(function(){ window.focus(); window.print(); }, 250); });
</script>
</body></html>`;

  const popup = window.open("", "_blank", "width=900,height=800");

  if (!popup) {
    throw new Error("Please allow pop-ups to print the invoice.");
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
