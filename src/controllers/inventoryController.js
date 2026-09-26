import inventoryService from "../services/inventoryService.js";
import InventoryItem from "../models/InventoryItem.js";
import { exportInventoryExcel } from "../utils/excelGenerator.js";

export const list = async (req, res, next) => {
  try {
    const { search = "", storeId = "all", stockStatus = "all", page = 1, limit = 9 } = req.query;
    const { items, total } = await inventoryService.listInventory(req.tenantId, {
      search,
      storeId,
      stockStatus,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      data: items,
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

export const getLowStock = async (req, res, next) => {
  try {
    const lowStock = await inventoryService.getLowStock(req.tenantId, req.query.storeId);
    res.status(200).json({
      success: true,
      data: lowStock,
    });
  } catch (error) {
    next(error);
  }
};

export const getValuation = async (req, res, next) => {
  try {
    const valuation = await inventoryService.getValuation(req.tenantId, req.query.storeId);
    res.status(200).json({
      success: true,
      data: valuation,
    });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      id: req.params.id || req.body.inventoryId,
    };
    const item = await inventoryService.adjustStock(req.tenantId, payload);
    res.status(200).json({
      success: true,
      message: "Stock adjusted successfully",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const exportExcel = async (req, res, next) => {
  try {
    const items = await InventoryItem.find({ tenantId: req.tenantId })
      .populate("productId", "name sku barcode")
      .populate("storeId", "name")
      .sort({ quantity: 1 })
      .lean();
    await exportInventoryExcel(items, res);
  } catch (error) {
    next(error);
  }
};

export default {
  list,
  getLowStock,
  getValuation,
  adjustStock,
  exportExcel,
};
