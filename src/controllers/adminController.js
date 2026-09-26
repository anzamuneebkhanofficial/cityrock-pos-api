import adminService from "../services/adminService.js";
import SupportTicket from "../models/SupportTicket.js";
import User from "../models/User.js";
import { cacheService } from "../config/cache.js";

export const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const listTenants = async (req, res, next) => {
  try {
    const { search = "", status = "all", page = 1, limit = 9 } = req.query;
    const { tenants, total } = await adminService.listTenants({
      search,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      data: tenants,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTenant = async (req, res, next) => {
  try {
    const tenant = await adminService.getTenant(req.params.id);
    res.status(200).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenantStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const tenant = await adminService.updateTenantStatus(req.params.id, status);
    res.status(200).json({
      success: true,
      message: `Tenant status successfully updated to ${status}`,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTenant = async (req, res, next) => {
  try {
    const result = await adminService.deleteTenant(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenant = async (req, res, next) => {
  try {
    const tenant = await adminService.updateTenant(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Tenant details updated successfully",
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlatformSettings = async (req, res, next) => {
  try {
    const settings = await adminService.getPlatformSettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlatformSettings = async (req, res, next) => {
  try {
    const settings = await adminService.updatePlatformSettings(req.body);
    res.status(200).json({
      success: true,
      message: "Platform settings updated successfully",
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadPlatformLogo = async (req, res, next) => {
  try {
    const logoUrl = req.fileUrl;
    if (!logoUrl) {
      return res.status(400).json({ success: false, message: "No logo file provided" });
    }

    const settings = await adminService.updatePlatformSettings({ platformLogoUrl: logoUrl });
    res.status(200).json({
      success: true,
      message: "Platform logo uploaded successfully",
      data: {
        logoUrl: settings.platformLogoUrl,
        platformLogoUrl: settings.platformLogoUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removePlatformLogo = async (req, res, next) => {
  try {
    const settings = await adminService.updatePlatformSettings({ platformLogoUrl: null });
    res.status(200).json({
      success: true,
      message: "Platform logo removed successfully",
      data: {
        logoUrl: null,
        platformLogoUrl: null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingPayments = async (req, res, next) => {
  try {
    const { search, status, page, limit } = req.query;
    const result = await adminService.getPendingPayments({ search, status, page, limit });
    res.status(200).json({
      success: true,
      data: result.payments,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reviewPaymentRequest = async (req, res, next) => {
  try {
    const { status, rejectionReason, crossCheckedWhatsApp } = req.body;
    const payment = await adminService.reviewPayment(req.params.id, {
      status,
      rejectionReason,
      crossCheckedWhatsApp,
      reviewedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: `Payment request marked as ${status}`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentAccounts = async (req, res, next) => {
  try {
    const accounts = await adminService.getPaymentAccounts();
    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

export const createPaymentAccount = async (req, res, next) => {
  try {
    const account = await adminService.createPaymentAccount(req.body);
    res.status(201).json({
      success: true,
      message: "Payment account created successfully",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentAccount = async (req, res, next) => {
  try {
    const account = await adminService.updatePaymentAccount(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Payment account updated successfully",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

export const listTickets = async (req, res, next) => {
  try {
    const tickets = await adminService.listTickets({ status: req.query.status });
    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

export const assignTicket = async (req, res, next) => {
  try {
    const { assignedAgent } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { assignedAgent, status: "in_progress" },
      { new: true }
    );
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

export const replyToTicket = async (req, res, next) => {
  try {
    const { body, isInternal = false } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    ticket.messages.push({
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      body,
      isInternal,
    });
    await ticket.save();

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

export const listPlans = async (req, res, next) => {
  try {
    const plans = await adminService.listPlans();
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const plan = await adminService.createPlan(req.body);
    res.status(201).json({ success: true, message: "Plan created successfully", data: plan });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const plan = await adminService.updatePlan(req.params.id, req.body);
    res.status(200).json({ success: true, message: "Plan updated successfully", data: plan });
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const result = await adminService.deletePlan(req.params.id);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

export const listStaff = async (req, res, next) => {
  try {
    const staff = await adminService.listStaff();
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (req, res, next) => {
  try {
    const staff = await adminService.createStaff(req.body);
    res.status(201).json({ success: true, message: "Staff member added successfully", data: staff });
  } catch (error) {
    next(error);
  }
};

export const resendStaffInvite = async (req, res, next) => {
  res.status(200).json({ success: true, message: "Invitation resent successfully" });
};

export const deleteStaff = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.status(200).json({ success: true, message: "Staff member deactivated" });
  } catch (error) {
    next(error);
  }
};

export default {
  getStats,
  listTenants,
  getTenant,
  updateTenant,
  updateTenantStatus,
  getPlatformSettings,
  updatePlatformSettings,
  uploadPlatformLogo,
  removePlatformLogo,
  getPendingPayments,
  reviewPaymentRequest,
  getPaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  listTickets,
  assignTicket,
  replyToTicket,
  updateTicketStatus,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  listStaff,
  createStaff,
  resendStaffInvite,
  deleteStaff,
  deleteTenant,
};
