
import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
    registerOwner,
    login,
    logout,
    getCurrentUser,
    getSetupStatus
} from "../controllers/auth.controller";

import {
    changePin,
    resetPinWithSecret
} from "../controllers/pin.controller";

import { authenticateUser } from "../middleware/auth.middleware";

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false
});

const setupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false
});

// Wrong current PIN / wrong secret attempts are limited; successes are not.
const pinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false
});

router.get("/setup-status", getSetupStatus);

router.post("/change-pin", authenticateUser, pinLimiter, changePin);

router.post("/reset-pin", pinLimiter, resetPinWithSecret);

router.post("/setup-owner", setupLimiter, registerOwner);

router.post("/login", loginLimiter, login);

router.get("/me", authenticateUser, getCurrentUser);

router.post("/logout", authenticateUser, logout);

export default router;
