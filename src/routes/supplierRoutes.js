import { Router } from "express";
import supplierController from "../controllers/supplierController.js";
import { authenticate } from "../middleware/auth.js";
import { requireTenant, requireStore } from "../middleware/tenantScope.js";
import { cacheEndpoint } from "../middleware/cacheMiddleware.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireStore);

router.get("/", cacheEndpoint("suppliers", 60 * 1000), supplierController.list);
router.get("/:id", supplierController.getSupplier);
router.post("/", supplierController.create);
router.patch("/:id", supplierController.update);
router.delete("/:id", supplierController.deleteSupplier);

export default router;
