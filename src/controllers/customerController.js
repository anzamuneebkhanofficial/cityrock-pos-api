import customerService from "../services/customerService.js";
import Customer from "../models/Customer.js";
import { clearCache } from "../middleware/cacheMiddleware.js";

export const list = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 9 } = req.query;
    const { customers, total } = await customerService.listCustomers(req.tenantId, {
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      data: customers,
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

export const getCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerDetails(req.tenantId, req.params.id);
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.tenantId, req.body);
    clearCache("customers", req.tenantId, req.activeStoreId);
    res.status(201).json({
      success: true,
      message: "Customer profile created successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.tenantId, req.params.id, req.body);
    clearCache("customers", req.tenantId, req.activeStoreId);
    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    await customerService.deleteCustomer(req.tenantId, req.params.id);
    clearCache("customers", req.tenantId, req.activeStoreId);
    res.status(200).json({
      success: true,
      message: "Customer removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export default { list, getCustomer, create, update, deleteCustomer };

