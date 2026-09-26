import { Router } from "express";
import purchaseOrderController from "../controllers/purchaseOrderController.js";
import { authenticate } from "../middleware/auth.js";
import { requireTenant, requireStore } from "../middleware/tenantScope.js";
import { cacheEndpoint } from "../middleware/cacheMiddleware.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireStore);

router.get("/", cacheEndpoint("purchase_orders", 60 * 1000), purchaseOrderController.list);
router.post("/", purchaseOrderController.create);
router.patch("/:id/receive", purchaseOrderController.receive);

export default router;
