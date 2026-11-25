import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase";
import { hashSessionToken } from "../utils/token";

const validatePin = (pin: string): void => {
    if (!/^\d{6}$/.test(pin)) {
        throw new Error("PIN must contain exactly 6 digits.");
    }
};

/**
 * A signed-in user changes their own PIN. The current PIN must be
 * confirmed. Every OTHER session is revoked; the current one stays valid.
 */
export const changeOwnPin = async (
    profileId: string,
    currentPin: string,
    newPin: string,
    currentToken: string | undefined
): Promise<void> => {
    validatePin(currentPin);
    validatePin(newPin);

    if (currentPin === newPin) {
        throw new Error("The new PIN must be different from the current PIN.");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, pin_hash, is_active")
        .eq("id", profileId)
        .maybeSingle();

    if (error || !profile || !profile.is_active) {
        throw new Error("Unable to change PIN.");
    }

    const matches = await bcrypt.compare(currentPin, profile.pin_hash);

    if (!matches) {
        throw new Error("Your current PIN is incorrect.");
    }

    const pinHash = await bcrypt.hash(newPin, 12);

    const { error: updateError } = await supabase
        .from("profiles")
        .update({
            pin_hash: pinHash,
            updated_at: new Date().toISOString()
        })
        .eq("id", profileId);

    if (updateError) {
        throw new Error("Unable to change PIN.");
    }

    let revoke = supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("profile_id", profileId)
        .is("revoked_at", null);

    if (currentToken) {
        revoke = revoke.neq("token_hash", hashSessionToken(currentToken));
    }

    const { error: revokeError } = await revoke;

    if (revokeError) {
        throw new Error(
            "PIN changed, but other sessions could not be signed out."
        );
    }
};

/**
 * Forgot-PIN recovery for the OWNER. Authorised by the server's
 * INITIAL_SETUP_SECRET (checked in the controller). All sessions are revoked.
 * The same generic error is returned whether or not the mobile exists.
 */
export const resetOwnerPinWithSecret = async (
    mobile: string,
    newPin: string
): Promise<void> => {
    validatePin(newPin);

    const { data: owner, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("mobile", mobile.trim())
        .eq("role", "owner")
        .eq("is_active", true)
        .maybeSingle();

    if (error || !owner) {
        throw new Error("No owner account matches these details.");
    }

    const pinHash = await bcrypt.hash(newPin, 12);

    const { error: updateError } = await supabase
        .from("profiles")
        .update({
            pin_hash: pinHash,
            updated_at: new Date().toISOString()
        })
        .eq("id", owner.id);

    if (updateError) {
        throw new Error("Unable to reset PIN.");
    }

    const { error: revokeError } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("profile_id", owner.id)
        .is("revoked_at", null);

    if (revokeError) {
        throw new Error("PIN reset, but old sessions could not be signed out.");
    }
};
