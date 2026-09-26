import Tenant from "../models/Tenant.js";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import Payment from "../models/Payment.js";
import PaymentAccount from "../models/PaymentAccount.js";
import SupportTicket from "../models/SupportTicket.js";
import Plan from "../models/Plan.js";
import PlatformSetting from "../models/PlatformSetting.js";
import Store from "../models/Store.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Customer from "../models/Customer.js";
import InventoryItem from "../models/InventoryItem.js";
import Supplier from "../models/Supplier.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { cacheService } from "../config/cache.js";

export const getStats = async () => {
  const [
    totalTenants,
    activeSubscriptions,
    trialSubscriptions,
    graceSubscriptions,
    suspendedSubscriptions,
    pendingPayments,
    openTickets,
  ] = await Promise.all([
    Tenant.countDocuments({ isDeleted: false }),
    Subscription.countDocuments({ status: "active" }),
    Subscription.countDocuments({ status: "trial" }),
    Subscription.countDocuments({ status: "grace_period" }),
    Subscription.countDocuments({ status: "suspended" }),
    Payment.countDocuments({ status: "pending_review" }),
    SupportTicket.countDocuments({ status: { $in: ["open", "in_progress"] } }),
  ]);

  return {
    totalTenants,
    activeTenants: activeSubscriptions,
    activeSubscriptions,
    trialTenants: trialSubscriptions,
    onFreeTrial: trialSubscriptions,
    graceTenants: graceSubscriptions,
    gracePeriod: graceSubscriptions,
    suspendedTenants: suspendedSubscriptions,
    suspended: suspendedSubscriptions,
    pendingPayments,
    openTickets,
  };
};

export const listTenants = async ({ search = "", status = "all", page = 1, limit = 9 }) => {
  const skip = (page - 1) * limit;
  const query = { isDeleted: false };

  if (status && status !== "all") {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { businessName: { $regex: search, $options: "i" } },
      { ownerName: { $regex: search, $options: "i" } },
      { ownerEmail: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
    ];
  }

  const [tenants, total] = await Promise.all([
    Tenant.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Tenant.countDocuments(query),
  ]);

  return { tenants, total, page, limit };
};

export const getTenant = async (id) => {
  const tenant = await Tenant.findById(id).lean();
  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }

  const [
    owner,
    subscription,
    stores,
    staff,
    productCount,
    salesStats,
    recentSales,
    payments,
    tickets,
  ] = await Promise.all([
    User.findOne({ tenantId: tenant._id, role: "owner" }).select("-passwordHash").lean(),
    Subscription.findOne({ tenantId: tenant._id }).populate("planId").lean(),
    Store.find({ tenantId: tenant._id }).sort({ isMainStore: -1, createdAt: 1 }).lean(),
    User.find({ tenantId: tenant._id }).select("-passwordHash").sort({ createdAt: 1 }).lean(),
    Product.countDocuments({ tenantId: tenant._id }),
    Sale.aggregate([
      { $match: { tenantId: tenant._id, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]),
    Sale.find({ tenantId: tenant._id }).sort({ createdAt: -1 }).limit(10).lean(),
    Payment.find({ tenantId: tenant._id }).populate("planId", "name code price").sort({ createdAt: -1 }).limit(15).lean(),
    SupportTicket.find({ tenantId: tenant._id }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const stats = {
    totalStores: stores.length,
    totalStaff: staff.length,
    totalProducts: productCount,
    totalOrders: salesStats[0]?.totalSales || 0,
    totalRevenue: salesStats[0]?.totalRevenue || 0,
  };

  return {
    ...tenant,
    owner: owner || {
      name: tenant.ownerName,
      email: tenant.ownerEmail,
      phone: tenant.ownerPhone,
      role: "owner",
      isActive: true,
      isEmailVerified: true,
    },
    subscription,
    stores,
    staff,
    stats,
    recentSales,
    payments,
    tickets,
  };
};

export const updateTenant = async (id, data) => {
  const {
    businessName,
    ownerName,
    ownerEmail,
    ownerPhone,
    city,
    country,
    address,
    cnic,
    status,
    trialEndsAt,
    timezone,
  } = data;

  const updateFields = {};
  if (businessName) updateFields.businessName = businessName.trim();
  if (ownerName) updateFields.ownerName = ownerName.trim();
  if (ownerEmail) updateFields.ownerEmail = ownerEmail.toLowerCase().trim();
  if (ownerPhone !== undefined) updateFields.ownerPhone = ownerPhone.trim();
  if (city) updateFields.city = city.trim();
  if (country) updateFields.country = country.trim();
  if (address !== undefined) updateFields.address = address.trim();
  if (cnic !== undefined) updateFields.cnic = cnic.trim();
  if (status) updateFields.status = status;
  if (trialEndsAt) updateFields.trialEndsAt = new Date(trialEndsAt);
  if (timezone) updateFields.timezone = timezone;

  const tenant = await Tenant.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true }
  ).lean();

  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }

  // Sync owner user record if relevant fields changed
  if (ownerName || ownerEmail || ownerPhone || cnic) {
    const userUpdate = {};
    if (ownerName) userUpdate.name = ownerName.trim();
    if (ownerEmail) userUpdate.email = ownerEmail.toLowerCase().trim();
    if (ownerPhone !== undefined) userUpdate.phone = ownerPhone.trim();
    if (cnic !== undefined) userUpdate.cnic = cnic.trim();

    await User.findOneAndUpdate(
      { tenantId: id, role: "owner" },
      { $set: userUpdate }
    );
  }

  // If status was changed, sync subscription
  if (status) {
    await Subscription.findOneAndUpdate(
      { tenantId: id },
      { status: status === "active" ? "active" : status }
    );
  }

  cacheService.invalidate(["tenants", "subscription", "admin_stats"], id.toString());
  return tenant;
};

export const updateTenantStatus = async (id, status) => {
  const tenant = await Tenant.findByIdAndUpdate(id, { status }, { new: true });
  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }

  // Update subscription status in tandem
  await Subscription.findOneAndUpdate(
    { tenantId: id },
    { status: status === "active" ? "active" : status }
  );

  // Invalidate tenant and subscription cache
  cacheService.invalidate(["tenants", "subscription", "admin_stats"], id.toString());

  return tenant;
};

export const deleteTenant = async (id) => {
  const tenant = await Tenant.findById(id);
  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }

  // Perform full cascade delete of everything tied to this tenant
  await Promise.all([
    Customer.deleteMany({ tenantId: id }),
    InventoryItem.deleteMany({ tenantId: id }),
    Payment.deleteMany({ tenantId: id }),
    Product.deleteMany({ tenantId: id }),
    PurchaseOrder.deleteMany({ tenantId: id }),
    Sale.deleteMany({ tenantId: id }),
    Store.deleteMany({ tenantId: id }),
    Subscription.deleteMany({ tenantId: id }),
    Supplier.deleteMany({ tenantId: id }),
    SupportTicket.deleteMany({ tenantId: id }),
    User.deleteMany({ tenantId: id }),
    Tenant.findByIdAndDelete(id),
  ]);

  // Invalidate cache across all relevant domains to ensure no ghost data remains
  cacheService.invalidate([
    "tenants", "subscription", "admin_stats", 
    "products", "inventory", "sales", "staff", "tickets"
  ], "global");
  
  return { message: "Tenant and all associated data permanently deleted" };
};

export const getPlatformSettings = async () => {
  let settings = await PlatformSetting.findOne().lean();
  if (!settings) {
    settings = await PlatformSetting.create({
      platformName: "CityRock",
      platformTagline: "Cloud Retail Management Platform",
    });
  }
  return settings;
};

export const updatePlatformSettings = async (data) => {
  const settings = await PlatformSetting.findOneAndUpdate(
    {},
    { $set: data },
    { new: true, upsert: true }
  );
  cacheService.invalidate(["platform_settings", "admin_stats"], "global");
  return settings;
};

export const getPendingPayments = async ({ search = "", status = "all", page = 1, limit = 10 } = {}) => {
  const query = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    const matchingTenants = await Tenant.find({
      $or: [
        { businessName: searchRegex },
        { ownerName: searchRegex },
        { ownerEmail: searchRegex },
        { ownerPhone: searchRegex },
      ],
    }).select("_id").lean();

    const tenantIds = matchingTenants.map((t) => t._id);

    query.$or = [
      { referenceNote: searchRegex },
      { transactionId: searchRegex },
      { gatewayTransactionId: searchRegex },
      ...(tenantIds.length > 0 ? [{ tenantId: { $in: tenantIds } }] : []),
    ];
  }

  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const numLimit = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (numPage - 1) * numLimit;

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate("tenantId", "businessName ownerName ownerEmail ownerPhone")
      .populate("paymentAccountId")
      .populate("planId")
      .populate("reviewedBy", "name email")
      .sort({ submittedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(numLimit)
      .lean(),
    Payment.countDocuments(query),
  ]);

  return {
    payments,
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit) || 1,
  };
};

export const reviewPayment = async (id, { status, rejectionReason, reviewedBy, crossCheckedWhatsApp }) => {
  const payment = await Payment.findById(id);
  if (!payment) {
    const error = new Error("Payment record not found");
    error.statusCode = 404;
    throw error;
  }

  payment.status = status;
  payment.reviewedAt = new Date();
  payment.reviewedBy = reviewedBy;
  if (crossCheckedWhatsApp !== undefined) {
    payment.adminCrossCheckedWhatsApp = Boolean(crossCheckedWhatsApp);
  }
  if (rejectionReason) payment.rejectionReason = rejectionReason;
  await payment.save();

  if (status === "confirmed") {
    const isAnnual = payment.billingCycle === "annual";
    const daysToAdd = isAnnual ? 365 : 30;
    const nextEnd = new Date();
    nextEnd.setDate(nextEnd.getDate() + daysToAdd);

    const updateFields = {
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: nextEnd,
      graceEndsAt: null,
    };
    if (payment.planId) {
      updateFields.planId = payment.planId;
    }
    if (payment.billingCycle) {
      updateFields.billingCycle = payment.billingCycle;
    }

    await Subscription.findOneAndUpdate(
      { tenantId: payment.tenantId },
      updateFields,
      { upsert: true }
    );
    await Tenant.findByIdAndUpdate(payment.tenantId, { status: "active" });
  }

  cacheService.invalidate(["payments", "subscription", "admin_stats"], payment.tenantId.toString());
  return payment;
};

export const getPaymentAccounts = async () => {
  return PaymentAccount.find().sort({ createdAt: -1 }).lean();
};

export const createPaymentAccount = async (data) => {
  const account = await PaymentAccount.create(data);
  cacheService.invalidate(["payment_accounts"], "global");
  return account;
};

export const updatePaymentAccount = async (id, data) => {
  const account = await PaymentAccount.findByIdAndUpdate(id, data, { new: true });
  cacheService.invalidate(["payment_accounts"], "global");
  return account;
};

export const listTickets = async ({ status = "all" }) => {
  const query = {};
  if (status && status !== "all") query.status = status;
  return SupportTicket.find(query)
    .populate("tenantId", "businessName ownerEmail")
    .sort({ createdAt: -1 })
    .lean();
};

export const listPlans = async () => {
  return Plan.find().sort({ sortOrder: 1 }).lean();
};

export const createPlan = async (data) => {
  const plan = await Plan.create(data);
  cacheService.invalidate(["plans"], "global");
  return plan;
};

export const updatePlan = async (id, data) => {
  const plan = await Plan.findByIdAndUpdate(id, data, { new: true });
  cacheService.invalidate(["plans"], "global");
  return plan;
};

export const deletePlan = async (id) => {
  const plan = await Plan.findById(id);
  if (!plan) {
    const error = new Error("Plan not found");
    error.statusCode = 404;
    throw error;
  }
  
  await Plan.findByIdAndDelete(id);
  cacheService.invalidate(["plans", "subscription"], "global");
  return { message: "Plan permanently deleted." };
};

export const listStaff = async () => {
  return User.find({
    role: { $in: ["super_admin", "platform_admin", "support_agent", "sales_onboarding"] },
  })
    .select("-passwordHash")
    .lean();
};

export const createStaff = async ({ name, email, role, password }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const error = new Error("User with this email already exists");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await User.hashPassword(password || "cityrock123");
  const staff = await User.create({
    name,
    email: email.toLowerCase(),
    role: role || "support_agent",
    passwordHash,
    isActive: true,
  });

  return staff.toSafeObject();
};

export default {
  getStats,
  listTenants,
  getTenant,
  updateTenant,
  updateTenantStatus,
  getPlatformSettings,
  updatePlatformSettings,
  getPendingPayments,
  reviewPayment,
  getPaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  listTickets,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  listStaff,
  createStaff,
  deleteTenant,
};
