
import { supabase } from "../config/supabase";

export interface PurchaseItemInput {
    product_variant_id: string;
    quantity_cases: number;
    purchase_price_per_case: number;
}

export interface CreatePurchaseInput {
    supplier_name?: string;
    invoice_number?: string;
    purchase_date?: string;
    notes?: string;
    items: PurchaseItemInput[];
}

export const createPurchase = async (
    input: CreatePurchaseInput
) => {
    const { data, error } = await supabase.rpc("create_purchase", {
        p_supplier_name: input.supplier_name?.trim() || null,
        p_invoice_number: input.invoice_number?.trim() || null,
        p_purchase_date: input.purchase_date || new Date().toISOString(),
        p_notes: input.notes?.trim() || null,
        p_items: input.items
    });

    if (error) {
        console.error("Create purchase error:", error);
        throw new Error(error.message);
    }

    return {
        purchase_id: data
    };
};

export const getPurchaseHistory = async (limit = 100) => {
    const { data: purchases, error } = await supabase
        .from("purchase_records")
        .select("*")
        .order("purchase_date", { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(error.message);
    }

    if (!purchases || purchases.length === 0) {
        return [];
    }

    const purchaseIds = purchases.map(item => item.id);

    const { data: items, error: itemsError } = await supabase
        .from("purchase_items")
        .select("*")
        .in("purchase_id", purchaseIds);

    if (itemsError) {
        throw new Error(itemsError.message);
    }

    return purchases.map(purchase => ({
        ...purchase,
        items: (items || []).filter(
            item => item.purchase_id === purchase.id
        )
    }));
};

export const getPurchaseById = async (purchaseId: string) => {
    const { data: purchase, error } = await supabase
        .from("purchase_records")
        .select("*")
        .eq("id", purchaseId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!purchase) {
        throw new Error("Purchase record not found.");
    }

    const { data: items, error: itemsError } = await supabase
        .from("purchase_items")
        .select("*")
        .eq("purchase_id", purchaseId);

    if (itemsError) {
        throw new Error(itemsError.message);
    }

    return {
        ...purchase,
        items: items || []
    };
};
