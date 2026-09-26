import Supplier from "../models/Supplier.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { cacheService } from "../config/cache.js";

export const listSuppliers = async (tenantId, { search = "", page = 1, limit = 9 }) => {
  const skip = (page - 1) * limit;
  const query = { tenantId, isDeleted: { $ne: true } };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { contactPerson: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { taxNumber: { $regex: search, $options: "i" } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    Supplier.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(query),
  ]);

  return { suppliers, total, page, limit };
};

export const getSupplierDetails = async (tenantId, id) => {
  const supplier = await Supplier.findOne({ _id: id, tenantId, isDeleted: { $ne: true } }).lean();
  if (!supplier) {
    const error = new Error("Supplier record not found");
    error.statusCode = 404;
    throw error;
  }

  const recentPOs = await PurchaseOrder.find({ tenantId, supplierId: id })
    .select("poNumber totalAmount status createdAt items")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return {
    ...supplier,
    recentOrders: recentPOs.map(po => ({
      ...po,
      itemCount: po.items?.length || 0,
    })),
  };
};

export const createSupplier = async (tenantId, data) => {
  const { name, contactPerson = "", phone = "", email = "", address = "", taxNumber = "", notes = "", outstandingBalance = 0 } = data;
  if (!name) {
    const error = new Error("Supplier company name is required");
    error.statusCode = 400;
    throw error;
  }

  const supplier = await Supplier.create({
    tenantId,
    name: name.trim(),
    contactPerson: contactPerson.trim(),
    phone: phone.trim(),
    email: email.trim(),
    address: address.trim(),
    taxNumber: taxNumber.trim(),
    notes: notes.trim(),
    outstandingBalance: Number(outstandingBalance) || 0,
    isDeleted: false,
  });

  cacheService.invalidate(["suppliers"], tenantId);
  return supplier;
};

export const updateSupplier = async (tenantId, id, data) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: id, tenantId, isDeleted: { $ne: true } },
    { $set: data },
    { new: true }
  );

  if (!supplier) {
    const error = new Error("Supplier record not found");
    error.statusCode = 404;
    throw error;
  }

  cacheService.invalidate(["suppliers"], tenantId);
  return supplier;
};

export const deleteSupplier = async (tenantId, id) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!supplier) {
    const error = new Error("Supplier record not found");
    error.statusCode = 404;
    throw error;
  }

  cacheService.invalidate(["suppliers"], tenantId);
  return supplier;
};

export default {
  listSuppliers,
  getSupplierDetails,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};

