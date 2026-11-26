import { supabase } from "../config/supabase";

export interface DailySalesFilters {
    from: string; // yyyy-mm-dd (user's local date)
    to: string;   // yyyy-mm-dd (user's local date)
    tzOffsetMinutes: number; // from the browser: new Date().getTimezoneOffset()
}

interface RawCustomer {
    customer_name: string;
    shop_name: string | null;
    gst_number: string | null;
}

interface RawSale {
    id: string;
    invoice_number: string | null;
    sale_date: string;
    total_amount: number | string;
    discount_amount: number | string;
    customers: RawCustomer | RawCustomer[] | null;
    sale_items: Array<{
        quantity_cases: number | string;
        selling_price_per_case: number | string;
        subtotal: number | string;
        product_variants: {
            variant_name: string;
            products: { product_name: string } | { product_name: string }[] | null;
        } | null;
    }> | null;
    payments: Array<{ amount: number | string }> | null;
}

const PAGE_SIZE = 500;

const one = <T>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? value[0] ?? null : value ?? null;

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Local midnight of yyyy-mm-dd (in the user's zone) as a UTC instant. */
const localDayStart = (date: string, tzOffsetMinutes: number, addDays = 0) => {
    const [year, month, day] = date.split("-").map(Number);

    return new Date(
        Date.UTC(year, month - 1, day + addDays) + tzOffsetMinutes * 60000
    );
};

export const getDailySalesReport = async (filters: DailySalesFilters) => {
    const start = localDayStart(filters.from, filters.tzOffsetMinutes).toISOString();
    const end = new Date(
        localDayStart(filters.to, filters.tzOffsetMinutes, 1).getTime() - 1
    ).toISOString();

    const sales: RawSale[] = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabase
            .from("sales")
            .select(`
                id,
                invoice_number,
                sale_date,
                total_amount,
                discount_amount,
                customers (
                    customer_name,
                    shop_name,
                    gst_number
                ),
                sale_items (
                    quantity_cases,
                    selling_price_per_case,
                    subtotal,
                    product_variants (
                        variant_name,
                        products ( product_name )
                    )
                ),
                payments ( amount )
            `)
            .eq("status", "completed")
            .gte("sale_date", start)
            .lte("sale_date", end)
            .order("sale_date", { ascending: true })
            .order("id", { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            throw new Error(error.message);
        }

        const rows = (data ?? []) as unknown as RawSale[];

        sales.push(...rows);

        if (rows.length < PAGE_SIZE) {
            break;
        }

        offset += PAGE_SIZE;
    }

    const rows = sales.map((sale) => {
        const customer = one(sale.customers);
        const total = Number(sale.total_amount);
        const paid = (sale.payments ?? []).reduce(
            (sum, payment) => sum + Number(payment.amount),
            0
        );

        const products = (sale.sale_items ?? []).map((item) => {
            const variant = item.product_variants;
            const product = one(variant?.products ?? null);

            return {
                name: `${product?.product_name ?? "Product"} - ${variant?.variant_name ?? ""}`.trim(),
                cases: Number(item.quantity_cases),
                rate: Number(item.selling_price_per_case),
                amount: Number(item.subtotal)
            };
        });

        return {
            sale_id: sale.id,
            invoice_number: sale.invoice_number,
            sale_date: sale.sale_date,
            customer_name: customer
                ? customer.shop_name || customer.customer_name
                : "Walk-in customer",
            customer_gst: customer?.gst_number ?? null,
            products,
            total_cases: products.reduce((sum, item) => sum + item.cases, 0),
            discount: Number(sale.discount_amount),
            total_amount: total,
            paid_amount: money(paid),
            pending_amount: money(Math.max(total - paid, 0))
        };
    });

    return {
        period: { from: filters.from, to: filters.to },
        summary: {
            invoices: rows.length,
            cases: rows.reduce((sum, row) => sum + row.total_cases, 0),
            amount: money(rows.reduce((sum, row) => sum + row.total_amount, 0)),
            paid: money(rows.reduce((sum, row) => sum + row.paid_amount, 0)),
            pending: money(rows.reduce((sum, row) => sum + row.pending_amount, 0))
        },
        rows
    };
};
