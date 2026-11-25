
import { Router } from "express";

import {
    listCategories,
    addCategory,
    listProducts,
    addProduct,
    listVariants,
    addProductVariant
} from "../controllers/products.controller";

import {
    addProductWithVariants,
    editProduct,
    editProductVariant
} from "../controllers/products-manage.controller";

import {
    authenticateUser,
    requireOwner
} from "../middleware/auth.middleware";

const router = Router();

// All authenticated users can view products.
router.use(authenticateUser);

router.get("/categories", listCategories);
router.get("/", listProducts);
router.get("/:productId/variants", listVariants);

// Only owner can modify business data.
router.post("/categories", requireOwner, addCategory);
router.post("/", requireOwner, addProduct);
router.post("/variants", requireOwner, addProductVariant);
router.post("/with-variants", requireOwner, addProductWithVariants);
router.put("/variants/:variantId", requireOwner, editProductVariant);
router.put("/:productId", requireOwner, editProduct);

export default router;
