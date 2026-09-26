import reportService from "../services/reportService.js";
import Sale from "../models/Sale.js";
import { exportSalesReportExcel } from "../utils/excelGenerator.js";

export const getSalesSummary = async (req, res, next) => {
  try {
    const { period = "today", storeId, startDate, endDate } = req.query;
    const summary = await reportService.getSalesSummary(
      req.tenantId,
      period,
      storeId,
      startDate,
      endDate
    );
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};


export const getTopProducts = async (req, res, next) => {
  try {
    const top = await reportService.getTopProducts(req.tenantId, req.query.limit || 5);
    res.status(200).json({
      success: true,
      data: top,
    });
  } catch (error) {
    next(error);
  }
};

export const getCashierPerformance = async (req, res, next) => {
  try {
    const performance = await reportService.getCashierPerformance(req.tenantId);
    res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    next(error);
  }
};

export const exportSalesSummaryExcel = async (req, res, next) => {
  try {
    const sales = await Sale.find({ tenantId: req.tenantId })
      .populate("storeId", "name")
      .populate("cashierId", "name")
      .sort({ createdAt: -1 })
      .lean();
    await exportSalesReportExcel(sales, res);
  } catch (error) {
    next(error);
  }
};

export const getCategoryShare = async (req, res, next) => {
  try {
    const data = await reportService.getCategoryShare(req.tenantId, req.query.period);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getInventoryLevels = async (req, res, next) => {
  try {
    const data = await reportService.getInventoryLevels(req.tenantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getStoresComparison = async (req, res, next) => {
  try {
    const data = await reportService.getStoresComparison(req.tenantId, req.query.period);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getTopCustomers = async (req, res, next) => {
  try {
    const data = await reportService.getTopCustomers(req.tenantId, req.query.limit || 10);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getSalesByHour = async (req, res, next) => {
  try {
    const data = await reportService.getSalesByHour(req.tenantId, req.query.date);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export default {
  getSalesSummary,
  getTopProducts,
  getCashierPerformance,
  exportSalesSummaryExcel,
  getCategoryShare,
  getInventoryLevels,
  getStoresComparison,
  getTopCustomers,
  getSalesByHour,
};
