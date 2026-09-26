import { Router } from "express";
import adminController from "../controllers/adminController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";
import { uploadFile } from "../middleware/upload.js";
import { cacheEndpoint } from "../middleware/cacheMiddleware.js";

const router = Router();

// Publicly readable platform branding for all users & guest views (used by Sidebar, Login, Customer Portals)
router.get("/platform-settings", cacheEndpoint("platform_settings", 60 * 1000), adminController.getPlatformSettings);

// Guard admin routes with authentication
router.use(authenticate);

// Require platform role for administrative operations
router.use(authorize("platform"));

// Stats & Tenants
router.get("/stats", cacheEndpoint("admin_stats", 60 * 1000), adminController.getStats);
router.get("/tenants", cacheEndpoint("tenants", 60 * 1000), adminController.listTenants);
router.get("/tenants/:id", adminController.getTenant);
router.put("/tenants/:id", adminController.updateTenant);
router.patch("/tenants/:id/status", adminController.updateTenantStatus);
router.delete("/tenants/:id", adminController.deleteTenant);

// Payments & Accounts
router.get("/payments/pending", cacheEndpoint("payments", 60 * 1000), adminController.getPendingPayments);
router.patch("/payments/:id/review", adminController.reviewPaymentRequest);
router.get("/payment-accounts", cacheEndpoint("payment_accounts", 60 * 1000), adminController.getPaymentAccounts);
router.post("/payment-accounts", adminController.createPaymentAccount);
router.patch("/payment-accounts/:id", adminController.updatePaymentAccount);

// Support Tickets
router.get("/tickets", cacheEndpoint("tickets", 60 * 1000), adminController.listTickets);
router.patch("/tickets/:id/assign", adminController.assignTicket);
router.post("/tickets/:id/reply", adminController.replyToTicket);
router.patch("/tickets/:id/status", adminController.updateTicketStatus);

// Plans
router.get("/plans", cacheEndpoint("plans", 60 * 1000), adminController.listPlans);
router.post("/plans", adminController.createPlan);
router.patch("/plans/:id", adminController.updatePlan);
router.delete("/plans/:id", adminController.deletePlan);

// Staff Team Management
router.get("/staff", adminController.listStaff);
router.post("/staff", adminController.createStaff);
router.post("/staff/:id/resend-invite", adminController.resendStaffInvite);
router.delete("/staff/:id", adminController.deleteStaff);

// Platform Branding Settings
router.put("/platform-settings", adminController.updatePlatformSettings);
router.post("/platform-logo", uploadFile("logo", "platform_branding"), adminController.uploadPlatformLogo);
router.delete("/platform-logo", adminController.removePlatformLogo);

export default router;
