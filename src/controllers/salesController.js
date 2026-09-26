import salesService from "../services/salesService.js";
import Store from "../models/Store.js";
import Sale from "../models/Sale.js";
import { generateInvoicePDF } from "../utils/pdfGenerator.js";
import { exportSalesReportExcel } from "../utils/excelGenerator.js";

export const create = async (req, res, next) => {
  try {
    const sale = await salesService.createSale(req.tenantId, req.user._id, req.body);
    res.status(201).json({
      success: true,
      message: "Sale completed successfully",
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 9, search, storeId, paymentMethod, status, startDate, endDate } = req.query;
    const { sales, total } = await salesService.listSales(req.tenantId, {
      search,
      storeId,
      paymentMethod,
      status,
      startDate,
      endDate,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      data: sales,
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

export const getSale = async (req, res, next) => {
  try {
    const sale = await salesService.getSaleById(req.params.id, req.tenantId);
    res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

export const returnSale = async (req, res, next) => {
  try {
    const sale = await salesService.returnSale(req.tenantId, req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Sale marked as returned and inventory restocked",
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

export const getReceipt = async (req, res, next) => {
  try {
    const sale = await salesService.getSaleById(req.params.id, req.tenantId);
    res.status(200).json({
      success: true,
      data: {
        storeName: sale.storeId?.name || "CityRock Store",
        storeAddress: sale.storeId?.address || "",
        storePhone: sale.storeId?.phone || "",
        invoiceNumber: sale.invoiceNumber,
        date: sale.createdAt,
        cashier: sale.cashierId?.name || "Staff",
        customer: sale.customerSnapshot?.name || "Walk-in Customer",
        items: sale.items,
        subtotal: sale.subtotal,
        discount: sale.cartDiscount,
        tax: sale.tax,
        total: sale.total,
        amountPaid: sale.amountPaid,
        changeGiven: sale.changeGiven,
        paymentMethod: sale.paymentMethod,
        footerNote: sale.storeId?.footerNote || "Thank you for shopping with us!",
        receiptWidth: sale.storeId?.receiptWidth || "80mm",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoicePDF = async (req, res, next) => {
  try {
    const sale = await salesService.getSaleById(req.params.id, req.tenantId);
    const store = await Store.findById(sale.storeId).lean();
    generateInvoicePDF(sale, store, res);
  } catch (error) {
    next(error);
  }
};

export const exportExcel = async (req, res, next) => {
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

export default {
  create,
  list,
  getSale,
  returnSale,
  getReceipt,
  getInvoicePDF,
  exportExcel,
};
