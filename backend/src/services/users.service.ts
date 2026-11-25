
import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase";

const validatePin = (pin: string): void => {
    if (!/^\d{6}$/.test(pin)) {
        throw new Error("PIN must contain exactly 6 digits.");
    }
};

export const getAllUsers = async () => {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, owner_name, email, mobile, role, is_active, created_at")
        .order("created_at", { ascending: true });

    if (error) {
        throw new Error("Unable to retrieve users.");
    }

    return data;
};

export const addViewer = async (input: {
    ownerName: string;
    email?: string;
    mobile: string;
    pin: string;
}) => {
    validatePin(input.pin);

    const pinHash = await bcrypt.hash(input.pin, 12);

    const { data, error } = await supabase
        .from("profiles")
        .insert({
            owner_name: input.ownerName.trim(),
            email: input.email?.trim() || null,
            mobile: input.mobile.trim(),
            pin_hash: pinHash,
            role: "viewer",
            is_active: true
        })
        .select("id, owner_name, email, mobile, role, is_active")
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error("Mobile number or email is already registered.");
        }

        throw new Error("Unable to create viewer account.");
    }

    return data;
};

export const updateUserStatus = async (
    userId: string,
    isActive: boolean,
    currentUserId: string
) => {
    if (userId === currentUserId) {
        throw new Error("You cannot deactivate your own account.");
    }

    const { data: target, error: targetError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", userId)
        .maybeSingle();

    if (targetError || !target) {
        throw new Error("User not found.");
    }

    if (target.role === "owner") {
        throw new Error("Owner accounts cannot be deactivated here.");
    }

    const { data, error } = await supabase
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", userId)
        .select("id, owner_name, role, is_active")
        .single();

    if (error) {
        throw new Error("Unable to update user status.");
    }

    // Revoke all existing sessions when deactivating.
    if (!isActive) {
        const { error: sessionError } = await supabase
            .from("user_sessions")
            .update({ revoked_at: new Date().toISOString() })
            .eq("profile_id", userId)
            .is("revoked_at", null);

        if (sessionError) {
            throw new Error("User status updated, but session revocation failed. Retry the operation.");
        }
    }

    return data;
};

export const resetUserPin = async (
    userId: string,
    newPin: string
) => {
    validatePin(newPin);

    const { data: target, error: targetError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

    if (targetError || !target) {
        throw new Error("User not found.");
    }

    const pinHash = await bcrypt.hash(newPin, 12);

    const { error } = await supabase
        .from("profiles")
        .update({ pin_hash: pinHash })
        .eq("id", userId);

    if (error) {
        throw new Error("Unable to reset PIN.");
    }

    // Revoke previous sessions after a PIN reset.
    const { error: sessionError } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("profile_id", userId)
        .is("revoked_at", null);

    if (sessionError) {
        throw new Error("PIN changed, but session revocation failed. Revoke existing sessions before continuing.");
    }

    return { success: true };
};
