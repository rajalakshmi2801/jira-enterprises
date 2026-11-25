
import { supabase } from "../config/supabase";

export interface CategoryInput {
    name: string;
    description?: string | null;
}

export const getAllCategories = async () => {
    const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error("Unable to fetch categories.");
    }

    return data;
};

export const createCategory = async (input: CategoryInput) => {
    const { data: existing, error: searchError } = await supabase
        .from("product_categories")
        .select("id")
        .ilike("name", input.name.trim())
        .limit(1);

    if (searchError) {
        throw new Error("Unable to validate category.");
    }

    if (existing && existing.length > 0) {
        throw new Error("Category already exists.");
    }

    const { data, error } = await supabase
        .from("product_categories")
        .insert({
            name: input.name.trim(),
            description: input.description?.trim() || null
        })
        .select()
        .single();

    if (error) {
        throw new Error("Unable to create category.");
    }

    return data;
};

export const updateCategory = async (
    id: string,
    input: CategoryInput
) => {
    const { data, error } = await supabase
        .from("product_categories")
        .update({
            name: input.name.trim(),
            description: input.description?.trim() || null,
            updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .maybeSingle();

    if (error) {
        throw new Error("Unable to update category.");
    }

    if (!data) {
        throw new Error("Category not found.");
    }

    return data;
};

export const updateCategoryStatus = async (
    id: string,
    isActive: boolean
) => {
    const { data, error } = await supabase
        .from("product_categories")
        .update({
            is_active: isActive,
            updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .maybeSingle();

    if (error) {
        throw new Error("Unable to update category status.");
    }

    if (!data) {
        throw new Error("Category not found.");
    }

    return data;
};
