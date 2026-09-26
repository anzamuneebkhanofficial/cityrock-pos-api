import { Router } from "express";
import reportController from "../controllers/reportController.js";
import { authenticate } from "../middleware/auth.js";
import { requireTenant, requireStore } from "../middleware/tenantScope.js";
import { cacheEndpoint } from "../middleware/cacheMiddleware.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireStore);

router.get("/export/sales-summary", reportController.exportSalesSummaryExcel);
router.get("/export", reportController.exportSalesSummaryExcel);
router.get("/sales-summary", cacheEndpoint("reports", 60 * 1000), reportController.getSalesSummary);
router.get("/top-products", cacheEndpoint("reports_top", 60 * 1000), reportController.getTopProducts);
router.get("/cashier-performance", cacheEndpoint("reports_cashier", 60 * 1000), reportController.getCashierPerformance);
router.get("/category-share", cacheEndpoint("reports_cat", 60 * 1000), reportController.getCategoryShare);
router.get("/inventory-levels", cacheEndpoint("reports_inv", 60 * 1000), reportController.getInventoryLevels);
router.get("/stores-comparison", cacheEndpoint("reports_store", 60 * 1000), reportController.getStoresComparison);
router.get("/top-customers", cacheEndpoint("reports_cust", 60 * 1000), reportController.getTopCustomers);
router.get("/sales-by-hour", cacheEndpoint("reports_hourly", 60 * 1000), reportController.getSalesByHour);

export default router;
