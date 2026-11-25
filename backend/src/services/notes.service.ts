
import { supabase } from "../config/supabase";

export interface BusinessNote {
    id: string;
    title: string;
    description: string | null;
    reminder_at: string | null;
    is_completed: boolean;
    created_at?: string;
}

export interface CreateNoteData {
    title: string;
    description?: string | null;
    reminder_at?: string | null;
}

export interface UpdateNoteData {
    title?: string;
    description?: string | null;
    reminder_at?: string | null;
    is_completed?: boolean;
}

export const getNotes = async (
    status: "all" | "pending" | "completed" = "all"
): Promise<BusinessNote[]> => {
    let query = supabase
        .from("notes")
        .select("*")
        .order("is_completed", { ascending: true })
        .order("reminder_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

    if (status === "pending") {
        query = query.eq("is_completed", false);
    }

    if (status === "completed") {
        query = query.eq("is_completed", true);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as BusinessNote[];
};

export const getNoteById = async (
    noteId: string
): Promise<BusinessNote> => {
    const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as BusinessNote;
};

export const createNote = async (
    noteData: CreateNoteData
): Promise<BusinessNote> => {
    const { data, error } = await supabase
        .from("notes")
        .insert({
            title: noteData.title,
            description: noteData.description ?? null,
            reminder_at: noteData.reminder_at ?? null,
            is_completed: false,
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as BusinessNote;
};

export const updateNote = async (
    noteId: string,
    noteData: UpdateNoteData
): Promise<BusinessNote> => {
    const { data, error } = await supabase
        .from("notes")
        .update(noteData)
        .eq("id", noteId)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as BusinessNote;
};

export const toggleNoteCompletion = async (
    noteId: string,
    isCompleted: boolean
): Promise<BusinessNote> => {
    const { data, error } = await supabase
        .from("notes")
        .update({ is_completed: isCompleted })
        .eq("id", noteId)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as BusinessNote;
};

export const deleteNote = async (
    noteId: string
): Promise<void> => {
    const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId);

    if (error) {
        throw new Error(error.message);
    }
};
