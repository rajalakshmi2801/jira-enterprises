import { Request, Response } from "express";
import { z } from "zod";

import {
    updateProduct,
    updateProductVariant,
    createProductWithVariants
} from "../services/products-manage.service";

const uuidSchema = z.string().uuid();

const productUpdateSchema = z.object({
    categoryId: uuidSchema.optional(),
    productName: z.string().trim().min(1).max(150).optional(),
    brandName: z.string().max(150).nullable().optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional()
});

const variantUpdateSchema = z.object({
    variantName: z.string().trim().min(1).max(100).optional(),
    sizeValue: z.number().positive().nullable().optional(),
    sizeUnit: z.string().max(30).nullable().optional(),
    piecesPerCase: z.number().int().positive().optional(),
    landingPricePerPiece: z.number().nonnegative().nullable().optional(),
    mrpPerPiece: z.number().nonnegative().nullable().optional(),
    landingPricePerCase: z.number().nonnegative().optional(),
    mrpPerCase: z.number().nonnegative().optional(),
    isActive: z.boolean().optional()
});

const productWithVariantsSchema = z.object({
    categoryId: uuidSchema,
    productName: z.string().trim().min(1).max(150),
    brandName: z.string().max(150).optional(),
    description: z.string().optional(),
    variants: z.array(
        z.object({
            variant_name: z.string().trim().min(1).max(100),
            size_value: z.number().positive().nullable().optional(),
            size_unit: z.string().max(30).nullable().optional(),
            pieces_per_case: z.number().int().positive(),
            landing_price_per_piece: z.number().nonnegative().nullable().optional(),
            mrp_per_piece: z.number().nonnegative().nullable().optional(),
            landing_price_per_case: z.number().nonnegative(),
            mrp_per_case: z.number().nonnegative(),
            initial_stock_cases: z.number().int().nonnegative().optional()
        })
    ).min(1)
});

const paramId = (value: string | string[] | undefined): string | null => {
    const id = Array.isArray(value) ? value[0] : value;

    return typeof id === "string" && uuidSchema.safeParse(id).success
        ? id
        : null;
};

// CREATE product + variants + opening stock in one transaction
export const addProductWithVariants = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const parsed = productWithVariantsSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Invalid product information.",
                errors: parsed.error.issues
            });
            return;
        }

        const result = await createProductWithVariants(parsed.data);

        res.status(201).json({
            success: true,
            message: "Product created successfully.",
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to create product."
        });
    }
};

// UPDATE product
export const editProduct = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const id = paramId(req.params.productId);
        const parsed = productUpdateSchema.safeParse(req.body);

        if (!id || !parsed.success) {
            res.status(400).json({
                success: false,
                message: "Invalid product information."
            });
            return;
        }

        const product = await updateProduct(id, parsed.data);

        res.status(200).json({
            success: true,
            message: "Product updated successfully.",
            product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to update product."
        });
    }
};

// UPDATE variant (prices, pack size, active flag)
export const editProductVariant = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const id = paramId(req.params.variantId);
        const parsed = variantUpdateSchema.safeParse(req.body);

        if (!id || !parsed.success) {
            res.status(400).json({
                success: false,
                message: "Invalid variant information."
            });
            return;
        }

        const variant = await updateProductVariant(id, parsed.data);

        res.status(200).json({
            success: true,
            message: "Variant updated successfully.",
            variant
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to update variant."
        });
    }
};
