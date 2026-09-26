import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";
import { cacheService } from "../config/cache.js";

export const listCustomers = async (tenantId, { search = "", page = 1, limit = 9 }) => {
  const skip = (page - 1) * limit;
  const query = { tenantId, isDeleted: { $ne: true } };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { cnic: { $regex: search, $options: "i" } },
      { address: { $regex: search, $options: "i" } },
    ];
  }

  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments(query),
  ]);

  return { customers, total, page, limit };
};

export const getCustomerDetails = async (tenantId, id) => {
  const customer = await Customer.findOne({ _id: id, tenantId, isDeleted: { $ne: true } }).lean();
  if (!customer) {
    const error = new Error("Customer record not found");
    error.statusCode = 404;
    throw error;
  }

  // Fetch recent purchases from Sale model
  const recentSales = await Sale.find({ tenantId, customerId: id })
    .select("invoiceNumber total items status createdAt paymentMethod")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return {
    ...customer,
    recentSales: recentSales.map(s => ({
      ...s,
      itemCount: s.items?.length || 0,
    })),
  };
};

export const createCustomer = async (tenantId, data) => {
  const { name, phone = "", email = "", address = "", cnic = "", notes = "", loyaltyPoints = 0 } = data;
  if (!name) {
    const error = new Error("Customer full name is required");
    error.statusCode = 400;
    throw error;
  }

  const customer = await Customer.create({
    tenantId,
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    address: address.trim(),
    cnic: cnic.trim(),
    notes: notes.trim(),
    loyaltyPoints: Number(loyaltyPoints) || 0,
    isDeleted: false,
  });

  cacheService.invalidate(["customers"], tenantId);
  return customer;
};

export const updateCustomer = async (tenantId, id, data) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: id, tenantId, isDeleted: { $ne: true } },
    { $set: data },
    { new: true }
  );

  if (!customer) {
    const error = new Error("Customer record not found");
    error.statusCode = 404;
    throw error;
  }

  cacheService.invalidate(["customers"], tenantId);
  return customer;
};

export const deleteCustomer = async (tenantId, id) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!customer) {
    const error = new Error("Customer record not found");
    error.statusCode = 404;
    throw error;
  }

  cacheService.invalidate(["customers"], tenantId);
  return customer;
};

export default {
  listCustomers,
  getCustomerDetails,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};

