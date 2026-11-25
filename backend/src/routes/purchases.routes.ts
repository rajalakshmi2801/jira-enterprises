
import { Router } from "express";

import {
    addPurchase,
    listPurchases,
    purchaseDetails
} from "../controllers/purchases.controller";

import {
    authenticateUser,
    requireOwner
} from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateUser);

// View purchase history
router.get("/", listPurchases);

// View individual purchase
router.get("/:id", purchaseDetails);

// Create purchase - owner only
router.post("/", requireOwner, addPurchase);

export default router;
