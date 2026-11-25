import { supabase } from "../config/supabase";

/* =========================================
   TYPES
========================================= */

export interface CreateCustomerInput {
    customer_name: string;
    shop_name?: string;
    mobile?: string;
    address?: string;
    notes?: string;
}

export interface UpdateCustomerInput {
    customer_name?: string;
    shop_name?: string | null;
    mobile?: string | null;
    address?: string | null;
    notes?: string | null;
}

/* =========================================
   GET CUSTOMERS / SEARCH
========================================= */

export const getCustomers = async (search?: string) => {
    let query = supabase
        .from("customers")
        .select(`
            id,
            customer_name,
            shop_name,
            mobile,
            address,
            notes,
            is_active,
            created_at,
            updated_at
        `)
        .eq("is_active", true)
        .order("customer_name", { ascending: true });

    if (search && search.trim()) {
        const searchText = search.trim().replace(/[,%()]/g, "");

        query = query.or(
            `customer_name.ilike.%${searchText}%,shop_name.ilike.%${searchText}%,mobile.ilike.%${searchText}%`
        );
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

/* =========================================
   GET CUSTOMER BY ID
========================================= */

export const getCustomerById = async (customerId: string) => {
    const { data, error } = await supabase
        .from("customers")
        .select(`
            id,
            customer_name,
            shop_name,
            mobile,
            address,
            notes,
            is_active,
            created_at,
            updated_at
        `)
        .eq("id", customerId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!data) {
        throw new Error("Customer not found.");
    }

    return data;
};

/* =========================================
   CREATE CUSTOMER
========================================= */

export const createCustomer = async (
    customer: CreateCustomerInput
) => {
    const { data, error } = await supabase
        .from("customers")
        .insert({
            customer_name: customer.customer_name.trim(),
            shop_name: customer.shop_name?.trim() || null,
            mobile: customer.mobile?.trim() || null,
            address: customer.address?.trim() || null,
            notes: customer.notes?.trim() || null,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

/* =========================================
   UPDATE CUSTOMER
========================================= */

export const updateCustomer = async (
    customerId: string,
    customer: UpdateCustomerInput
) => {
    const updateData: Record<string, unknown> = {};

    if (customer.customer_name !== undefined) {
        updateData.customer_name = customer.customer_name.trim();
    }

    if (customer.shop_name !== undefined) {
        updateData.shop_name = customer.shop_name?.trim() || null;
    }

    if (customer.mobile !== undefined) {
        updateData.mobile = customer.mobile?.trim() || null;
    }

    if (customer.address !== undefined) {
        updateData.address = customer.address?.trim() || null;
    }

    if (customer.notes !== undefined) {
        updateData.notes = customer.notes?.trim() || null;
    }

    const { data, error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", customerId)
        .eq("is_active", true)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

/* =========================================
   DEACTIVATE CUSTOMER
========================================= */

export const deactivateCustomer = async (
    customerId: string
) => {
    const { data, error } = await supabase
        .from("customers")
        .update({
            is_active: false
        })
        .eq("id", customerId)
        .eq("is_active", true)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

/* =========================================
   GET CUSTOMER CREDIT SUMMARY
========================================= */

export const getCustomerCreditSummary = async (
    customerId: string
) => {
    const { data: sales, error } = await supabase
        .from("sales")
        .select(`
            id,
            total_amount,
            status,
            payments (
                amount
            )
        `)
        .eq("customer_id", customerId)
        .eq("status", "completed");

    if (error) {
        throw new Error(error.message);
    }

    let totalSales = 0;
    let totalPaid = 0;
    let outstanding = 0;

    for (const sale of sales || []) {
        const saleTotal = Number(sale.total_amount);

        const paid = (sale.payments || []).reduce(
            (sum: number, payment: { amount: number }) =>
                sum + Number(payment.amount),
            0
        );

        totalSales += saleTotal;
        totalPaid += paid;
        outstanding += saleTotal - paid;
    }

    return {
        customer_id: customerId,
        total_sales: Number(totalSales.toFixed(2)),
        total_paid: Number(totalPaid.toFixed(2)),
        outstanding_amount: Number(outstanding.toFixed(2))
    };
};