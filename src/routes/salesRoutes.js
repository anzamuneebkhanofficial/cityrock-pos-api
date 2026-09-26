import { Router } from "express";
import salesController from "../controllers/salesController.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import { requireTenant, requireStore } from "../middleware/tenantScope.js";
import { checkSubscriptionStatus } from "../middleware/subscriptionCheck.js";
import { cacheEndpoint } from "../middleware/cacheMiddleware.js";

const router = Router();

// All sales operations require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);
router.use(requireStore);

// Direct printable receipt & invoice endpoints
router.get("/:id/invoice/pdf", salesController.getInvoicePDF);
router.get("/:id/invoice", salesController.getInvoicePDF);
router.get("/:id/receipt", salesController.getReceipt);

// Checkout requires active subscription check
router.post("/", checkSubscriptionStatus, salesController.create);
router.get("/export", salesController.exportExcel);
router.get("/", cacheEndpoint("sales", 60 * 1000), salesController.list);
router.get("/:id", salesController.getSale);
router.post("/:id/return", salesController.returnSale);

export default router;
