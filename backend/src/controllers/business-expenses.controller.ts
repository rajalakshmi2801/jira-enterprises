
import { Request, Response } from "express";
import { z } from "zod";
import {
    getExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpenseSummary,
} from "../services/business-expenses.service";

const createExpenseSchema = z.object({
    expense_title: z.string().trim().min(1).max(150),
    category: z.string().trim().max(100).nullable().optional(),
    amount: z.number().positive(),
    expense_date: z.string().min(1),
    payment_method: z.enum(["cash", "upi"]).nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
});

const updateExpenseSchema = z.object({
    expense_title: z.string().trim().min(1).max(150).optional(),
    category: z.string().trim().max(100).nullable().optional(),
    amount: z.number().positive().optional(),
    expense_date: z.string().min(1).optional(),
    payment_method: z.enum(["cash", "upi"]).nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "At least one field is required to update.",
    }
);

const dateFilterSchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    category: z.string().optional(),
});

const validateDateFilters = (query: Request["query"]) => {
    return dateFilterSchema.safeParse({
        from: query.from,
        to: query.to,
        category: query.category,
    });
};

export const getExpensesController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = validateDateFilters(req.query);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid expense filters.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const expenses = await getExpenses(validation.data);

        res.status(200).json({
            success: true,
            message: "Expenses retrieved successfully.",
            data: expenses,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to retrieve expenses.",
        });
    }
};

export const getExpenseByIdController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const expenseId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const expense = await getExpenseById(expenseId);

        res.status(200).json({
            success: true,
            message: "Expense retrieved successfully.",
            data: expense,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Expense not found.",
        });
    }
};

export const createExpenseController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = createExpenseSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid expense data.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const expense = await createExpense(validation.data);

        res.status(201).json({
            success: true,
            message: "Expense created successfully.",
            data: expense,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to create expense.",
        });
    }
};

export const updateExpenseController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const expenseId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const validation = updateExpenseSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid expense update data.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const expense = await updateExpense(expenseId, validation.data);

        res.status(200).json({
            success: true,
            message: "Expense updated successfully.",
            data: expense,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to update expense.",
        });
    }
};

export const deleteExpenseController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const expenseId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        await deleteExpense(expenseId);

        res.status(200).json({
            success: true,
            message: "Expense deleted successfully.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to delete expense.",
        });
    }
};

export const getExpenseSummaryController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = validateDateFilters(req.query);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid expense filters.",
                errors: validation.error.flatten(),
            });
            return;
        }

        const summary = await getExpenseSummary(validation.data);

        res.status(200).json({
            success: true,
            message: "Expense summary retrieved successfully.",
            data: summary,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to retrieve expense summary.",
        });
    }
};
