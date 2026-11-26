import { formatDate } from "./format";
import type { DailySalesReport } from "../services/business.api";

/** Builds and downloads an .xlsx file for the daily sales report. */
export async function downloadDailySalesExcel(
  report: DailySalesReport,
  business: { name: string; gst: string | null }
) {
  // Loaded on demand so the Excel library is not part of the main bundle.
  const { Workbook } = await import("exceljs");

  const workbook = new Workbook();
  const money = '#,##0.00';
  const period =
    report.period.from === report.period.to
      ? formatDate(report.period.from)
      : `${formatDate(report.period.from)} to ${formatDate(report.period.to)}`;

  const border = {
    top: { style: "thin" as const, color: { argb: "FFD9DEE7" } },
    left: { style: "thin" as const, color: { argb: "FFD9DEE7" } },
    bottom: { style: "thin" as const, color: { argb: "FFD9DEE7" } },
    right: { style: "thin" as const, color: { argb: "FFD9DEE7" } },
  };

  const styleHeader = (row: import("exceljs").Row) => {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    row.height = 22;
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      cell.border = border;
    });
  };

  /* ---------------- Sheet 1: invoices ---------------- */
  const sheet = workbook.addWorksheet("Daily Sales", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  sheet.columns = [
    { width: 6 },
    { width: 13 },
    { width: 20 },
    { width: 26 },
    { width: 18 },
    { width: 42 },
    { width: 9 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ];

  sheet.mergeCells("A1:J1");
  sheet.getCell("A1").value = `${business.name} - Daily Sales Report`;
  sheet.getCell("A1").font = { bold: true, size: 15, color: { argb: "FF172033" } };

  sheet.mergeCells("A2:J2");
  sheet.getCell("A2").value = business.gst ? `GSTIN: ${business.gst}` : "";

  sheet.mergeCells("A3:J3");
  sheet.getCell("A3").value = `Period: ${period}`;
  sheet.getCell("A3").font = { bold: true };

  styleHeader(
    sheet.addRow([
      "S.No",
      "Date",
      "Invoice",
      "Customer",
      "Customer GSTIN",
      "Products (cases)",
      "Cases",
      "Amount (Rs)",
      "Paid (Rs)",
      "Pending (Rs)",
    ])
  );
  report.rows.forEach((row, index) => {
    const excelRow = sheet.addRow([
      index + 1,
      formatDate(row.sale_date),
      row.invoice_number ?? "",
      row.customer_name,
      row.customer_gst ?? "",
      row.products.map((item) => `${item.name} x ${item.cases}`).join("\n"),
      row.total_cases,
      row.total_amount,
      row.paid_amount,
      row.pending_amount,
    ]);

    excelRow.alignment = { vertical: "top", wrapText: true };
    [8, 9, 10].forEach((column) => {
      excelRow.getCell(column).numFmt = money;
    });
    if (row.pending_amount > 0) {
      excelRow.getCell(10).font = { bold: true, color: { argb: "FFDC2626" } };
    }
    excelRow.eachCell((cell) => {
      cell.border = border;
    });
  });

  const total = sheet.addRow([
    "",
    "",
    "",
    "",
    "",
    "TOTAL",
    report.summary.cases,
    report.summary.amount,
    report.summary.paid,
    report.summary.pending,
  ]);

  total.font = { bold: true };
  total.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF1FF" } };
    cell.border = border;
  });
  [8, 9, 10].forEach((column) => {
    total.getCell(column).numFmt = money;
  });

  /* ---------------- Sheet 2: product-wise ---------------- */
  const detail = workbook.addWorksheet("Product-wise", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  detail.columns = [
    { header: "Date", width: 13 },
    { header: "Invoice", width: 20 },
    { header: "Customer", width: 26 },
    { header: "Product", width: 34 },
    { header: "Cases", width: 9 },
    { header: "Rate / case (Rs)", width: 16 },
    { header: "Amount (Rs)", width: 15 },
  ];
  styleHeader(detail.getRow(1));

  report.rows.forEach((row) => {
    row.products.forEach((item) => {
      const excelRow = detail.addRow([
        formatDate(row.sale_date),
        row.invoice_number ?? "",
        row.customer_name,
        item.name,
        item.cases,
        item.rate,
        item.amount,
      ]);

      excelRow.getCell(6).numFmt = money;
      excelRow.getCell(7).numFmt = money;
      excelRow.eachCell((cell) => {
        cell.border = border;
      });
    });
  });

  /* ---------------- download ---------------- */
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    report.period.from === report.period.to
      ? `Daily_Sales_${report.period.from}.xlsx`
      : `Sales_${report.period.from}_to_${report.period.to}.xlsx`;
  link.click();

  URL.revokeObjectURL(url);
}
