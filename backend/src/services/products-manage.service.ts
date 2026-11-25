import { supabase } from "../config/supabase";

// ===============================
// PRODUCT / VARIANT UPDATES
// ===============================

export const updateProduct = async (
    productId: string,
    input: {
        categoryId?: string;
        productName?: string;
        brandName?: string | null;
        description?: string | null;
        isActive?: boolean;
    }
) => {
    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
    };

    if (input.categoryId !== undefined) {
        updateData.category_id = input.categoryId;
    }
    if (input.productName !== undefined) {
        updateData.product_name = input.productName.trim();
    }
    if (input.brandName !== undefined) {
        updateData.brand_name = input.brandName?.trim() || null;
    }
    if (input.description !== undefined) {
        updateData.description = input.description?.trim() || null;
    }
    if (input.isActive !== undefined) {
        updateData.is_active = input.isActive;
    }

    const { data, error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", productId)
        .select()
        .maybeSingle();

    if (error) {
        throw new Error("Unable to update product.");
    }

    if (!data) {
        throw new Error("Product not found.");
    }

    return data;
};

export const updateProductVariant = async (
    variantId: string,
    input: {
        variantName?: string;
        sizeValue?: number | null;
        sizeUnit?: string | null;
        piecesPerCase?: number;
        landingPricePerPiece?: number | null;
        mrpPerPiece?: number | null;
        landingPricePerCase?: number;
        mrpPerCase?: number;
        isActive?: boolean;
    }
) => {
    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
    };

    if (input.variantName !== undefined) {
        updateData.variant_name = input.variantName.trim();
    }
    if (input.sizeValue !== undefined) {
        updateData.size_value = input.sizeValue;
    }
    if (input.sizeUnit !== undefined) {
        updateData.size_unit = input.sizeUnit;
    }
    if (input.piecesPerCase !== undefined) {
        updateData.pieces_per_case = input.piecesPerCase;
    }
    if (input.landingPricePerPiece !== undefined) {
        updateData.landing_price_per_piece = input.landingPricePerPiece;
    }
    if (input.mrpPerPiece !== undefined) {
        updateData.mrp_per_piece = input.mrpPerPiece;
    }
    if (input.landingPricePerCase !== undefined) {
        updateData.landing_price_per_case = input.landingPricePerCase;
    }
    if (input.mrpPerCase !== undefined) {
        updateData.mrp_per_case = input.mrpPerCase;
    }
    if (input.isActive !== undefined) {
        updateData.is_active = input.isActive;
    }

    const { data, error } = await supabase
        .from("product_variants")
        .update(updateData)
        .eq("id", variantId)
        .select()
        .maybeSingle();

    if (error) {
        if (error.code === "23505") {
            throw new Error("This product already has a variant with that name.");
        }

        throw new Error("Unable to update product variant.");
    }

    if (!data) {
        throw new Error("Product variant not found.");
    }

    return data;
};

// ===============================
// PRODUCT + VARIANTS + OPENING STOCK
// ===============================

export interface NewVariantInput {
    variant_name: string;
    size_value?: number | null;
    size_unit?: string | null;
    pieces_per_case: number;
    landing_price_per_piece?: number | null;
    mrp_per_piece?: number | null;
    landing_price_per_case: number;
    mrp_per_case: number;
    initial_stock_cases?: number;
}

export const createProductWithVariants = async (input: {
    categoryId: string;
    productName: string;
    brandName?: string;
    description?: string;
    variants: NewVariantInput[];
}) => {
    const { data, error } = await supabase.rpc(
        "create_product_with_variants",
        {
            p_category_id: input.categoryId,
            p_product_name: input.productName,
            p_brand_name: input.brandName || null,
            p_description: input.description || null,
            p_variants: input.variants
        }
    );

    if (error) {
        if (error.code === "23505") {
            throw new Error(
                "A variant with the same name already exists for this product."
            );
        }

        throw new Error(error.message);
    }

    return { product_id: data };
};
