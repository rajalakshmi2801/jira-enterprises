
import { Request, Response } from "express";
import { z } from "zod";
import {
    getNotes,
    getNoteById,
    createNote,
    updateNote,
    toggleNoteCompletion,
    deleteNote,
} from "../services/notes.service";

const createNoteSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    reminder_at: z.string().datetime().nullable().optional(),
});

const updateNoteSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    reminder_at: z.string().datetime().nullable().optional(),
    is_completed: z.boolean().optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "At least one field is required.",
    }
);

export const getNotesController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const status = req.query.status ?? "all";

        if (
            status !== "all" &&
            status !== "pending" &&
            status !== "completed"
        ) {
            res.status(400).json({
                success: false,
                message: "Status must be all, pending, or completed.",
            });
            return;
        }

        const notes = await getNotes(status);

        res.status(200).json({
            success: true,
            message: "Notes retrieved successfully.",
            data: notes,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to retrieve notes.",
        });
    }
};

export const getNoteByIdController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const noteId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const note = await getNoteById(noteId);

        res.status(200).json({
            success: true,
            message: "Note retrieved successfully.",
            data: note,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Note not found.",
        });
    }
};

export const createNoteController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = createNoteSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid note data.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const note = await createNote(validation.data);

        res.status(201).json({
            success: true,
            message: "Note created successfully.",
            data: note,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to create note.",
        });
    }
};

export const updateNoteController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const noteId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const validation = updateNoteSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid note update data.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const note = await updateNote(noteId, validation.data);

        res.status(200).json({
            success: true,
            message: "Note updated successfully.",
            data: note,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to update note.",
        });
    }
};

export const toggleNoteCompletionController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const noteId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const validation = z.object({
            is_completed: z.boolean(),
        }).safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "is_completed must be true or false.",
            });
            return;
        }

        const note = await toggleNoteCompletion(
            noteId,
            validation.data.is_completed
        );

        res.status(200).json({
            success: true,
            message: validation.data.is_completed
                ? "Note marked as completed."
                : "Note marked as pending.",
            data: note,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to update note status.",
        });
    }
};

export const deleteNoteController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const noteId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        await deleteNote(noteId);

        res.status(200).json({
            success: true,
            message: "Note deleted successfully.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to delete note.",
        });
    }
};
