import Store from "../models/Store.js";
import Tenant from "../models/Tenant.js";
import Subscription from "../models/Subscription.js";
import Payment from "../models/Payment.js";
import PaymentAccount from "../models/PaymentAccount.js";
import Plan from "../models/Plan.js";
import User from "../models/User.js";
import SupportTicket from "../models/SupportTicket.js";
import Counter from "../models/Counter.js";
import InventoryItem from "../models/InventoryItem.js";
import Sale from "../models/Sale.js";
import mongoose from "mongoose";
import { cacheService } from "../config/cache.js";

export const getStores = async (tenantId) => {
  const stores = await Store.find({ tenantId, isDeleted: { $ne: true } })
    .populate("managerId", "name email phone")
    .sort({ isMainStore: -1, createdAt: 1 })
    .lean();

  const enriched = await Promise.all(
    stores.map(async (st) => {
      const [staffList, invStats, salesStats] = await Promise.all([
        User.find({ tenantId, storeId: st._id, isDeleted: { $ne: true }, isActive: true })
          .select("name email role salary phone hireDate")
          .lean(),
        InventoryItem.aggregate([
          { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), storeId: st._id } },
          { $group: { _id: null, totalItems: { $sum: 1 }, totalUnits: { $sum: "$quantity" } } }
        ]),
        Sale.aggregate([
          { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), storeId: st._id, status: "completed" } },
          { $group: { _id: null, totalSales: { $sum: "$total" }, orderCount: { $sum: 1 } } }
        ]),
      ]);

      const totalPayroll = staffList.reduce((sum, member) => sum + (member.salary || 0), 0);

      return {
        ...st,
        staffCount: staffList.length,
        totalPayroll,
        staffList,
        inventoryCount: invStats[0]?.totalItems || 0,
        totalUnits: invStats[0]?.totalUnits || 0,
        totalRevenue: salesStats[0]?.totalSales || 0,
        orderCount: salesStats[0]?.orderCount || 0,
      };
    })
  );

  return enriched;
};

export const createStore = async (tenantId, data) => {
  const [sub, count] = await Promise.all([
    Subscription.findOne({ tenantId }).populate("planId").lean(),
    Store.countDocuments({ tenantId, isDeleted: { $ne: true } }),
  ]);

  const maxStores = sub?.planId?.maxStores || 1;
  if (count >= maxStores) {
    const planName = sub?.planId?.name || "current";
    const error = new Error(
      `Store limit reached. Your ${planName} subscription permits up to ${maxStores} store branch${maxStores > 1 ? "es" : ""}. Please upgrade your plan in Billing to add additional locations.`
    );
    error.statusCode = 403;
    throw error;
  }

  const isMainStore = count === 0 ? true : Boolean(data.isMainStore);

  const store = await Store.create({
    ...data,
    tenantId,
    isMainStore,
    storeCode: data.storeCode || `SH00${count + 1}`,
  });

  cacheService.invalidate(["stores", "subscription"], tenantId);
  return store;
};

export const updateStore = async (tenantId, storeId, data) => {
  const store = await Store.findOneAndUpdate(
    { _id: storeId, tenantId },
    { $set: data },
    { new: true }
  );
  if (!store) {
    const error = new Error("Store branch not found");
    error.statusCode = 404;
    throw error;
  }

  cacheService.invalidate(["stores"], tenantId);
  return store;
};

export const deleteStore = async (tenantId, storeId) => {
  const store = await Store.findOne({ _id: storeId, tenantId, isDeleted: { $ne: true } });
  if (!store) {
    const error = new Error("Store branch not found");
    error.statusCode = 404;
    throw error;
  }
  if (store.isMainStore) {
    const error = new Error(
      "Cannot delete your primary flagship store. Please designate another branch as the main store before removing."
    );
    error.statusCode = 400;
    throw error;
  }

  store.isDeleted = true;
  await store.save();
  cacheService.invalidate(["stores", "subscription"], tenantId);
  return { success: true, message: "Branch location deleted successfully" };
};

export const getSubscription = async (tenantId) => {
  let sub = await Subscription.findOne({ tenantId }).populate("planId").lean();

  if (!sub) {
    const defaultPlan = await Plan.findOne({ isActive: true }).sort({ sortOrder: 1 }).lean();
    if (defaultPlan) {
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 30);
      sub = await Subscription.create({
        tenantId,
        planId: defaultPlan._id,
        status: "trial",
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureEnd,
      });
      sub = await Subscription.findById(sub._id).populate("planId").lean();
    }
  }

  const [tenant, payments, storeCount, staffCount] = await Promise.all([
    Tenant.findById(tenantId).lean(),
    Payment.find({ tenantId }).populate("planId").populate("paymentAccountId").sort({ createdAt: -1 }).lean(),
    Store.countDocuments({ tenantId, isDeleted: { $ne: true } }),
    User.countDocuments({ tenantId, isActive: true, isDeleted: { $ne: true } }),
  ]);

  const maxStores = sub?.planId?.maxStores || 1;
  const remainingStores = Math.max(0, maxStores - storeCount);

  return {
    subscription: sub,
    tenant,
    payments,
    capacity: {
      storeCount,
      currentStores: storeCount,
      maxStores,
      remainingStores,
      staffCount,
    },
  };
};


export const submitPaymentProof = async (
  tenantId,
  {
    planId,
    billingCycle = "monthly",
    amount,
    paymentAccountId,
    referenceNote,
    transactionId,
    proofFileUrl,
    whatsappConfirmed,
    whatsappNumber,
  }
) => {
  if (!proofFileUrl) {
    const error = new Error("Payment screenshot upload is mandatory. Please upload your receipt to Cloudinary.");
    error.statusCode = 400;
    throw error;
  }

  // Ensure proofFileUrl is a valid URL and not a dummy/local path
  if (!proofFileUrl.startsWith("http://") && !proofFileUrl.startsWith("https://")) {
    const error = new Error("Invalid receipt URL. Upload must be stored on Cloudinary secure cloud storage.");
    error.statusCode = 400;
    throw error;
  }

  const isConfirmedWA = whatsappConfirmed === true || whatsappConfirmed === "true";
  if (!isConfirmedWA) {
    const error = new Error("WhatsApp confirmation is mandatory for double verification. Please click 'Send Proof on WhatsApp' before submitting.");
    error.statusCode = 400;
    throw error;
  }

  // Determine official transaction ID
  const finalTxnId = (transactionId || referenceNote || `TXN-POS-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`).trim();

  const payment = await Payment.create({
    tenantId,
    planId: planId || null,
    billingCycle: billingCycle || "monthly",
    amount: Number(amount),
    paymentAccountId: paymentAccountId || null,
    referenceNote: referenceNote || finalTxnId,
    transactionId: finalTxnId,
    gatewayTransactionId: finalTxnId,
    proofFileUrl,
    whatsappConfirmed: true,
    whatsappConfirmedAt: new Date(),
    whatsappNumber: whatsappNumber || "",
    status: "pending_review",
    submittedAt: new Date(),
  });

  cacheService.invalidate(["payments", "subscription"], tenantId);
  return payment;
};

export const getTenantPaymentAccounts = async () => {
  return PaymentAccount.find({ isActive: true }).sort({ createdAt: -1 }).lean();
};

export const getTenantStaff = async (tenantId) => {
  return User.find({
    tenantId,
    role: { $in: ["manager", "cashier", "inventory", "accountant"] },
    isDeleted: { $ne: true },
  })
    .select("-passwordHash")
    .populate("storeId", "name storeCode city")
    .sort({ createdAt: -1 })
    .lean();
};

export const getStaffDetails = async (tenantId, staffId) => {
  const user = await User.findOne({ _id: staffId, tenantId, isDeleted: { $ne: true } })
    .select("-passwordHash")
    .populate("storeId", "name storeCode city isMainStore")
    .lean();

  if (!user) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  // Aggregate cashier checkout performance
  const salesStats = await Sale.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        cashierId: new mongoose.Types.ObjectId(staffId),
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$total" },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  return {
    ...user,
    performance: {
      totalRevenue: salesStats[0]?.totalSales || 0,
      totalOrders: salesStats[0]?.orderCount || 0,
    },
  };
};

export const inviteStaff = async (
  tenantId,
  { name, email, role, storeId, salary, phone, cnic, notes, password }
) => {
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    const error = new Error("A user with this email already exists");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await User.hashPassword(password || "cityrock123");
  const user = await User.create({
    tenantId,
    storeId: storeId || null,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    role: role || "cashier",
    phone: phone ? phone.trim() : "",
    cnic: cnic ? cnic.trim() : "",
    notes: notes ? notes.trim() : "",
    salary: Number(salary) || 0,
    hireDate: new Date(),
    passwordHash,
    isActive: true,
    isEmailVerified: true,
    isDeleted: false,
  });

  cacheService.invalidate(["staff"], tenantId);
  return user.toSafeObject();
};

export const updateStaff = async (tenantId, staffId, data) => {
  const updateData = { ...data };
  if (updateData.password) {
    updateData.passwordHash = await User.hashPassword(updateData.password);
    delete updateData.password;
  }
  if (updateData.salary !== undefined) {
    updateData.salary = Number(updateData.salary) || 0;
  }

  const user = await User.findOneAndUpdate(
    { _id: staffId, tenantId, isDeleted: { $ne: true } },
    { $set: updateData },
    { new: true }
  )
    .select("-passwordHash")
    .populate("storeId", "name storeCode city");

  if (!user) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  cacheService.invalidate(["staff"], tenantId);
  return user.toSafeObject ? user.toSafeObject() : user;
};

export const deactivateStaff = async (tenantId, staffId) => {
  const user = await User.findOneAndUpdate(
    { _id: staffId, tenantId },
    { isActive: false },
    { new: true }
  );
  if (!user) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  cacheService.invalidate(["staff"], tenantId);
  return user.toSafeObject ? user.toSafeObject() : user;
};

export const deleteStaff = async (tenantId, staffId) => {
  const user = await User.findOneAndUpdate(
    { _id: staffId, tenantId },
    { $set: { isDeleted: true, isActive: false } },
    { new: true }
  );
  if (!user) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  cacheService.invalidate(["staff"], tenantId);
  return { success: true, message: "Staff member deleted" };
};


export const listTickets = async ({ tenantId, search = "", status = "all", page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  const query = { tenantId };

  if (status && status !== "all") {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { ticketNumber: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
    ];
  }

  const [tickets, total] = await Promise.all([
    SupportTicket.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SupportTicket.countDocuments(query),
  ]);

  return { data: tickets, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
};

export const createTicket = async (tenantId, user, { category, subject, body, priority = "medium" }) => {
  const seq = await Counter.getNextSequence("ticketNumber");
  const ticketNumber = `TIC-${seq}`;

  const ticket = await SupportTicket.create({
    tenantId,
    ticketNumber,
    category: category || "general",
    subject: subject.trim(),
    priority,
    status: "open",
    messages: [
      {
        senderId: user._id,
        senderName: user.name,
        senderRole: user.role,
        body: body.trim(),
        isInternal: false,
        createdAt: new Date(),
      },
    ],
  });

  cacheService.invalidate(["tickets"], "global");
  return ticket;
};

export const replyToTicket = async (tenantId, ticketId, user, body) => {
  const ticket = await SupportTicket.findOne({ _id: ticketId, tenantId });
  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  ticket.messages.push({
    senderId: user._id,
    senderName: user.name,
    senderRole: user.role,
    body: body.trim(),
    isInternal: false,
    createdAt: new Date(),
  });

  if (ticket.status === "resolved" || ticket.status === "closed") {
    ticket.status = "open";
  }

  await ticket.save();
  cacheService.invalidate(["tickets"], "global");
  return ticket;
};

export default {
  getStores,
  createStore,
  updateStore,
  getSubscription,
  submitPaymentProof,
  getTenantPaymentAccounts,
  getTenantStaff,
  inviteStaff,
  deactivateStaff,
  listTickets,
  createTicket,
  replyToTicket,
};
