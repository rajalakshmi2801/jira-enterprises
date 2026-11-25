
import { Router } from "express";
import {
    getNotesController,
    getNoteByIdController,
    createNoteController,
    updateNoteController,
    toggleNoteCompletionController,
    deleteNoteController,
} from "../controllers/notes.controller";
import { authenticateUser, requireOwner } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateUser);

// Read operations
router.get("/", getNotesController);
router.get("/:id", getNoteByIdController);

// Owner-only operations
router.post("/", requireOwner, createNoteController);
router.put("/:id", requireOwner, updateNoteController);
router.patch("/:id/completion", requireOwner, toggleNoteCompletionController);
router.delete("/:id", requireOwner, deleteNoteController);

export default router;
