import { Router } from "express";
import authController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { uploadFile } from "../middleware/upload.js";

const router = Router();

router.post("/signup", authLimiter, authController.signup);
router.post("/login", authLimiter, authController.login);
router.post("/verify-email", authLimiter, authController.verifyEmail);
router.post("/resend-otp", authLimiter, authController.resendOtp);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);

// Profile, Avatar & Credentials management
router.post("/avatar", authenticate, uploadFile("avatar", "cityrock/avatars"), authController.uploadAvatar);
router.delete("/avatar", authenticate, authController.removeAvatar);
router.put("/profile", authenticate, authController.updateProfile);
router.put("/change-password", authenticate, authController.changePassword);

export default router;
