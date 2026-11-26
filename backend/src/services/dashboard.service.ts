
import { supabase } from "../config/supabase";

const getTodayRange = () => {
    const now = new Date();

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
};

export const getDashboardData = async () => {
    const { start, end } = getTodayRange();

    const [
        salesResult,
        paymentsResult,
        expensesResult,
        allSalesResult,
        allPaymentsResult,
        stockResult,
        saleItemsResult,
        recentSalesResult,
        variantsResult,
    ] = await Promise.all([
        supabase
            .from("sales")
            .select("id, total_amount, gst_amount, sale_date")
            .eq("status", "completed")
            .gte("sale_date", start)
            .lte("sale_date", end),

        supabase
            .from("payments")
            .select("amount, payment_date")
            .gte("payment_date", start)
            .lte("payment_date", end),

        supabase
            .from("business_expenses")
            .select("amount, expense_date")
            .gte("expense_date", start)
            .lte("expense_date", end),

        supabase
            .from("sales")
            .select("id, total_amount")
            .eq("status", "completed"),

        supabase
            .from("payments")
            .select("sale_id, amount"),

        supabase
            .from("stock_movements")
            .select("product_variant_id, quantity_cases"),

        supabase
            .from("sale_items")
            .select("quantity_cases, cost_price_per_case, sale_id"),

        supabase
            .from("sales")
            .select(`
                id,
                invoice_number,
                sale_date,
                total_amount,
                status,
                customer:customers(customer_name, shop_name)
            `)
            .eq("status", "completed")
            .order("sale_date", { ascending: false })
            .limit(10),

        supabase
            .from("product_variants")
            .select(`
                id,
                variant_name,
                pieces_per_case,
                product:products(product_name, brand_name)
            `)
            .eq("is_active", true),
    ]);

    const results = [
        salesResult,
        paymentsResult,
        expensesResult,
        allSalesResult,
        allPaymentsResult,
        stockResult,
        saleItemsResult,
        recentSalesResult,
        variantsResult,
    ];

    const errorResult = results.find((result) => result.error);

    if (errorResult?.error) {
        throw new Error(errorResult.error.message);
    }

    const todaySales = salesResult.data ?? [];
    const todayPayments = paymentsResult.data ?? [];
    const todayExpenses = expensesResult.data ?? [];
    const allSales = allSalesResult.data ?? [];
    const allPayments = allPaymentsResult.data ?? [];
    const stockMovements = stockResult.data ?? [];
    const saleItems = saleItemsResult.data ?? [];
    const recentSales = recentSalesResult.data ?? [];
    const variants = variantsResult.data ?? [];

    const totalSalesToday = todaySales.reduce(
        (total, sale) => total + Number(sale.total_amount ?? 0),
        0
    );

    const totalReceivedToday = todayPayments.reduce(
        (total, payment) => total + Number(payment.amount ?? 0),
        0
    );

    const totalExpensesToday = todayExpenses.reduce(
        (total, expense) => total + Number(expense.amount ?? 0),
        0
    );

    const totalSalesAllTime = allSales.reduce(
        (total, sale) => total + Number(sale.total_amount ?? 0),
        0
    );

    const totalPaymentsAllTime = allPayments.reduce(
        (total, payment) => total + Number(payment.amount ?? 0),
        0
    );

    const outstandingCredit = Math.max(
        0,
        totalSalesAllTime - totalPaymentsAllTime
    );

    const todaySaleIds = new Set(
        todaySales.map((sale) => sale.id)
    );

    const todaySaleItems = saleItems.filter(
        (item) => todaySaleIds.has(item.sale_id)
    );

    const costOfGoodsToday = todaySaleItems.reduce(
        (total, item) =>
            total +
            Number(item.quantity_cases ?? 0) *
            Number(item.cost_price_per_case ?? 0),
        0
    );

    // GST collected is not income, so profit uses the sales value without GST.
    const gstToday = todaySales.reduce(
        (total, sale) => total + Number(sale.gst_amount ?? 0),
        0
    );

    const grossProfitToday = totalSalesToday - gstToday - costOfGoodsToday;

    const estimatedNetProfitToday =
        grossProfitToday - totalExpensesToday;

    const stockByVariant: Record<string, number> = {};

    stockMovements.forEach((movement) => {
        stockByVariant[movement.product_variant_id] =
            (stockByVariant[movement.product_variant_id] ?? 0) +
            Number(movement.quantity_cases ?? 0);
    });

    const stockDetails = variants.map((variant) => ({
        variantId: variant.id,
        variantName: variant.variant_name,
        piecesPerCase: variant.pieces_per_case,
        product: variant.product,
        stockCases: stockByVariant[variant.id] ?? 0,
    }));

    const totalStockCases = stockDetails.reduce(
        (total, variant) => total + variant.stockCases,
        0
    );

    const lowStockItems = stockDetails.filter(
        (variant) => variant.stockCases <= 5
    );

    const pendingNotesResult = await supabase
        .from("notes")
        .select("id, title, reminder_at")
        .eq("is_completed", false)
        .order("reminder_at", { ascending: true, nullsFirst: false })
        .limit(5);

    if (pendingNotesResult.error) {
        throw new Error(pendingNotesResult.error.message);
    }

    return {
        today: {
            totalSales: totalSalesToday,
            totalReceived: totalReceivedToday,
            totalExpenses: totalExpensesToday,
            costOfGoods: costOfGoodsToday,
            grossProfit: grossProfitToday,
            estimatedNetProfit: estimatedNetProfitToday,
            salesCount: todaySales.length,
        },
        credit: {
            outstanding: outstandingCredit,
        },
        inventory: {
            totalStockCases,
            totalVariants: variants.length,
            lowStockCount: lowStockItems.length,
            lowStockItems,
            stockDetails,
        },
        recentSales,
        pendingNotes: pendingNotesResult.data ?? [],
    };
};
