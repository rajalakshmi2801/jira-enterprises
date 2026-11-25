
import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { hashSessionToken } from "../utils/token";

export const authenticateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.cookies?.jira_session;

        if (!token) {
            res.status(401).json({
                success: false,
                message: "Please login to continue."
            });
            return;
        }

        const tokenHash = hashSessionToken(token);

        const { data: session, error } = await supabase
            .from("user_sessions")
            .select("profile_id, expires_at, revoked_at")
            .eq("token_hash", tokenHash)
            .maybeSingle();

        if (error || !session ||
            session.revoked_at ||
            new Date(session.expires_at) <= new Date()) {
            res.clearCookie("jira_session");
            res.status(401).json({
                success: false,
                message: "Your session is invalid or expired."
            });
            return;
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, owner_name, role, is_active")
            .eq("id", session.profile_id)
            .maybeSingle();

        if (profileError || !profile || !profile.is_active) {
            res.status(401).json({
                success: false,
                message: "User account is inactive."
            });
            return;
        }

        req.authUser = {
            id: profile.id,
            ownerName: profile.owner_name,
            role: profile.role
        };

        next();

    } catch (error) {
        console.error("Authentication error:", error);

        res.status(500).json({
            success: false,
            message: "Authentication failed."
        });
    }
};

export const requireOwner = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (req.authUser?.role !== "owner") {
        res.status(403).json({
            success: false,
            message: "Only the business owner can perform this action."
        });
        return;
    }

    next();
};
