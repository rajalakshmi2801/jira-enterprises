
import { Router } from "express";

import {
    listInventory,
    createStockMovement,
    listStockMovements
} from "../controllers/inventory.controller";

import {
    authenticateUser,
    requireOwner
} from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateUser);

router.get("/", listInventory);

router.get("/movements", listStockMovements);

router.post(
    "/movements",
    requireOwner,
    createStockMovement
);

export default router;
