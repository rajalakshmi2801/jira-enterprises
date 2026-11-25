import { Request, Response } from "express";
import { z } from "zod";

import {
    createSale,
    getSalesHistory,
    getSaleById,
    getCustomerSales,
    getCustomerOutstandingBalances,
    getCustomerOutstandingById,
    collectSalePayment
} from "../services/sales.service";

/* =========================================
   VALIDATION
========================================= */

const saleItemSchema = z.object({
    product_variant_id: z.string().uuid(),
    quantity_cases: z.number().int().positive(),
    selling_price_per_case: z.number().min(0)
});

const createSaleSchema = z.object({
    customer_id: z.string().uuid().nullable().optional(),
    sale_date: z.string().datetime({ offset: true }).optional(),
    discount_amount: z.number().min(0).optional(),
    notes: z.string().optional(),
    items: z.array(saleItemSchema).min(1),
    paid_amount: z.number().min(0),
    payment_method: z.enum(["cash", "upi"]).nullable().optional(),
    transaction_reference: z.string().max(150).optional()
});

const collectPaymentSchema = z.object({
    sale_id: z.string().uuid(),
    amount: z.number().positive(),
    payment_method: z.enum(["cash", "upi"]),
    payment_date: z.string().datetime({ offset: true }).optional(),
    transaction_reference: z.string().max(150).optional(),
    notes: z.string().optional()
});

/* =========================================
   CREATE SALE
========================================= */

export const createSaleController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = createSaleSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid sale data.",
                errors: validation.error.flatten()
            });
            return;
        }

        const sale = await createSale(validation.data);

        res.status(201).json({
            success: true,
            message: "Sale created successfully.",
            data: sale
        });
    } catch (error) {
        console.error("Create sale error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to create sale."
        });
    }
};

/* =========================================
   SALES HISTORY
========================================= */

export const getSalesHistoryController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const limit = Number(req.query.limit || 100);

        if (!Number.isInteger(limit) || limit <= 0 || limit > 500) {
            res.status(400).json({
                success: false,
                message: "Limit must be between 1 and 500."
            });
            return;
        }

        const sales = await getSalesHistory(limit);

        res.status(200).json({
            success: true,
            message: "Sales fetched successfully.",
            data: sales
        });
    } catch (error) {
        console.error("Get sales history error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch sales."
        });
    }
};

/* =========================================
   SALE DETAILS
========================================= */

export const getSaleByIdController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
const saleId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

        if (!saleId) {
            res.status(400).json({
                success: false,
                message: "Sale ID is required."
            });
            return;
        }

        const sale = await getSaleById(saleId);

        res.status(200).json({
            success: true,
            message: "Sale details fetched successfully.",
            data: sale
        });
    } catch (error) {
        console.error("Get sale details error:", error);

        res.status(404).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Sale not found."
        });
    }
};

/* =========================================
   CUSTOMER SALES
========================================= */

export const getCustomerSalesController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
const customerId = Array.isArray(req.params.customerId)
    ? req.params.customerId[0]
    : req.params.customerId;        
    const limit = Number(req.query.limit || 100);

        if (!customerId) {
            res.status(400).json({
                success: false,
                message: "Customer ID is required."
            });
            return;
        }

        if (!Number.isInteger(limit) || limit <= 0 || limit > 500) {
            res.status(400).json({
                success: false,
                message: "Limit must be between 1 and 500."
            });
            return;
        }

        const sales = await getCustomerSales(customerId, limit);

        res.status(200).json({
            success: true,
            message: "Customer sales fetched successfully.",
            data: sales
        });
    } catch (error) {
        console.error("Get customer sales error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customer sales."
        });
    }
};

/* =========================================
   ALL CUSTOMER OUTSTANDING BALANCES
========================================= */

export const getCustomerOutstandingBalancesController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const balances = await getCustomerOutstandingBalances();

        res.status(200).json({
            success: true,
            message: "Customer outstanding balances fetched successfully.",
            data: balances
        });
    } catch (error) {
        console.error("Get outstanding balances error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customer outstanding balances."
        });
    }
};

/* =========================================
   SINGLE CUSTOMER OUTSTANDING
========================================= */

export const getCustomerOutstandingByIdController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
const customerId = Array.isArray(req.params.customerId)
    ? req.params.customerId[0]
    : req.params.customerId;
        if (!customerId) {
            res.status(400).json({
                success: false,
                message: "Customer ID is required."
            });
            return;
        }

        const balance = await getCustomerOutstandingById(customerId);

        res.status(200).json({
            success: true,
            message: "Customer outstanding balance fetched successfully.",
            data: balance
        });
    } catch (error) {
        console.error("Get customer outstanding error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customer outstanding balance."
        });
    }
};


/* =========================================
   COLLECT CUSTOMER CREDIT PAYMENT
========================================= */

export const collectSalePaymentController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = collectPaymentSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid payment data.",
                errors: validation.error.flatten()
            });
            return;
        }

        const payment = await collectSalePayment(validation.data);

        res.status(201).json({
            success: true,
            message: "Payment collected successfully.",
            data: payment
        });
    } catch (error) {
        console.error("Collect sale payment error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to collect payment."
        });
    }
};