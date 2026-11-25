
import { Request, Response } from "express";

import {
    getAllUsers,
    addViewer,
    updateUserStatus,
    resetUserPin
} from "../services/users.service";

// Safely extract route parameters in Express 5.
const getUserId = (req: Request): string | null => {
    const param = req.params.id;

    if (typeof param === "string" && param.trim()) {
        return param.trim();
    }

    if (Array.isArray(param) && typeof param[0] === "string") {
        return param[0].trim() || null;
    }

    return null;
};

// Get all users.
export const listUsers = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const users = await getAllUsers();

        res.status(200).json({
            success: true,
            users
        });

    } catch (error) {
        console.error("List users error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve users."
        });
    }
};

// Create Viewer.
export const createViewer = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { ownerName, email, mobile, pin } = req.body;

        if (
            typeof ownerName !== "string" ||
            !ownerName.trim() ||
            typeof mobile !== "string" ||
            !/^\+?[0-9]{10,15}$/.test(mobile.trim()) ||
            (email !== undefined && typeof email !== "string") ||
            typeof pin !== "string" ||
            !/^\d{6}$/.test(pin)
        ) {
            res.status(400).json({
                success: false,
                message: "Enter a valid name, mobile number and six-digit PIN."
            });
            return;
        }

        const user = await addViewer({
            ownerName: ownerName.trim(),
            email,
            mobile: mobile.trim(),
            pin
        });

        res.status(201).json({
            success: true,
            message: "Viewer created successfully.",
            user
        });

    } catch (error) {
        console.error("Create viewer error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to create viewer."
        });
    }
};

// Activate or deactivate user.
export const changeUserStatus = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = getUserId(req);
        const { isActive } = req.body;

        if (!userId) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
            return;
        }

        if (typeof isActive !== "boolean" || !req.authUser) {
            res.status(400).json({
                success: false,
                message: "A valid account status is required."
            });
            return;
        }

        const user = await updateUserStatus(
            userId,
            isActive,
            req.authUser.id
        );

        res.status(200).json({
            success: true,
            message: "User status updated successfully.",
            user
        });

    } catch (error) {
        console.error("Update user status error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to update user."
        });
    }
};

// Change user PIN.
export const changeUserPin = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = getUserId(req);
        const { pin } = req.body;

        if (!userId) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
            return;
        }

        if (
            typeof pin !== "string" ||
            !/^\d{6}$/.test(pin)
        ) {
            res.status(400).json({
                success: false,
                message: "PIN must contain exactly six digits."
            });
            return;
        }

        await resetUserPin(userId, pin);

        res.status(200).json({
            success: true,
            message: "User PIN changed successfully."
        });

    } catch (error) {
        console.error("Change user PIN error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to change PIN."
        });
    }
};
