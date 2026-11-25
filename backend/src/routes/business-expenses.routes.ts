
import { Router } from "express";
import {
    getExpensesController,
    getExpenseByIdController,
    createExpenseController,
    updateExpenseController,
    deleteExpenseController,
    getExpenseSummaryController,
} from "../controllers/business-expenses.controller";
import { authenticateUser, requireOwner } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateUser);

// Read access - owner and viewer
router.get("/", getExpensesController);
router.get("/summary", getExpenseSummaryController);
router.get("/:id", getExpenseByIdController);

// Write access - owner only
router.post("/", requireOwner, createExpenseController);
router.put("/:id", requireOwner, updateExpenseController);
router.delete("/:id", requireOwner, deleteExpenseController);

export default router;
