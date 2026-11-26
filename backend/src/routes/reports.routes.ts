
import { Router } from "express";
import {
    getSalesReportController,
    getPurchaseReportController,
    getExpenseReportController,
    getProfitReportController,
    getReportsOverviewController,
} from "../controllers/reports.controller";
import { getDailySalesController } from "../controllers/daily-sales.controller";
import { authenticateUser } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateUser);

router.get("/overview", getReportsOverviewController);
router.get("/daily-sales", getDailySalesController);
router.get("/sales", getSalesReportController);
router.get("/purchases", getPurchaseReportController);
router.get("/expenses", getExpenseReportController);
router.get("/profit", getProfitReportController);

export default router;
