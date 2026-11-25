
import { Request, Response } from "express";
import { z } from "zod";

import {
    getInventory,
    addStockMovement,
    getStockMovements
} from "../services/inventory.service";

const stockMovementSchema = z.object({
    product_variant_id: z.string().uuid(),
    movement_type: z.enum([
        "opening_stock",
        "adjustment",
        "return",
        "damage"
    ]),
    quantity_cases: z.number().int().refine(
        value => value !== 0,
        "Quantity cannot be zero."
    ),
    remarks: z.string().max(500).optional()
});

export const listInventory = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const inventory = await getInventory();

        res.status(200).json({
            success: true,
            message: "Inventory fetched successfully.",
            data: inventory
        });
    } catch (error) {
        console.error("Inventory error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch inventory."
        });
    }
};

export const createStockMovement = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = stockMovementSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid stock movement information.",
                errors: validation.error.flatten()
            });
            return;
        }

        const input = validation.data;

        if (
            input.movement_type === "damage" &&
            input.quantity_cases < 0
        ) {
            res.status(400).json({
                success: false,
                message: "Damage quantity must be positive."
            });
            return;
        }

        if (
            ["opening_stock", "return"].includes(input.movement_type) &&
            input.quantity_cases < 0
        ) {
            res.status(400).json({
                success: false,
                message: "Opening stock and return quantities must be positive."
            });
            return;
        }

        if (
            input.movement_type === "adjustment" &&
            input.quantity_cases < 0
        ) {
            // Negative adjustment reduces stock.
        }

        const movement = await addStockMovement(input);

        res.status(201).json({
            success: true,
            message: "Stock movement recorded successfully.",
            data: movement
        });
    } catch (error) {
        console.error("Stock movement error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to record stock movement."
        });
    }
};

export const listStockMovements = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const variantId = req.query.product_variant_id;

        if (
            variantId !== undefined &&
            typeof variantId !== "string"
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid product variant ID."
            });
            return;
        }

        const limit = Number(req.query.limit || 100);

        if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
            res.status(400).json({
                success: false,
                message: "Limit must be between 1 and 500."
            });
            return;
        }

        const movements = await getStockMovements(
            variantId,
            limit
        );

        res.status(200).json({
            success: true,
            message: "Stock movements fetched successfully.",
            data: movements
        });
    } catch (error) {
        console.error("Stock history error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch stock movements."
        });
    }
};
