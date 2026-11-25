
import { Request, Response } from "express";
import {
    registerInitialOwner,
    loginWithMobileAndPin,
    createBusinessUser,
    logoutUser,
    isOwnerRegistered
} from "../services/auth.service";

const setSessionCookie = (
    res: Response,
    token: string,
    expiresAt: string
): void => {
    res.cookie("jira_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(expiresAt),
        path: "/"
    });
};

export const registerOwner = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // Only one owner can ever be created (enforced in the database
        // function create_initial_owner), so no setup secret is required.
        const { ownerName, email, mobile, pin } = req.body;

        if (
            typeof ownerName !== "string" ||
            !ownerName.trim() ||
            typeof mobile !== "string" ||
            !mobile.trim() ||
            (email !== undefined && typeof email !== "string") ||
            typeof pin !== "string" ||
            !/^\d{6}$/.test(pin)
        ) {
            res.status(400).json({
                success: false,
                message: "Please provide valid owner details and a 6-digit PIN."
            });
            return;
        }

        const result = await registerInitialOwner({
            ownerName: ownerName.trim(),
            email: email?.trim(),
            mobile: mobile.trim(),
            pin
        });

        setSessionCookie(res, result.token, result.expiresAt);

        res.status(201).json({
            success: true,
            message: "Initial owner registered successfully.",
            status: "REGISTERED"
        });

    } catch (error) {
        console.error("Owner registration error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Owner registration failed."
        });
    }
};


export const login = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { mobile, pin } = req.body;

        if (
            typeof mobile !== "string" ||
            typeof pin !== "string" ||
            !/^\+?[0-9]{10,15}$/.test(mobile.trim()) ||
            !/^\d{6}$/.test(pin)
        ) {
            res.status(400).json({
                success: false,
                message: "Please enter a valid mobile number and PIN."
            });
            return;
        }

        const result = await loginWithMobileAndPin(
            mobile,
            pin
        );

        setSessionCookie(
            res,
            result.token,
            result.expiresAt
        );

        res.status(200).json({
            success: true,
            message: "Login successful.",
            user: result.user
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(401).json({
            success: false,
            message: "Invalid mobile number or PIN."
        });
    }
};


export const createUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { ownerName, email, mobile, pin } = req.body;

        if (
            typeof ownerName !== "string" ||
            !ownerName.trim() ||
            typeof mobile !== "string" ||
            !mobile.trim() ||
            (email !== undefined && typeof email !== "string") ||
            typeof pin !== "string" ||
            !/^\d{6}$/.test(pin)
        ) {
            res.status(400).json({
                success: false,
                message: "Please provide valid user details and a 6-digit PIN."
            });
            return;
        }

        const user = await createBusinessUser({
            ownerName: ownerName.trim(),
            email: email?.trim(),
            mobile: mobile.trim(),
            pin
        });

        res.status(201).json({
            success: true,
            message: "Viewer created successfully.",
            user
        });

    } catch (error) {
        console.error("User creation error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to create user."
        });
    }
};

export const logout = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const token = req.cookies?.jira_session;

        if (token) {
            await logoutUser(token);
        }

        res.clearCookie("jira_session", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });

        res.status(200).json({
            success: true,
            message: "Logged out successfully."
        });

    } catch (error) {
        console.error("Logout error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to logout."
        });
    }
};

export const getCurrentUser = (
    req: Request,
    res: Response
): void => {
    res.status(200).json({
        success: true,
        user: req.authUser
    });
};


// Public: tells the login screen whether first-time owner setup is needed.
export const getSetupStatus = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const registered = await isOwnerRegistered();

        res.status(200).json({
            success: true,
            needsSetup: !registered
        });
    } catch (error) {
        console.error("Setup status error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to check setup status."
        });
    }
};
