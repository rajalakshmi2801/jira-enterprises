
import { Request, Response } from "express";
import { z } from "zod";

import {
    getAllCategories,
    createCategory,
    updateCategory,
    updateCategoryStatus
} from "../services/categories.service";

const categorySchema = z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().max(500).nullable().optional()
}).strict();

export const listCategories = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const categories = await getAllCategories();

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to retrieve categories."
        });
    }
};

export const addCategory = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = categorySchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid category information.",
                errors: validation.error.flatten()
            });
            return;
        }

        const category = await createCategory(validation.data);

        res.status(201).json({
            success: true,
            message: "Category created successfully.",
            data: category
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to create category."
        });
    }
};

export const editCategory = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const id = req.params.id;

        if (typeof id !== "string" ||
            !z.string().uuid().safeParse(id).success) {
            res.status(400).json({
                success: false,
                message: "Valid category ID is required."
            });
            return;
        }

        const validation = categorySchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid category information.",
                errors: validation.error.flatten()
            });
            return;
        }

        const category = await updateCategory(id, validation.data);

        res.status(200).json({
            success: true,
            message: "Category updated successfully.",
            data: category
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to update category."
        });
    }
};

export const changeCategoryStatus = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const id = req.params.id;
        const { is_active } = req.body;

        if (
            typeof id !== "string" ||
            !z.string().uuid().safeParse(id).success ||
            typeof is_active !== "boolean"
        ) {
            res.status(400).json({
                success: false,
                message: "Valid category ID and status are required."
            });
            return;
        }

        const category = await updateCategoryStatus(id, is_active);

        res.status(200).json({
            success: true,
            message: "Category status updated successfully.",
            data: category
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to update category status."
        });
    }
};
