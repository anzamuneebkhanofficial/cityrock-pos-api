import { Router } from "express";
import inventoryController from "../controllers/inventoryController.js";
import { authenticate } from "../middleware/auth.js";
import { requireTenant, requireStore } from "../middleware/tenantScope.js";
import { cacheEndpoint } from "../middleware/cacheMiddleware.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireStore);

router.get("/export", inventoryController.exportExcel);
router.get("/valuation", inventoryController.getValuation);
router.get("/low-stock", cacheEndpoint("inventory_low_stock", 60 * 1000), inventoryController.getLowStock);
router.get("/", cacheEndpoint("inventory", 60 * 1000), inventoryController.list);
router.post("/adjust", inventoryController.adjustStock);
router.patch("/:id/adjust", inventoryController.adjustStock);

export default router;
