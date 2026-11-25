
import { supabase } from "../config/supabase";

export interface ReportFilters {
    from: string;
    to: string;
}

interface ReportQueryResult {
    data: unknown[] | null;
    error: { message: string } | null;
}

interface ReportQuery extends PromiseLike<ReportQueryResult> {
    range(from: number, to: number): ReportQuery;
    eq(column: string, value: string): ReportQuery;
    gte(column: string, value: string): ReportQuery;
    lte(column: string, value: string): ReportQuery;
    in(column: string, values: string[]): ReportQuery;
    order(
        column: string,
        options: { ascending: boolean }
    ): ReportQuery;
}

interface SaleRecord {
    id: string;
    invoice_number: string;
    customer_id: string | null;
    sale_date: string;
    total_amount: number | string | null;
    discount_amount: number | string | null;
    status: string;
}

interface PurchaseRecord {
    id: string;
    supplier_name: string | null;
    invoice_number: string | null;
    purchase_date: string;
    total_amount: number | string | null;
    notes: string | null;
}

interface ExpenseRecord {
    id: string;
    expense_title: string;
    category: string | null;
    amount: number | string | null;
    expense_date: string;
    payment_method: string | null;
    description: string | null;
}

interface SaleItemRecord {
    id: string;
    sale_id: string;
    product_variant_id: string;
    quantity_cases: number | string | null;
    cost_price_per_case: number | string | null;
    selling_price_per_case: number | string | null;
    subtotal: number | string | null;
}

interface PurchaseItemRecord {
    id: string;
    purchase_id: string;
    product_variant_id: string;
    quantity_cases: number | string | null;
    purchase_price_per_case: number | string | null;
    subtotal: number | string | null;
}

const PAGE_SIZE = 1000;

const fetchAllRows = async <T>(
    table: string,
    select: string,
    applyFilters?: (query: ReportQuery) => ReportQuery
): Promise<T[]> => {
    const allRows: T[] = [];
    let offset = 0;

    while (true) {
        let query = supabase
            .from(table as never)
            .select(select) as unknown as ReportQuery;

        query = query.range(
            offset,
            offset + PAGE_SIZE - 1
        );

        if (applyFilters) {
            query = applyFilters(query);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        const rows = (data ?? []) as T[];

        allRows.push(...rows);

        if (rows.length < PAGE_SIZE) {
            break;
        }

        offset += PAGE_SIZE;
    }

    return allRows;
};

const getCompletedSales = async (
    filters: ReportFilters
): Promise<SaleRecord[]> => {
    return fetchAllRows<SaleRecord>(
        "sales",
        "id, invoice_number, customer_id, sale_date, total_amount, discount_amount, status",
        (query) =>
            query
                .eq("status", "completed")
                .gte("sale_date", `${filters.from}T00:00:00`)
                .lte("sale_date", `${filters.to}T23:59:59`)
                .order("sale_date", { ascending: false })
    );
};

const getPurchaseRecords = async (
    filters: ReportFilters
): Promise<PurchaseRecord[]> => {
    return fetchAllRows<PurchaseRecord>(
        "purchase_records",
        "id, supplier_name, invoice_number, purchase_date, total_amount, notes",
        (query) =>
            query
                .gte("purchase_date", `${filters.from}T00:00:00`)
                .lte("purchase_date", `${filters.to}T23:59:59.999`)
                .order("purchase_date", { ascending: false })
    );
};

const getExpenseRecords = async (
    filters: ReportFilters
): Promise<ExpenseRecord[]> => {
    return fetchAllRows<ExpenseRecord>(
        "business_expenses",
        "id, expense_title, category, amount, expense_date, payment_method, description",
        (query) =>
            query
                .gte("expense_date", `${filters.from}T00:00:00`)
                .lte("expense_date", `${filters.to}T23:59:59.999`)
                .order("expense_date", { ascending: false })
    );
};

const getSaleItemsBySaleIds = async (
    saleIds: string[]
): Promise<SaleItemRecord[]> => {
    if (saleIds.length === 0) {
        return [];
    }

    const allItems: SaleItemRecord[] = [];
    const batchSize = 100;

    for (let i = 0; i < saleIds.length; i += batchSize) {
        const batchIds = saleIds.slice(i, i + batchSize);

        const items = await fetchAllRows<SaleItemRecord>(
            "sale_items",
            "id, sale_id, product_variant_id, quantity_cases, cost_price_per_case, selling_price_per_case, subtotal",
            (query) => query.in("sale_id", batchIds)
        );

        allItems.push(...items);
    }

    return allItems;
};

const getPurchaseItemsByPurchaseIds = async (
    purchaseIds: string[]
): Promise<PurchaseItemRecord[]> => {
    if (purchaseIds.length === 0) {
        return [];
    }

    const allItems: PurchaseItemRecord[] = [];
    const batchSize = 100;

    for (let i = 0; i < purchaseIds.length; i += batchSize) {
        const batchIds = purchaseIds.slice(i, i + batchSize);

        const items = await fetchAllRows<PurchaseItemRecord>(
            "purchase_items",
            "id, purchase_id, product_variant_id, quantity_cases, purchase_price_per_case, subtotal",
            (query) => query.in("purchase_id", batchIds)
        );

        allItems.push(...items);
    }

    return allItems;
};

export const getSalesReport = async (filters: ReportFilters) => {
    const sales = await getCompletedSales(filters);

    const saleItems = await getSaleItemsBySaleIds(
        sales.map((sale) => sale.id)
    );

    const totalSales = sales.reduce(
        (sum, sale) => sum + Number(sale.total_amount ?? 0),
        0
    );

    const totalDiscounts = sales.reduce(
        (sum, sale) => sum + Number(sale.discount_amount ?? 0),
        0
    );

    const totalCasesSold = saleItems.reduce(
        (sum, item) => sum + Number(item.quantity_cases ?? 0),
        0
    );

    return {
        summary: {
            salesCount: sales.length,
            totalSales,
            totalDiscounts,
            totalCasesSold,
        },
        sales,
        saleItems,
    };
};

export const getPurchaseReport = async (filters: ReportFilters) => {
    const purchases = await getPurchaseRecords(filters);

    const purchaseItems = await getPurchaseItemsByPurchaseIds(
        purchases.map((purchase) => purchase.id)
    );

    const totalPurchases = purchases.reduce(
        (sum, purchase) => sum + Number(purchase.total_amount ?? 0),
        0
    );

    const totalCasesPurchased = purchaseItems.reduce(
        (sum, item) => sum + Number(item.quantity_cases ?? 0),
        0
    );

    return {
        summary: {
            purchaseCount: purchases.length,
            totalPurchases,
            totalCasesPurchased,
        },
        purchases,
        purchaseItems,
    };
};

export const getExpenseReport = async (filters: ReportFilters) => {
    const expenses = await getExpenseRecords(filters);

    const totalExpenses = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount ?? 0),
        0
    );

    const categorySummary: Record<string, number> = {};

    expenses.forEach((expense) => {
        const category = expense.category || "Uncategorized";

        categorySummary[category] =
            (categorySummary[category] ?? 0) +
            Number(expense.amount ?? 0);
    });

    return {
        summary: {
            expenseCount: expenses.length,
            totalExpenses,
            categorySummary,
        },
        expenses,
    };
};

export const getProfitReport = async (filters: ReportFilters) => {
    const sales = await getCompletedSales(filters);

    const saleItems = await getSaleItemsBySaleIds(
        sales.map((sale) => sale.id)
    );

    const expenses = await getExpenseRecords(filters);

    const totalSales = sales.reduce(
        (sum, sale) => sum + Number(sale.total_amount ?? 0),
        0
    );

    const totalCost = saleItems.reduce(
        (sum, item) =>
            sum +
            Number(item.quantity_cases ?? 0) *
            Number(item.cost_price_per_case ?? 0),
        0
    );

    const totalExpenses = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount ?? 0),
        0
    );

    const grossProfit = totalSales - totalCost;
    const netProfit = grossProfit - totalExpenses;

    return {
        summary: {
            totalSales,
            costOfGoodsSold: totalCost,
            grossProfit,
            totalExpenses,
            netProfit,
        },
    };
};

export const getReportsOverview = async (filters: ReportFilters) => {
    const [sales, purchases, expenses, profit] = await Promise.all([
        getSalesReport(filters),
        getPurchaseReport(filters),
        getExpenseReport(filters),
        getProfitReport(filters),
    ]);

    return {
        sales: sales.summary,
        purchases: purchases.summary,
        expenses: expenses.summary,
        profit: profit.summary,
        period: filters,
    };
};
