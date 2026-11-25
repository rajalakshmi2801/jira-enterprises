
/// <reference path="./types/express.d.ts" />
import "dotenv/config";

import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { supabase } from "./config/supabase";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import productsRoutes from "./routes/products.routes";
import salesRoutes from "./routes/sales.routes";
import customersRoutes from "./routes/customers.routes";
import businessExpensesRoutes from "./routes/business-expenses.routes";
import notesRoutes from "./routes/notes.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import reportsRoutes from "./routes/reports.routes";
import categoriesRoutes from "./routes/categories.routes";
import settingsRoutes from "./routes/settings.routes";
import purchasesRoutes from "./routes/purchases.routes";
import inventoryRoutes from "./routes/inventory.routes";
import {
    notFoundHandler,
    errorHandler
} from "./middleware/error.middleware";

const app = express();

const PORT = Number(process.env.PORT) || 5000;

// Behind Vercel's proxy: needed for correct client IPs (rate limiting)
// and secure cookies.
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());

app.use(
    cors({
        origin: (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
            .split(",")
            .map((origin) => origin.trim()),
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Setup-Secret"
        ],
        credentials: true
    })
);

// Request parsing middleware
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Health check API
app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "JIRA ENTERPRISES Backend is running successfully!",
        status: "UP",
        timestamp: new Date().toISOString()
    });
});

// Supabase connection check API
app.get("/api/health/supabase", async (req: Request, res: Response) => {
    try {
        const { error } = await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            message: "Supabase client initialized successfully!",
            status: "CONNECTED"
        });

    } catch (error) {
        console.error("Supabase connection error:", error);

        res.status(500).json({
            success: false,
            message: "Supabase connection check failed",
            status: "ERROR"
        });
    }
});

// Authentication APIs
app.use("/api/auth", authRoutes);

app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/business-expenses", businessExpensesRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/purchases", purchasesRoutes);

// Handle invalid API routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

// Start server (Vercel runs the exported app as a serverless function,
// so it must not call listen there).
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log("------------------------------------");
        console.log("JIRA ENTERPRISES BACKEND STARTED");
        console.log(`Server running on: http://localhost:${PORT}`);
        console.log(`Health API: http://localhost:${PORT}/api/health`);
        console.log(`Auth API: http://localhost:${PORT}/api/auth`);
        console.log("------------------------------------");
    });
}

export default app;
