import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Tenant from "../models/Tenant.js";
import Store from "../models/Store.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import Otp from "../models/Otp.js";
import Product from "../models/Product.js";
import InventoryItem from "../models/InventoryItem.js";
import PlatformSetting from "../models/PlatformSetting.js";

// Helper to parse dynamic trial duration from ENV (e.g. "14d", "1m", "20m")
const parseTrialDuration = (durationStr) => {
  if (!durationStr) return 14 * 24 * 60 * 60 * 1000; // default 14 days
  const match = durationStr.toLowerCase().trim().match(/^(\d+)([a-z]+)$/);
  if (!match) return 14 * 24 * 60 * 60 * 1000;
  
  const val = parseInt(match[1]);
  const unit = match[2];
  
  if (["d", "day", "days"].includes(unit)) return val * 24 * 60 * 60 * 1000;
  if (["m", "month", "months"].includes(unit)) return val * 30 * 24 * 60 * 60 * 1000;
  if (["min", "mins", "minute", "minutes"].includes(unit)) return val * 60 * 1000;
  if (["s", "sec", "secs", "second", "seconds"].includes(unit)) return val * 1000;
  if (["h", "hr", "hrs", "hour", "hours"].includes(unit)) return val * 60 * 60 * 1000;
  if (["w", "wk", "week", "weeks"].includes(unit)) return val * 7 * 24 * 60 * 60 * 1000;
  
  return 14 * 24 * 60 * 60 * 1000;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET environment variable must be set in production");
    }
    return "cityrock_pos_super_secret_jwt_key_2026_secure";
  }
  return secret;
};

const generateToken = (userId, role, tenantId = null) => {
  return jwt.sign(
    { userId, role, tenantId },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// Removed fake starter catalog mapping to ensure pure database-driven data.
export const signup = async ({
  businessName,
  ownerName,
  ownerEmail,
  ownerPhone,
  city,
  password,
  storeType = "general_retail",
}) => {
  if (!businessName || !ownerName || !ownerEmail || !password) {
    const error = new Error("All required fields must be provided");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({ email: ownerEmail.toLowerCase().trim() });
  if (existingUser) {
    const error = new Error("An account with this email already exists");
    error.statusCode = 409;
    throw error;
  }

  // 1. Calculate dynamic free trial end date based on environment variable
  const trialDurationMs = parseTrialDuration(process.env.TRIAL_DURATION);
  const trialEndsAt = new Date(Date.now() + trialDurationMs);

  // 2. Create Tenant with SaaS-standard "trial" status
  const tenant = await Tenant.create({
    businessName,
    ownerName,
    ownerPhone: ownerPhone || "",
    ownerEmail: ownerEmail.toLowerCase().trim(),
    city: city || "Lahore",
    country: "Pakistan",
    status: "trial",
    trialEndsAt,
  });

  // 3. Create Main Branch for Tenant
  const store = await Store.create({
    tenantId: tenant._id,
    name: `${businessName} - Main Branch`,
    storeType: storeType || "general_retail",
    city: city || "Lahore",
    storeCode: "MAIN01",
    isMainStore: true,
  });

  // 4. Create Owner User
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    tenantId: tenant._id,
    storeId: store._id,
    name: ownerName,
    email: ownerEmail.toLowerCase().trim(),
    passwordHash,
    role: "owner",
    isActive: true,
    isEmailVerified: true,
  });

  // 5. Ensure resilient Subscription with 14-day trial period
  let starterPlan = await Plan.findOne({ isActive: true }).sort({ sortOrder: 1 });
  if (!starterPlan) {
    const error = new Error("Registration is currently disabled because no subscription plans have been configured by the platform administrator.");
    error.statusCode = 400;
    throw error;
  }

  await Subscription.create({
    tenantId: tenant._id,
    planId: starterPlan._id,
    status: "trial",
    billingCycle: "monthly",
    currentPeriodStart: new Date(),
    currentPeriodEnd: trialEndsAt,
    autoRenew: false,
  });

  // Intentionally omitting any fake/mock starter data. New businesses start completely fresh.

  const token = generateToken(user._id.toString(), user.role, tenant._id.toString());

  return {
    token,
    user: {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: tenant._id.toString(),
      storeId: store._id.toString(),
    },
    tenant: {
      id: tenant._id.toString(),
      _id: tenant._id.toString(),
      businessName: tenant.businessName,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      city: tenant.city,
    },
    store: {
      id: store._id.toString(),
      _id: store._id.toString(),
      name: store.name,
      storeCode: store.storeCode,
      storeType: store.storeType,
      isMainStore: store.isMainStore,
    },
  };
};

export const verifyEmail = async ({ email, otp }) => {
  const normalizedEmail = (email || "").toLowerCase().trim();
  const normalizedOtp = (otp || "").trim();

  const record = await Otp.findOne({
    email: normalizedEmail,
    otp: normalizedOtp,
    type: "email_verification",
    expiresAt: { $gt: new Date() },
  });

  const isTestOtpAllowed =
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_DEV_TEST_OTP === "true" &&
    normalizedOtp === "123456";

  if (!record && !isTestOtpAllowed) {
    const error = new Error("Invalid or expired verification code");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    { isEmailVerified: true },
    { new: true }
  );

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (record) {
    await Otp.deleteOne({ _id: record._id });
  }

  const token = generateToken(user._id.toString(), user.role, user.tenantId?.toString());
  return { token, user: user.toSafeObject() };
};

export const resendOtp = async (email) => {
  const normalizedEmail = (email || "").toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const error = new Error("No account found with this email");
    error.statusCode = 404;
    throw error;
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Invalidate any existing verification OTPs for this email
  await Otp.deleteMany({ email: normalizedEmail, type: "email_verification" });

  await Otp.create({
    email: normalizedEmail,
    otp: code,
    type: "email_verification",
    expiresAt,
  });

  if (process.env.NODE_ENV === "development") {
    console.log(`[Dev Auth] Verification OTP for ${normalizedEmail}: ${code}`);
  }

  // Never return the OTP code in the API response
  return { message: "A 6-digit verification code has been dispatched to your email address." };
};

export const forgotPassword = async (email) => {
  const normalizedEmail = (email || "").toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return { message: "If this email is registered, a password reset link has been dispatched." };
  }

  const rawResetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawResetToken).digest("hex");

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity
  await user.save();

  if (process.env.NODE_ENV === "development") {
    console.log(`[Dev Auth] Password reset link token for ${normalizedEmail}: ${rawResetToken}`);
  }

  // Never return reset token in response payload
  return { message: "If this email is registered, a password reset link has been dispatched." };
};

export const resetPassword = async ({ token, newPassword }) => {
  if (!token || !newPassword) {
    const error = new Error("Reset token and new password are required");
    error.statusCode = 400;
    throw error;
  }

  const hashedToken = crypto.createHash("sha256").update(token.trim()).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    const error = new Error("Password reset token is invalid or has expired");
    error.statusCode = 400;
    throw error;
  }

  user.passwordHash = await User.hashPassword(newPassword);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  return { message: "Password has been successfully reset. You may now sign in with your new credentials." };
};

export const login = async (email, password) => {
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  // --- Dynamic ENV-Based Super Admin Authentication ---
  const envAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  const envAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (envAdminEmail && envAdminPassword && email.toLowerCase().trim() === envAdminEmail && password === envAdminPassword) {
    // Exact match for the environment variables!
    // We upsert the user into the DB right now so that they get a valid MongoDB _id for relationships.
    let superAdminUser = await User.findOne({ email: envAdminEmail });
    if (!superAdminUser) {
      const hash = await User.hashPassword(envAdminPassword);
      superAdminUser = await User.create({
        name: "Platform Super Admin",
        email: envAdminEmail,
        passwordHash: hash,
        role: "super_admin",
        isActive: true,
        isEmailVerified: true,
      });
    } else if (superAdminUser.role !== "super_admin") {
      superAdminUser.role = "super_admin";
      await superAdminUser.save();
    }
    
    superAdminUser.lastLoginAt = new Date();
    await superAdminUser.save();

    const token = generateToken(superAdminUser._id.toString(), superAdminUser.role, null);
    
    return {
      token,
      user: {
        id: superAdminUser._id.toString(),
        _id: superAdminUser._id.toString(),
        name: superAdminUser.name,
        email: superAdminUser.email,
        role: superAdminUser.role,
        tenantId: null,
        storeId: null,
        avatarUrl: superAdminUser.avatarUrl,
      },
      tenant: null,
      store: null,
      subscription: null,
    };
  }
  // ---------------------------------------------------

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("Your account has been deactivated. Please contact support.");
    error.statusCode = 403;
    throw error;
  }

  // Update last login timestamp asynchronously
  user.lastLoginAt = new Date();
  await user.save();

  // Populate tenant and store context if present
  let tenant = null;
  let activeStore = null;
  let subscription = null;

  if (user.tenantId) {
    tenant = await Tenant.findById(user.tenantId).lean();
    activeStore = user.storeId
      ? await Store.findById(user.storeId).lean()
      : await Store.findOne({ tenantId: user.tenantId, isMainStore: true }).lean();
    subscription = await Subscription.findOne({ tenantId: user.tenantId }).populate("planId").lean();
  }

  const token = generateToken(user._id.toString(), user.role, user.tenantId?.toString());

  return {
    token,
    user: {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      storeId: user.storeId ? user.storeId.toString() : (activeStore?._id ? activeStore._id.toString() : null),
      avatarUrl: user.avatarUrl,
    },
    tenant: tenant
      ? {
          id: tenant._id,
          businessName: tenant.businessName,
          status: tenant.status,
          city: tenant.city,
        }
      : null,
    store: activeStore
      ? {
          id: activeStore._id,
          name: activeStore.name,
          storeCode: activeStore.storeCode,
          isMainStore: activeStore.isMainStore,
        }
      : null,
    subscription: subscription
      ? {
          status: subscription.status,
          planName: subscription.planId?.name,
          currentPeriodEnd: subscription.currentPeriodEnd,
        }
      : null,
  };
};

export const getMe = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  let tenant = null;
  let store = null;

  if (user.tenantId) {
    tenant = await Tenant.findById(user.tenantId).lean();
  }
  if (user.storeId) {
    store = await Store.findById(user.storeId).lean();
  }

  const safeUser = { ...user };
  delete safeUser.passwordHash;
  delete safeUser.passwordResetToken;
  delete safeUser.passwordResetExpires;

  return {
    ...safeUser,
    tenant,
    store,
  };
};

export const updateAvatar = async (userId, avatarUrl, role) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { avatarUrl },
    { new: true }
  ).lean();

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // If super admin / platform admin, also update PlatformSetting
  if (role === "super_admin" || role === "platform_admin") {
    await PlatformSetting.findOneAndUpdate(
      {},
      { superAdminAvatarUrl: avatarUrl },
      { upsert: true }
    );
  }

  const safeUser = { ...user };
  delete safeUser.passwordHash;
  return safeUser;
};

export const updateProfile = async (userId, { name, email, phone, cnic }, role) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (name) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (cnic !== undefined) user.cnic = cnic.trim();

  // If not super admin, allow updating email if changed
  if (role !== "super_admin" && email && email.toLowerCase().trim() !== user.email) {
    const emailNormalized = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailNormalized, _id: { $ne: userId } });
    if (existing) {
      const error = new Error("This email is already in use by another account");
      error.statusCode = 409;
      throw error;
    }
    user.email = emailNormalized;
  }

  await user.save();

  // If user is super_admin, also update PlatformSetting display name
  if (role === "super_admin" || role === "platform_admin") {
    await PlatformSetting.findOneAndUpdate(
      {},
      { superAdminDisplayName: user.name },
      { upsert: true }
    );
  }

  // If tenant owner, sync owner info in Tenant model
  if (user.role === "owner" && user.tenantId) {
    await Tenant.findByIdAndUpdate(user.tenantId, {
      ownerName: user.name,
      ...(user.phone && { ownerPhone: user.phone }),
      ...(user.email && { ownerEmail: user.email }),
      ...(user.cnic && { cnic: user.cnic }),
    });
  }

  const safeUser = user.toSafeObject ? user.toSafeObject() : user.toObject();
  delete safeUser.passwordHash;
  return safeUser;
};

export const changePassword = async (userId, currentPassword, newPassword, role) => {
  if (role === "super_admin") {
    const error = new Error("Super Admin password is managed securely via the server environment file.");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  return true;
};

export default {
  signup,
  verifyEmail,
  resendOtp,
  forgotPassword,
  resetPassword,
  login,
  getMe,
  updateAvatar,
  updateProfile,
  changePassword,
};
