
import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase";
import {
    generateSessionToken,
    hashSessionToken
} from "../utils/token";

const SESSION_HOURS = Number(
    process.env.SESSION_TTL_HOURS || 24
);

const hashPin = async (pin: string): Promise<string> => {
    return bcrypt.hash(pin, 12);
};

const verifyPin = async (
    pin: string,
    pinHash: string
): Promise<boolean> => {
    return bcrypt.compare(pin, pinHash);
};

const validatePin = (pin: string): void => {
    if (!/^\d{6}$/.test(pin)) {
        throw new Error("PIN must contain exactly 6 digits.");
    }
};

const createSession = async (profileId: string) => {
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);

    const expiresAt = new Date(
        Date.now() + SESSION_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabase
        .from("user_sessions")
        .insert({
            profile_id: profileId,
            token_hash: tokenHash,
            expires_at: expiresAt
        });

    if (error) {
        throw new Error("Unable to create login session.");
    }

    return { token, expiresAt };
};

export const registerInitialOwner = async (input: {
    ownerName: string;
    email?: string;
    mobile: string;
    pin: string;
}) => {
    validatePin(input.pin);

    const pinHash = await hashPin(input.pin);

    const { data: profileId, error } = await supabase.rpc(
        "create_initial_owner",
        {
            p_owner_name: input.ownerName,
            p_email: input.email || "",
            p_mobile: input.mobile,
            p_pin_hash: pinHash
        }
    );

    if (error || !profileId) {
        throw new Error(
            error?.message || "Owner registration failed."
        );
    }

    return createSession(profileId);
};


export const loginWithMobileAndPin = async (
    mobile: string,
    pin: string
) => {
    validatePin(pin);

    const normalizedMobile = mobile.trim();

    if (!/^\+?[0-9]{10,15}$/.test(normalizedMobile)) {
        throw new Error("Please enter a valid mobile number.");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, owner_name, role, pin_hash, is_active")
        .eq("mobile", normalizedMobile)
        .maybeSingle();

    if (error || !profile || !profile.is_active) {
        throw new Error("Invalid mobile number or PIN.");
    }

    const isValid = await verifyPin(pin, profile.pin_hash);

    if (!isValid) {
        throw new Error("Invalid mobile number or PIN.");
    }

    const session = await createSession(profile.id);

    return {
        ...session,
        user: {
            id: profile.id,
            ownerName: profile.owner_name,
            role: profile.role
        }
    };
};


export const createBusinessUser = async (input: {
    ownerName: string;
    email?: string;
    mobile: string;
    pin: string;
}) => {
    validatePin(input.pin);

    const pinHash = await hashPin(input.pin);

    const { data: profiles, error: fetchError } = await supabase
        .from("profiles")
        .select("pin_hash");

    if (fetchError) {
        throw new Error("Unable to validate PIN.");
    }

    for (const profile of profiles || []) {
        if (await verifyPin(input.pin, profile.pin_hash)) {
            throw new Error("This PIN is already assigned to another user.");
        }
    }

    const { data, error } = await supabase
        .from("profiles")
        .insert({
            owner_name: input.ownerName,
            email: input.email || null,
            mobile: input.mobile,
            pin_hash: pinHash,
            role: "viewer",
            is_active: true
        })
        .select("id, owner_name, email, mobile, role, is_active")
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

export const logoutUser = async (token: string): Promise<void> => {
    const tokenHash = hashSessionToken(token);

    const { error } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", tokenHash)
        .is("revoked_at", null);

    if (error) {
        throw new Error("Unable to logout.");
    }
};


export const isOwnerRegistered = async (): Promise<boolean> => {
    const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "owner");

    if (error) {
        throw new Error("Unable to check owner registration.");
    }

    return (count ?? 0) > 0;
};
