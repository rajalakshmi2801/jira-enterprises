import { Request, Response } from "express";

import {
    changeOwnPin,
    resetOwnerPinWithSecret
} from "../services/pin.service";

// POST /api/auth/change-pin   (signed in)
export const changePin = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { currentPin, newPin } = req.body ?? {};

    if (
        !req.authUser ||
        typeof currentPin !== "string" ||
        typeof newPin !== "string" ||
        !/^\d{6}$/.test(currentPin) ||
        !/^\d{6}$/.test(newPin)
    ) {
        res.status(400).json({
            success: false,
            message: "Enter your current PIN and a new 6-digit PIN."
        });
        return;
    }

    try {
        await changeOwnPin(
            req.authUser.id,
            currentPin,
            newPin,
            req.cookies?.jira_session
        );

        res.status(200).json({
            success: true,
            message: "PIN changed successfully."
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to change PIN."
        });
    }
};

// POST /api/auth/reset-pin   (not signed in; owner forgot PIN)
export const resetPinWithSecret = async (
    req: Request,
    res: Response
): Promise<void> => {
    // No secret is typed by the user. Safety gate instead: outside
    // production this works freely; in production the server admin must
    // switch it on with ALLOW_OWNER_PIN_RESET=true in backend/.env.
    const allowed =
        process.env.NODE_ENV !== "production" ||
        process.env.ALLOW_OWNER_PIN_RESET === "true";

    if (!allowed) {
        res.status(403).json({
            success: false,
            message:
                "Owner PIN reset is disabled on this server. Ask the server administrator to enable it."
        });
        return;
    }

    const { mobile, newPin } = req.body ?? {};

    if (
        typeof mobile !== "string" ||
        !/^\+?[0-9]{10,15}$/.test(mobile.trim()) ||
        typeof newPin !== "string" ||
        !/^\d{6}$/.test(newPin)
    ) {
        res.status(400).json({
            success: false,
            message: "Enter the owner's mobile number and a new 6-digit PIN."
        });
        return;
    }

    try {
        await resetOwnerPinWithSecret(mobile, newPin);

        res.status(200).json({
            success: true,
            message: "PIN reset successfully. Please sign in with the new PIN."
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to reset PIN."
        });
    }
};
