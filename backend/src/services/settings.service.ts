
import { supabase } from "../config/supabase";

export interface BusinessSettings {
    business_name: string | null;
    owner_name: string;
    email: string | null;
    mobile: string;
    gst_number: string | null;
    business_address: string | null;
    licence_number: string | null;
    licence_expiry: string | null;
}

export interface UpdateBusinessSettings {
    business_name?: string;
    owner_name?: string;
    email?: string | null;
    gst_number?: string | null;
    business_address?: string | null;
    licence_number?: string | null;
    licence_expiry?: string | null;
}

export const getBusinessSettings = async (): Promise<BusinessSettings> => {
    const { data, error } = await supabase
        .from("profiles")
        .select("business_name, owner_name, email, mobile, gst_number, business_address, licence_number, licence_expiry")
        .eq("role", "owner")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error("Unable to retrieve business settings.");
    }

    if (!data) {
        throw new Error("Business owner profile not found.");
    }

    return data;
};

export const updateBusinessSettings = async (
    settings: UpdateBusinessSettings
): Promise<BusinessSettings> => {

    const { data: owner, error: ownerError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "owner")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

    if (ownerError || !owner) {
        throw new Error("Business owner profile not found.");
    }

    const updateData: UpdateBusinessSettings = {};

    if (settings.business_name !== undefined) {
        updateData.business_name = settings.business_name.trim();
    }

    if (settings.owner_name !== undefined) {
        updateData.owner_name = settings.owner_name.trim();
    }

    if (settings.email !== undefined) {
        updateData.email = settings.email?.trim() || null;
    }

    if (settings.gst_number !== undefined) {
        updateData.gst_number = settings.gst_number?.trim() || null;
    }

    if (settings.business_address !== undefined) {
        updateData.business_address = settings.business_address?.trim() || null;
    }

    if (settings.licence_number !== undefined) {
        updateData.licence_number = settings.licence_number?.trim() || null;
    }

    if (settings.licence_expiry !== undefined) {
        updateData.licence_expiry = settings.licence_expiry || null;
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            ...updateData,
            updated_at: new Date().toISOString()
        })
        .eq("id", owner.id);

    if (error) {
        throw new Error("Unable to update business settings.");
    }

    return getBusinessSettings();
};
