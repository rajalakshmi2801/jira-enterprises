
import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
    listUsers,
    createViewer,
    changeUserStatus,
    changeUserPin
} from "../controllers/users.controller";

import {
    authenticateUser,
    requireOwner
} from "../middleware/auth.middleware";

const router = Router();

const userManagementLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
});

router.use(authenticateUser);
router.use(requireOwner);

router.get("/", listUsers);

router.post("/", userManagementLimiter, createViewer);

router.patch(
    "/:id/status",
    userManagementLimiter,
    changeUserStatus
);

router.patch(
    "/:id/pin",
    userManagementLimiter,
    changeUserPin
);

export default router;
