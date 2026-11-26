
import { Request, Response } from "express";
import { z } from "zod";

import {
    getCategories,
    createCategory,
    getProducts,
    createProduct,
    getProductVariants,
    createProductVariant
} from "../services/products.service";

const uuidSchema = z.string().uuid();

const categorySchema = z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().optional()
});

const productSchema = z.object({
    categoryId: uuidSchema,
    productName: z.string().trim().min(1).max(150),
    brandName: z.string().optional(),
    description: z.string().optional()
});

const variantSchema = z.object({
    productId: uuidSchema,
    variantName: z.string().trim().min(1),
    sizeValue: z.number().positive().optional(),
    sizeUnit: z.string().optional(),
    piecesPerCase: z.number().int().positive(),
    landingPricePerPiece: z.number().nonnegative().nullable().optional(),
    mrpPerPiece: z.number().nonnegative().nullable().optional(),
    landingPricePerCase: z.number().nonnegative(),
    mrpPerCase: z.number().nonnegative(),
    hsnCode: z.string().trim().max(10).optional(),
    gstPercent: z.number().min(0).max(100).optional()
});

// GET categories
export const listCategories = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const categories = await getCategories();

        res.status(200).json({
            success: true,
            categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Unable to retrieve categories."
        });
    }
};

// CREATE category
export const addCategory = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const parsed = categorySchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Invalid category information.",
                errors: parsed.error.issues
            });
            return;
        }

        const category = await createCategory(parsed.data);

        res.status(201).json({
            success: true,
            message: "Category created successfully.",
            category
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Unable to create category."
        });
    }
};

// GET products
export const listProducts = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const products = await getProducts();

        res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Unable to retrieve products."
        });
    }
};

// CREATE product
export const addProduct = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const parsed = productSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Invalid product information.",
                errors: parsed.error.issues
            });
            return;
        }

        const product = await createProduct(parsed.data);

        res.status(201).json({
            success: true,
            message: "Product created successfully.",
            product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Unable to create product."
        });
    }
};

// GET variants
export const listVariants = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const productId = req.params.productId;

        if (typeof productId !== "string" || !uuidSchema.safeParse(productId).success) {
            res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
            return;
        }

        const variants = await getProductVariants(productId);

        res.status(200).json({
            success: true,
            variants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Unable to retrieve variants."
        });
    }
};

// CREATE variant
export const addProductVariant = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const parsed = variantSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Invalid product variant information.",
                errors: parsed.error.issues
            });
            return;
        }

        const variant = await createProductVariant(parsed.data);

        res.status(201).json({
            success: true,
            message: "Product variant created successfully.",
            variant
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Unable to create variant."
        });
    }
};
