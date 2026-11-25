
import { Request, Response } from "express";
import { z } from "zod";
import {
    getSalesReport,
    getPurchaseReport,
    getExpenseReport,
    getProfitReport,
    getReportsOverview,
} from "../services/reports.service";

const reportFiltersSchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date"),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date"),
}).refine(
    (data) => data.from <= data.to,
    {
        message: "Start date must be before or equal to end date.",
        path: ["from"],
    }
);

const getFilters = (req: Request) => {
    return reportFiltersSchema.safeParse({
        from: req.query.from,
        to: req.query.to,
    });
};

export const getSalesReportController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = getFilters(req);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid report date filters.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const report = await getSalesReport(validation.data);

        res.status(200).json({
            success: true,
            message: "Sales report retrieved successfully.",
            data: report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to retrieve sales report.",
        });
    }
};

export const getPurchaseReportController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = getFilters(req);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid report date filters.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const report = await getPurchaseReport(validation.data);

        res.status(200).json({
            success: true,
            message: "Purchase report retrieved successfully.",
            data: report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to retrieve purchase report.",
        });
    }
};

export const getExpenseReportController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = getFilters(req);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid report date filters.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const report = await getExpenseReport(validation.data);

        res.status(200).json({
            success: true,
            message: "Expense report retrieved successfully.",
            data: report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to retrieve expense report.",
        });
    }
};

export const getProfitReportController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = getFilters(req);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid report date filters.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const report = await getProfitReport(validation.data);

        res.status(200).json({
            success: true,
            message: "Profit report retrieved successfully.",
            data: report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to retrieve profit report.",
        });
    }
};

export const getReportsOverviewController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = getFilters(req);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid report date filters.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const report = await getReportsOverview(validation.data);

        res.status(200).json({
            success: true,
            message: "Reports overview retrieved successfully.",
            data: report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to retrieve reports overview.",
        });
    }
};
