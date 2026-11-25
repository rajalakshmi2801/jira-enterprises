
import { supabase } from "../config/supabase";

export type StockMovementType =
    | "opening_stock"
    | "adjustment"
    | "return"
    | "damage";

export const getInventory = async () => {
    const { data: variants, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("is_active", true);

    if (error) {
        throw new Error(error.message);
    }

    if (!variants || variants.length === 0) {
        return [];
    }

    const variantIds = variants.map(item => item.id);
    const productIds = [...new Set(variants.map(item => item.product_id))];

    const { data: products, error: productError } = await supabase
        .from("products")
        .select("id, product_name, brand_name")
        .in("id", productIds);

    if (productError) {
        throw new Error(productError.message);
    }

    const { data: movements, error: movementError } = await supabase
        .from("stock_movements")
        .select("product_variant_id, movement_type, quantity_cases")
        .in("product_variant_id", variantIds);

    if (movementError) {
        throw new Error(movementError.message);
    }

    return variants.map(variant => {
        const variantMovements = (movements || []).filter(
            movement =>
                movement.product_variant_id === variant.id
        );

        // The stock ledger stores signed quantities (sales/damage are
        // negative), so current stock is a plain sum.
        const availableCases = variantMovements.reduce(
            (total, movement) =>
                total + Number(movement.quantity_cases),
            0
        );

        const product = (products || []).find(
            item => item.id === variant.product_id
        );

        return {
            product_variant_id: variant.id,
            product_id: variant.product_id,
            product_name: product?.product_name || "Unknown",
            brand_name: product?.brand_name || null,
            variant_name: variant.variant_name,
            pieces_per_case: variant.pieces_per_case,
            landing_price_per_case: variant.landing_price_per_case,
            mrp_per_case: variant.mrp_per_case,
            available_cases: availableCases
        };
    });
};

export const addStockMovement = async (input: {
    product_variant_id: string;
    movement_type: StockMovementType;
    quantity_cases: number;
    remarks?: string;
}) => {
    const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("id")
        .eq("id", input.product_variant_id)
        .eq("is_active", true)
        .maybeSingle();

    if (variantError) {
        throw new Error(variantError.message);
    }

    if (!variant) {
        throw new Error("Product variant not found or inactive.");
    }

    // Damaged stock always reduces the ledger.
    const signedQuantity =
        input.movement_type === "damage"
            ? -Math.abs(input.quantity_cases)
            : input.quantity_cases;

    if (signedQuantity < 0) {
        const { data: movements, error: stockError } = await supabase
            .from("stock_movements")
            .select("quantity_cases")
            .eq("product_variant_id", input.product_variant_id);

        if (stockError) {
            throw new Error(stockError.message);
        }

        const current = (movements || []).reduce(
            (total, row) => total + Number(row.quantity_cases),
            0
        );

        if (current + signedQuantity < 0) {
            throw new Error(
                `Not enough stock. Available: ${current} cases.`
            );
        }
    }

    const { data, error } = await supabase
        .from("stock_movements")
        .insert({
            product_variant_id: input.product_variant_id,
            movement_type: input.movement_type,
            quantity_cases: signedQuantity,
            movement_date: new Date().toISOString(),
            remarks: input.remarks?.trim() || null
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

export const getStockMovements = async (
    productVariantId?: string,
    limit = 100
) => {
    let query = supabase
        .from("stock_movements")
        .select("*")
        .order("movement_date", { ascending: false })
        .limit(limit);

    if (productVariantId) {
        query = query.eq("product_variant_id", productVariantId);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};
