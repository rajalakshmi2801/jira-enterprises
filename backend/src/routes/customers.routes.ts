import { Router } from "express";

import {
    authenticateUser,
    requireOwner
} from "../middleware/auth.middleware";

import {
    getCustomersController,
    getCustomerByIdController,
    createCustomerController,
    updateCustomerController,
    deactivateCustomerController,
    getCustomerCreditSummaryController
} from "../controllers/customers.controller";

const router = Router();

// All customer endpoints require authentication
router.use(authenticateUser);

/* =========================================
   CUSTOMER LIST & SEARCH
========================================= */

// Owner and viewer
router.get("/", getCustomersController);

/* =========================================
   CREATE CUSTOMER
========================================= */

// Owner only
router.post(
    "/",
    requireOwner,
    createCustomerController
);

/* =========================================
   CUSTOMER CREDIT SUMMARY
========================================= */

// Owner and viewer
router.get(
    "/:id/credit",
    getCustomerCreditSummaryController
);

/* =========================================
   UPDATE CUSTOMER
========================================= */

// Owner only
router.put(
    "/:id",
    requireOwner,
    updateCustomerController
);

/* =========================================
   DEACTIVATE CUSTOMER
========================================= */

// Owner only
router.patch(
    "/:id/deactivate",
    requireOwner,
    deactivateCustomerController
);

/* =========================================
   CUSTOMER DETAILS
========================================= */

// Owner and viewer
router.get(
    "/:id",
    getCustomerByIdController
);

export default router;