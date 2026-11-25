
import { Router } from "express";

import {
    getSettingsController,
    updateSettingsController
} from "../controllers/settings.controller";

import {
    authenticateUser,
    requireOwner
} from "../middleware/auth.middleware";

const router = Router();

// All authenticated users can view settings.
router.get(
    "/",
    authenticateUser,
    getSettingsController
);

// Only the owner can update settings.
router.patch(
    "/",
    authenticateUser,
    requireOwner,
    updateSettingsController
);

export default router;
