import tenantService from "../services/tenantService.js";
import adminService from "../services/adminService.js";

export const getStores = async (req, res, next) => {
  try {
    const stores = await tenantService.getStores(req.tenantId);
    res.status(200).json({
      success: true,
      data: stores,
    });
  } catch (error) {
    next(error);
  }
};

export const createStore = async (req, res, next) => {
  try {
    const store = await tenantService.createStore(req.tenantId, req.body);
    res.status(201).json({
      success: true,
      message: "Store branch created successfully",
      data: store,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStore = async (req, res, next) => {
  try {
    const store = await tenantService.updateStore(req.tenantId, req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Store updated successfully",
      data: store,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscription = async (req, res, next) => {
  try {
    const sub = await tenantService.getSubscription(req.tenantId);
    res.status(200).json({
      success: true,
      data: sub,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProofScreenshot = async (req, res, next) => {
  try {
    const proofFileUrl = req.fileUrl;
    if (!proofFileUrl) {
      return res.status(400).json({
        success: false,
        message: "No screenshot file uploaded. Please choose a valid image.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Receipt screenshot successfully uploaded to Cloudinary Secure Storage!",
      data: {
        url: proofFileUrl,
        publicId: req.cloudinaryPublicId || null,
        details: req.fileData || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const submitPaymentProof = async (req, res, next) => {
  try {
    const proofFileUrl = req.fileUrl || req.body.proofFileUrl;
    const payment = await tenantService.submitPaymentProof(req.tenantId, {
      ...req.body,
      proofFileUrl,
    });

    res.status(201).json({
      success: true,
      message: "Payment proof and WhatsApp verification submitted for admin review",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentAccounts = async (req, res, next) => {
  try {
    const accounts = await tenantService.getTenantPaymentAccounts();
    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (req, res, next) => {
  try {
    const plans = await adminService.listPlans();
    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

export const getStaff = async (req, res, next) => {
  try {
    const staff = await tenantService.getTenantStaff(req.tenantId);
    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

export const inviteStaff = async (req, res, next) => {
  try {
    const staff = await tenantService.inviteStaff(req.tenantId, req.body);
    res.status(201).json({
      success: true,
      message: "Staff member invited successfully",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateStaff = async (req, res, next) => {
  try {
    const staff = await tenantService.deactivateStaff(req.tenantId, req.params.id);
    res.status(200).json({
      success: true,
      message: "Staff member deactivated",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

export const listTickets = async (req, res, next) => {
  try {
    const result = await tenantService.listTickets({
      tenantId: req.tenantId,
      search: req.query.search,
      status: req.query.status,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    });
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req, res, next) => {
  try {
    const ticket = await tenantService.createTicket(req.tenantId, req.user, req.body);
    res.status(201).json({
      success: true,
      message: "Support ticket opened successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const replyToTicket = async (req, res, next) => {
  try {
    const ticket = await tenantService.replyToTicket(
      req.tenantId,
      req.params.id,
      req.user,
      req.body.body
    );
    res.status(200).json({
      success: true,
      message: "Reply sent successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStore = async (req, res, next) => {
  try {
    const result = await tenantService.deleteStore(req.tenantId, req.params.id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getStaffDetails = async (req, res, next) => {
  try {
    const staff = await tenantService.getStaffDetails(req.tenantId, req.params.id);
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

export const updateStaff = async (req, res, next) => {
  try {
    const staff = await tenantService.updateStaff(req.tenantId, req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Staff details updated successfully",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStaff = async (req, res, next) => {
  try {
    const result = await tenantService.deleteStaff(req.tenantId, req.params.id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export default {
  getStores,
  createStore,
  updateStore,
  deleteStore,
  getSubscription,
  uploadProofScreenshot,
  submitPaymentProof,
  getPaymentAccounts,
  getPlans,
  getStaff,
  getStaffDetails,
  inviteStaff,
  updateStaff,
  deactivateStaff,
  deleteStaff,
  listTickets,
  createTicket,
  replyToTicket,
};

