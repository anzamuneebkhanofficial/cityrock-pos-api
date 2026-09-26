import supplierService from "../services/supplierService.js";
import Supplier from "../models/Supplier.js";
import { clearCache } from "../middleware/cacheMiddleware.js";

export const list = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 9 } = req.query;
    const { suppliers, total } = await supplierService.listSuppliers(req.tenantId, {
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      data: suppliers,
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

export const getSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.getSupplierDetails(req.tenantId, req.params.id);
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const supplier = await supplierService.createSupplier(req.tenantId, req.body);
    clearCache("suppliers", req.tenantId, req.activeStoreId);
    res.status(201).json({
      success: true,
      message: "Supplier registered successfully",
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const supplier = await supplierService.updateSupplier(req.tenantId, req.params.id, req.body);
    clearCache("suppliers", req.tenantId, req.activeStoreId);
    res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    await supplierService.deleteSupplier(req.tenantId, req.params.id);
    clearCache("suppliers", req.tenantId, req.activeStoreId);
    res.status(200).json({
      success: true,
      message: "Supplier removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export default { list, getSupplier, create, update, deleteSupplier };

