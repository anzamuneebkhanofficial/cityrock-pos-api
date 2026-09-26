import { Router } from "express";
import customerController from "../controllers/customerController.js";
import { authenticate } from "../middleware/auth.js";
import { requireTenant, requireStore } from "../middleware/tenantScope.js";
import { cacheEndpoint } from "../middleware/cacheMiddleware.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireStore);

router.get("/", cacheEndpoint("customers", 60 * 1000), customerController.list);
router.get("/:id", customerController.getCustomer);
router.post("/", customerController.create);
router.patch("/:id", customerController.update);
router.delete("/:id", customerController.deleteCustomer);

export default router;
