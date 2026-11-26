
import { supabase } from "../config/supabase";

// ===============================
// CATEGORIES
// ===============================

export const getCategories = async () => {
    const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("name", { ascending: true });

    if (error) {
        throw new Error("Unable to retrieve categories.");
    }

    return data;
};

export const createCategory = async (input: {
    name: string;
    description?: string;
}) => {
    const { data, error } = await supabase
        .from("product_categories")
        .insert({
            name: input.name.trim(),
            description: input.description?.trim() || null
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error("Category already exists.");
        }

        throw new Error("Unable to create category.");
    }

    return data;
};

// ===============================
// PRODUCTS
// ===============================

export const getProducts = async () => {
    const { data, error } = await supabase
        .from("products")
        .select(`
            *,
            product_categories (
                id,
                name
            ),
            product_variants (*)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error("Unable to retrieve products.");
    }

    return data;
};

export const createProduct = async (input: {
    categoryId: string;
    productName: string;
    brandName?: string;
    description?: string;
}) => {
    const { data, error } = await supabase
        .from("products")
        .insert({
            category_id: input.categoryId,
            product_name: input.productName.trim(),
            brand_name: input.brandName?.trim() || null,
            description: input.description?.trim() || null
        })
        .select()
        .single();

    if (error) {
        throw new Error("Unable to create product.");
    }

    return data;
};

// ===============================
// PRODUCT VARIANTS
// ===============================

export const getProductVariants = async (
    productId: string
) => {
    const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

    if (error) {
        throw new Error("Unable to retrieve product variants.");
    }

    return data;
};

export const createProductVariant = async (input: {
    productId: string;
    variantName: string;
    sizeValue?: number;
    sizeUnit?: string;
    piecesPerCase: number;
    landingPricePerPiece?: number | null;
    mrpPerPiece?: number | null;
    landingPricePerCase: number;
    mrpPerCase: number;
    hsnCode?: string;
    gstPercent?: number;
}) => {
    const { data, error } = await supabase
        .from("product_variants")
        .insert({
            product_id: input.productId,
            variant_name: input.variantName.trim(),
            size_value: input.sizeValue ?? null,
            size_unit: input.sizeUnit ?? null,
            pieces_per_case: input.piecesPerCase,
            landing_price_per_piece:
                input.landingPricePerPiece ?? null,
            mrp_per_piece: input.mrpPerPiece ?? null,
            landing_price_per_case: input.landingPricePerCase,
            mrp_per_case: input.mrpPerCase,
            hsn_code: input.hsnCode?.trim() || null,
            gst_percent: input.gstPercent ?? 0
        })
        .select()
        .single();

    if (error) {
        throw new Error("Unable to create product variant.");
    }

    return data;
};
