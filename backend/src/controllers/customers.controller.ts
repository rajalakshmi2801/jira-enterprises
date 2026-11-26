import { Request, Response } from "express";
import { z } from "zod";

import {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deactivateCustomer,
    getCustomerCreditSummary
} from "../services/customers.service";

/* =========================================
   VALIDATION
========================================= */

const gstSchema = z
    .string()
    .trim()
    .toUpperCase()
    .regex(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
        "Enter a valid 15-character GSTIN."
    );

const createCustomerSchema = z.object({
    customer_name: z.string().trim().min(1).max(150),
    shop_name: z.string().trim().max(150).optional(),
    mobile: z.string().trim().max(20).optional(),
    address: z.string().trim().max(500).optional(),
    gst_number: gstSchema.optional(),
    notes: z.string().trim().optional()
});

const updateCustomerSchema = z.object({
    customer_name: z.string().trim().min(1).max(150).optional(),
    shop_name: z.string().trim().max(150).nullable().optional(),
    mobile: z.string().trim().max(20).nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    gst_number: gstSchema.nullable().optional(),
    notes: z.string().trim().nullable().optional()
});

/* =========================================
   GET CUSTOMERS / SEARCH
========================================= */

export const getCustomersController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const search = typeof req.query.search === "string"
            ? req.query.search
            : undefined;

        const customers = await getCustomers(search);

        res.status(200).json({
            success: true,
            message: "Customers fetched successfully.",
            data: customers
        });
    } catch (error) {
        console.error("Get customers error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customers."
        });
    }
};

/* =========================================
   GET CUSTOMER BY ID
========================================= */

export const getCustomerByIdController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const customerId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const customer = await getCustomerById(customerId);

        res.status(200).json({
            success: true,
            message: "Customer fetched successfully.",
            data: customer
        });
    } catch (error) {
        console.error("Get customer details error:", error);

        res.status(404).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Customer not found."
        });
    }
};

/* =========================================
   CREATE CUSTOMER
========================================= */

export const createCustomerController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = createCustomerSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid customer data.",
                errors: validation.error.flatten()
            });
            return;
        }

        const customer = await createCustomer(validation.data);

        res.status(201).json({
            success: true,
            message: "Customer created successfully.",
            data: customer
        });
    } catch (error) {
        console.error("Create customer error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to create customer."
        });
    }
};

/* =========================================
   UPDATE CUSTOMER
========================================= */

export const updateCustomerController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validation = updateCustomerSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid customer update data.",
                errors: validation.error.flatten()
            });
            return;
        }

        if (Object.keys(validation.data).length === 0) {
            res.status(400).json({
                success: false,
                message: "At least one field is required to update."
            });
            return;
        }

        const customerId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const customer = await updateCustomer(
            customerId,
            validation.data
        );

        res.status(200).json({
            success: true,
            message: "Customer updated successfully.",
            data: customer
        });
    } catch (error) {
        console.error("Update customer error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to update customer."
        });
    }
};

/* =========================================
   DEACTIVATE CUSTOMER
========================================= */

export const deactivateCustomerController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const customerId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const customer = await deactivateCustomer(customerId);

        res.status(200).json({
            success: true,
            message: "Customer deactivated successfully.",
            data: customer
        });
    } catch (error) {
        console.error("Deactivate customer error:", error);

        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to deactivate customer."
        });
    }
};

/* =========================================
   CUSTOMER CREDIT SUMMARY
========================================= */

export const getCustomerCreditSummaryController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const customerId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const summary = await getCustomerCreditSummary(customerId);

        res.status(200).json({
            success: true,
            message: "Customer credit summary fetched successfully.",
            data: summary
        });
    } catch (error) {
        console.error("Customer credit summary error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customer credit summary."
        });
    }
};