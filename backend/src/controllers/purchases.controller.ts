
import { Request, Response } from "express";
import { z } from "zod";

import {
    createPurchase,
    getPurchaseHistory,
    getPurchaseById
} from "../services/purchases.service";

const purchaseSchema = z.object({
    supplier_name: z.string().max(150).optional(),
    invoice_number: z.string().max(100).optional(),
    purchase_date: z.string().datetime({ offset: true }).optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(
        z.object({
            product_variant_id: z.string().uuid(),
            quantity_cases: z.number().int().positive(),
            purchase_price_per_case: z.number().min(0)
        })
    ).min(1)
});

export const addPurchase = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = purchaseSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid purchase information.",
                errors: validation.error.flatten()
            });
            return;
        }

        const purchase = await createPurchase(validation.data);

        res.status(201).json({
            success: true,
            message: "Purchase recorded and stock updated successfully.",
            data: purchase
        });
    } catch (error) {
        console.error("Add purchase error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to record purchase."
        });
    }
};

export const listPurchases = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const limit = Number(req.query.limit || 100);

        if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
            res.status(400).json({
                success: false,
                message: "Limit must be between 1 and 500."
            });
            return;
        }

        const purchases = await getPurchaseHistory(limit);

        res.status(200).json({
            success: true,
            message: "Purchase history fetched successfully.",
            data: purchases
        });
    } catch (error) {
        console.error("Purchase history error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch purchase history."
        });
    }
};

export const purchaseDetails = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const purchaseId = req.params.id;

        if (typeof purchaseId !== "string") {
            res.status(400).json({
                success: false,
                message: "Valid purchase ID is required."
            });
            return;
        }

        const purchase = await getPurchaseById(purchaseId);

        res.status(200).json({
            success: true,
            message: "Purchase details fetched successfully.",
            data: purchase
        });
    } catch (error) {
        console.error("Purchase details error:", error);

        res.status(404).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Purchase not found."
        });
    }
};
