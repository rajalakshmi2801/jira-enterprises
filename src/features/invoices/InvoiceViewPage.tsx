import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, TriangleAlert } from "lucide-react";

import {
  ErrorState,
  LoadingState,
  PageHeader,
} from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { salesApi, settingsApi } from "../../services/business.api";
import InvoiceDocument from "./InvoiceDocument";
import "./invoice.css";

export default function InvoiceViewPage() {
  const { saleId = "" } = useParams();

  const sale = useAsync(() => salesApi.get(saleId), [saleId]);
  const settings = useAsync(() => settingsApi.get().catch(() => null), []);

  const needsGstin =
    sale.data &&
    sale.data.sale_items.some((item) => Number(item.gst_percent ?? 0) > 0) &&
    settings.data &&
    !settings.data.gst_number;

  return (
    <div className="ui-page">
      <div className="no-print">
        <PageHeader
          eyebrow="TAX INVOICE"
          title={sale.data?.invoice_number ?? "Invoice"}
          description="Check the invoice, then print it or save it as PDF."
          actions={
            <>
              <Link to="/invoices" className="ui-btn ui-btn-outline">
                <ArrowLeft size={15} />
                All invoices
              </Link>
              <button
                className="ui-btn ui-btn-primary"
                onClick={() => window.print()}
                disabled={!sale.data}
              >
                <Printer size={15} />
                Print / Save as PDF
              </button>
            </>
          }
        />
      </div>

      {needsGstin && (
        <div className="ui-readonly-banner no-print">
          <TriangleAlert size={16} />
          This invoice has GST items but your business GSTIN is empty. Add it
          in Settings so it prints on the invoice.
        </div>
      )}

      {sale.loading && !sale.data ? (
        <LoadingState text="Loading invoice..." />
      ) : sale.error || !sale.data ? (
        <ErrorState message={sale.error ?? "Invoice not found."} onRetry={sale.reload} />
      ) : (
        <InvoiceDocument sale={sale.data} settings={settings.data ?? null} />
      )}
    </div>
  );
}
