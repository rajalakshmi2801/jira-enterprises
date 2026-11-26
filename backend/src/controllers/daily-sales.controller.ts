import { Request, Response } from "express";
import { z } from "zod";

import { getDailySalesReport } from "../services/daily-sales.service";

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const querySchema = z.object({
    from: dateText,
    to: dateText,
    tz: z.coerce.number().int().min(-840).max(840).default(0)
}).refine((data) => data.from <= data.to, {
    message: "Start date must be before or equal to end date.",
    path: ["from"]
});

// GET /api/reports/daily-sales?from=2026-11-26&to=2026-11-26&tz=-330
export const getDailySalesController = async (
    req: Request,
    res: Response
): Promise<void> => {
    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
        res.status(400).json({
            success: false,
            message: "Invalid report date filters."
        });
        return;
    }

    try {
        const report = await getDailySalesReport({
            from: parsed.data.from,
            to: parsed.data.to,
            tzOffsetMinutes: parsed.data.tz
        });

        res.status(200).json({
            success: true,
            message: "Daily sales report retrieved successfully.",
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to retrieve daily sales report."
        });
    }
};
