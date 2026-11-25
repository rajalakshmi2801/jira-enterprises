
import { Request, Response } from "express";
import { z } from "zod";

import {
    getBusinessSettings,
    updateBusinessSettings
} from "../services/settings.service";

const updateSettingsSchema = z.object({
    business_name: z.string().trim().min(2).max(150).optional(),
    owner_name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().max(150).nullable().optional()
}).strict().refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "At least one setting must be provided."
    }
);

export const getSettingsController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const settings = await getBusinessSettings();

        res.status(200).json({
            success: true,
            message: "Business settings retrieved successfully.",
            data: settings
        });
    } catch (error) {
        console.error("Get settings error:", error);

        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to retrieve settings."
        });
    }
};

export const updateSettingsController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = updateSettingsSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid settings data.",
                errors: validation.error.flatten()
            });
            return;
        }

        const settings = await updateBusinessSettings(
            validation.data
        );

        res.status(200).json({
            success: true,
            message: "Business settings updated successfully.",
            data: settings
        });
    } catch (error) {
        console.error("Update settings error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to update settings."
        });
    }
};
