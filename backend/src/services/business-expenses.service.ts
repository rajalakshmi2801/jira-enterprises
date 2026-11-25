
import { supabase } from "../config/supabase";

export interface BusinessExpense {
    id: string;
    expense_title: string;
    category: string | null;
    amount: number;
    expense_date: string;
    payment_method: "cash" | "upi" | null;
    description: string | null;
    created_at?: string;
}

export interface ExpenseFilters {
    from?: string;
    to?: string;
    category?: string;
}

export interface CreateExpenseData {
    expense_title: string;
    category?: string | null;
    amount: number;
    expense_date: string;
    payment_method?: "cash" | "upi" | null;
    description?: string | null;
}

export type UpdateExpenseData = Partial<CreateExpenseData>;

export const getExpenses = async (
    filters: ExpenseFilters = {}
): Promise<BusinessExpense[]> => {
    let query = supabase
        .from("business_expenses")
        .select("*")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (filters.from) {
        query = query.gte(
            "expense_date",
            /^d{4}-d{2}-d{2}$/.test(filters.from)
                ? `${filters.from}T00:00:00`
                : filters.from
        );
    }

    if (filters.to) {
        query = query.lte(
            "expense_date",
            /^d{4}-d{2}-d{2}$/.test(filters.to)
                ? `${filters.to}T23:59:59.999`
                : filters.to
        );
    }

    if (filters.category) {
        query = query.eq("category", filters.category);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as BusinessExpense[];
};

export const getExpenseById = async (
    expenseId: string
): Promise<BusinessExpense> => {
    const { data, error } = await supabase
        .from("business_expenses")
        .select("*")
        .eq("id", expenseId)
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as BusinessExpense;
};

export const createExpense = async (
    expenseData: CreateExpenseData
): Promise<BusinessExpense> => {
    const { data, error } = await supabase
        .from("business_expenses")
        .insert({
            expense_title: expenseData.expense_title,
            category: expenseData.category ?? null,
            amount: expenseData.amount,
            expense_date: expenseData.expense_date,
            payment_method: expenseData.payment_method ?? null,
            description: expenseData.description ?? null,
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as BusinessExpense;
};

export const updateExpense = async (
    expenseId: string,
    expenseData: UpdateExpenseData
): Promise<BusinessExpense> => {
    const { data, error } = await supabase
        .from("business_expenses")
        .update(expenseData)
        .eq("id", expenseId)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as BusinessExpense;
};

export const deleteExpense = async (
    expenseId: string
): Promise<void> => {
    const { error } = await supabase
        .from("business_expenses")
        .delete()
        .eq("id", expenseId);

    if (error) {
        throw new Error(error.message);
    }
};

export const getExpenseSummary = async (
    filters: ExpenseFilters = {}
) => {
    const expenses = await getExpenses(filters);

    const totalAmount = expenses.reduce(
        (total, expense) => total + Number(expense.amount),
        0
    );

    const categorySummary: Record<string, number> = {};

    expenses.forEach((expense) => {
        const category = expense.category || "Uncategorized";

        categorySummary[category] =
            (categorySummary[category] ?? 0) + Number(expense.amount);
    });

    return {
        totalExpenses: totalAmount,
        totalExpenseCount: expenses.length,
        categorySummary,
    };
};
