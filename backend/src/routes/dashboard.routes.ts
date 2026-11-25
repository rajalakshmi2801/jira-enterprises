
import { Router } from "express";
import { getDashboardController } from "../controllers/dashboard.controller";
import { authenticateUser } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateUser);

router.get("/", getDashboardController);

export default router;
