
import {
    Request,
    Response,
    NextFunction,
    ErrorRequestHandler,
    RequestHandler
} from "express";

// Handle unknown API endpoints
export const notFoundHandler: RequestHandler = (
    req: Request,
    res: Response
): void => {
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
};

// Handle unexpected application errors
export const errorHandler: ErrorRequestHandler = (
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction
): void => {

    console.error("Application error:", error);

    if (res.headersSent) {
        next(error);
        return;
    }

    res.status(500).json({
        success: false,
        message: "An unexpected server error occurred."
    });
};
