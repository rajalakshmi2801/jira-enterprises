
import { Request, Response } from "express";
import { getDashboardData } from "../services/dashboard.service";

export const getDashboardController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const dashboard = await getDashboardData();

        res.status(200).json({
            success: true,
            message: "Dashboard data retrieved successfully.",
            data: dashboard,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to retrieve dashboard data.",
        });
    }
};
