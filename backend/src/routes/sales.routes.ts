import { Router } from "express";

import {
    authenticateUser,
    requireOwner
} from "../middleware/auth.middleware";

import {
    createSaleController,
    getSalesHistoryController,
    getSaleByIdController,
    getCustomerSalesController,
    getCustomerOutstandingBalancesController,
    getCustomerOutstandingByIdController,
    collectSalePaymentController
} from "../controllers/sales.controller";

const router = Router();

/**
 * Every sales route requires an authenticated user.
 * GET routes are accessible by owner and viewer.
 */
router.use(authenticateUser);

/* =========================================
   SALES
========================================= */

// Create sale - owner only
router.post(
    "/",
    requireOwner,
    createSaleController
);

// View all sales
router.get(
    "/",
    getSalesHistoryController
);

// View single sale details
router.get(
    "/:id",
    getSaleByIdController
);

/* =========================================
   CUSTOMER SALES & CREDIT
========================================= */

// All customer outstanding balances
router.get(
    "/credit/outstanding",
    getCustomerOutstandingBalancesController
);

// Customer-specific outstanding balance
router.get(
    "/credit/outstanding/:customerId",
    getCustomerOutstandingByIdController
);

// Customer sales history
router.get(
    "/customer/:customerId",
    getCustomerSalesController
);

// Collect pending customer payment - owner only
router.post(
    "/credit/collect-payment",
    requireOwner,
    collectSalePaymentController
);

export default router;