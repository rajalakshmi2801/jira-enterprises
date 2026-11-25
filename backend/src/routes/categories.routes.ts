
import { Router } from "express";

import {
    listCategories,
    addCategory,
    editCategory,
    changeCategoryStatus
} from "../controllers/categories.controller";

import {
    authenticateUser,
    requireOwner
} from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticateUser, listCategories);

router.post(
    "/",
    authenticateUser,
    requireOwner,
    addCategory
);

router.put(
    "/:id",
    authenticateUser,
    requireOwner,
    editCategory
);

router.patch(
    "/:id/status",
    authenticateUser,
    requireOwner,
    changeCategoryStatus
);

export default router;
