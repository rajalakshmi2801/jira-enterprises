import { supabase } from "../config/supabase";

/* =========================================
   TYPES
========================================= */

export interface SaleItemInput {
    product_variant_id: string;
    quantity_cases: number;
    selling_price_per_case: number;
}

export interface CreateSaleInput {
    customer_id?: string | null;
    sale_date?: string;
    discount_amount?: number;
    notes?: string;
    items: SaleItemInput[];
    paid_amount: number;
    payment_method?: "cash" | "upi" | null;
    transaction_reference?: string;
}

/* =========================================
   CREATE SALE
========================================= */

export const createSale = async (sale: CreateSaleInput) => {
    const { data, error } = await supabase.rpc("create_sale", {
        p_customer_id: sale.customer_id || null,
        p_sale_date: sale.sale_date || null,
        p_discount_amount: sale.discount_amount || 0,
        p_notes: sale.notes || null,
        p_items: sale.items,
        p_paid_amount: sale.paid_amount || 0,
        p_payment_method: sale.payment_method || null,
        p_transaction_reference: sale.transaction_reference || null
    });

    if (error) {
        throw new Error(error.message);
    }

    return {
        sale_id: data
    };
};

/* =========================================
   GET SALES HISTORY
========================================= */

export const getSalesHistory = async (limit = 100) => {
    const { data, error } = await supabase
        .from("sales")
        .select(`
            id,
            invoice_number,
            customer_id,
            sale_date,
            total_amount,
            gst_amount,
            discount_amount,
            notes,
            status,
            created_at,
            customers (
                id,
                customer_name,
                shop_name,
                mobile,
                gst_number
            ),
            sale_items (
                id,
                product_variant_id,
                quantity_cases,
                cost_price_per_case,
                selling_price_per_case,
                subtotal,
                hsn_code,
                gst_percent,
                discount_amount,
                taxable_value,
                cgst_amount,
                sgst_amount,
                product_variants (
                variant_name,
                size_value,
                size_unit,
                products (
                    product_name,
                    brand_name
                )
            )
            ),
            payments (
                id,
                payment_method,
                amount,
                payment_date,
                transaction_reference
            )
        `)
        .order("sale_date", { ascending: false })
        .limit(limit);

    if (error) {
        throw error;
    }

    return data;
};

/* =========================================
   GET SALE DETAILS
========================================= */

export const getSaleById = async (saleId: string) => {
    const { data, error } = await supabase
        .from("sales")
        .select(`
            id,
            invoice_number,
            customer_id,
            sale_date,
            total_amount,
            gst_amount,
            discount_amount,
            notes,
            status,
            created_at,
            updated_at,
            customers (
                id,
                customer_name,
                shop_name,
                mobile,
                address,
                gst_number
            ),
            sale_items (
                id,
                product_variant_id,
                quantity_cases,
                cost_price_per_case,
                selling_price_per_case,
                subtotal,
                hsn_code,
                gst_percent,
                discount_amount,
                taxable_value,
                cgst_amount,
                sgst_amount,
                product_variants (
                    variant_name,
                    size_value,
                    size_unit,
                    products (
                        product_name,
                        brand_name
                    )
                )
            ),
            payments (
                id,
                payment_method,
                amount,
                payment_date,
                transaction_reference,
                notes
            )
        `)
        .eq("id", saleId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Sale not found.");
    }

    return data;
};

/* =========================================
   CUSTOMER SALES HISTORY
========================================= */

export const getCustomerSales = async (
    customerId: string,
    limit = 100
) => {
    const { data, error } = await supabase
        .from("sales")
        .select(`
            id,
            invoice_number,
            customer_id,
            sale_date,
            total_amount,
            gst_amount,
            discount_amount,
            status,
            sale_items (
                quantity_cases,
                selling_price_per_case,
                subtotal
            ),
            payments (
                amount,
                payment_method,
                payment_date
            )
        `)
        .eq("customer_id", customerId)
        .order("sale_date", { ascending: false })
        .limit(limit);

    if (error) {
        throw error;
    }

    return data;
};

/* =========================================
   CUSTOMER OUTSTANDING BALANCES
========================================= */


interface OutstandingPayment {
    amount: number | string | null;
}

interface OutstandingCustomer {
    id: string;
    customer_name: string;
    shop_name: string | null;
    mobile: string | null;
}

interface OutstandingSale {
    id: string;
    customer_id: string | null;
    sale_date: string;
    total_amount: number | string | null;
    discount_amount: number | string | null;
    status: string;
    customers:
        | OutstandingCustomer
        | OutstandingCustomer[]
        | null;
    payments: OutstandingPayment[] | null;
}

interface CustomerOutstandingSummary {
    customer_id: string;
    customer: OutstandingCustomer | OutstandingCustomer[] | null;
    total_sales: number;
    total_paid: number;
    outstanding_amount: number;
}



export const getCustomerOutstandingBalances = async () => {
    const { data, error } = await supabase
        .from("sales")
        .select(`
            id,
            customer_id,
            sale_date,
            total_amount,
            gst_amount,
            discount_amount,
            status,
            customers (
                id,
                customer_name,
                shop_name,
                mobile
            ),
            payments (
                amount
            )
        `)
        .eq("status", "completed")
        .not("customer_id", "is", null);

    if (error) {
        throw error;
    }

    const sales = (data ?? []) as unknown as OutstandingSale[];

    const customerMap = new Map<
        string,
        CustomerOutstandingSummary
    >();

    for (const sale of sales) {
        if (!sale.customer_id) {
            continue;
        }

        const paidAmount = (sale.payments ?? []).reduce(
            (total, payment) =>
                total + Number(payment.amount ?? 0),
            0
        );

        const outstanding =
            Number(sale.total_amount ?? 0) - paidAmount;

        if (outstanding <= 0) {
            continue;
        }

        let customer = customerMap.get(sale.customer_id);

        if (!customer) {
            customer = {
                customer_id: sale.customer_id,
                customer: sale.customers,
                total_sales: 0,
                total_paid: 0,
                outstanding_amount: 0,
            };

            customerMap.set(sale.customer_id, customer);
        }

        customer.total_sales += Number(sale.total_amount ?? 0);
        customer.total_paid += paidAmount;
        customer.outstanding_amount += outstanding;
    }

    return Array.from(customerMap.values()).map((customer) => ({
        ...customer,
        total_sales: Number(customer.total_sales.toFixed(2)),
        total_paid: Number(customer.total_paid.toFixed(2)),
        outstanding_amount: Number(
            customer.outstanding_amount.toFixed(2)
        ),
    }));
};


/* =========================================
   GET SINGLE CUSTOMER OUTSTANDING
========================================= */

export const getCustomerOutstandingById = async (
    customerId: string
) => {
    const balances = await getCustomerOutstandingBalances();

    const customerBalance = balances.find(
        (item) => item.customer_id === customerId
    );

    if (!customerBalance) {
        return {
            customer_id: customerId,
            total_sales: 0,
            total_paid: 0,
            outstanding_amount: 0
        };
    }

    return customerBalance;
};

export interface CollectSalePaymentInput {
    sale_id: string;
    amount: number;
    payment_method: "cash" | "upi";
    payment_date?: string;
    transaction_reference?: string;
    notes?: string;
}

export const collectSalePayment = async (
    payment: CollectSalePaymentInput
) => {
    const { data, error } = await supabase.rpc("collect_sale_payment", {
        p_sale_id: payment.sale_id,
        p_amount: payment.amount,
        p_payment_method: payment.payment_method,
        p_payment_date: payment.payment_date || null,
        p_transaction_reference: payment.transaction_reference || null,
        p_notes: payment.notes || null
    });

    if (error) {
        throw new Error(error.message);
    }

    return {
        payment_id: data
    };
};