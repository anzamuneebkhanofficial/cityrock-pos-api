import { Router } from "express";
import tenantController from "../controllers/tenantController.js";
import { authenticate } from "../middleware/auth.js";
import { requireTenant } from "../middleware/tenantScope.js";
import { uploadFile } from "../middleware/upload.js";
import { cacheEndpoint } from "../middleware/cacheMiddleware.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// Stores
router.get("/stores", cacheEndpoint("stores", 60 * 1000), tenantController.getStores);
router.post("/stores", tenantController.createStore);
router.patch("/stores/:id", tenantController.updateStore);
router.delete("/stores/:id", tenantController.deleteStore);

// Subscription & Billing
router.get("/subscription", cacheEndpoint("subscription", 60 * 1000), tenantController.getSubscription);
router.post("/payments/upload-proof", uploadFile("proof", "cityrock/payments"), tenantController.uploadProofScreenshot);
router.post("/payments/proof", uploadFile("proof", "cityrock/payments"), tenantController.submitPaymentProof);
router.post("/payment-proof", uploadFile("proof", "cityrock/payments"), tenantController.submitPaymentProof);
router.get("/payment-accounts", cacheEndpoint("payment_accounts", 60 * 1000), tenantController.getPaymentAccounts);
router.get("/plans", cacheEndpoint("plans", 60 * 1000), tenantController.getPlans);

// Staff
router.get("/staff", cacheEndpoint("staff", 60 * 1000), tenantController.getStaff);
router.get("/staff/:id", tenantController.getStaffDetails);
router.post("/staff", tenantController.inviteStaff);
router.patch("/staff/:id", tenantController.updateStaff);
router.patch("/staff/:id/deactivate", tenantController.deactivateStaff);
router.delete("/staff/:id", tenantController.deleteStaff);


// Tickets / Complaints
router.get("/tickets", cacheEndpoint("tickets", 60 * 1000), tenantController.listTickets);
router.post("/tickets", tenantController.createTicket);
router.post("/tickets/:id/reply", tenantController.replyToTicket);

export default router;
