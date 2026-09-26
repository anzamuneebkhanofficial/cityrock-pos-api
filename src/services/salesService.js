import mongoose from "mongoose";
import Sale from "../models/Sale.js";
import InventoryItem from "../models/InventoryItem.js";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import Customer from "../models/Customer.js";
import { generateInvoiceNumber } from "./counterService.js";
import { cacheService } from "../config/cache.js";

export const createSale = async (tenantId, cashierId, data) => {
  const {
    storeId,
    items,
    paymentMethod = "cash",
    cartDiscount = 0,
    amountPaid = 0,
    customerId = null,
    customerName = "Walk-in Customer",
    customerPhone = "",
    idempotencyKey = null,
  } = data;

  if (!items || items.length === 0) {
    const error = new Error("At least one item is required to complete a sale");
    error.statusCode = 400;
    throw error;
  }

  // 1. Idempotency Check — Prevent duplicate charges on network retries
  if (idempotencyKey) {
    const existingSale = await Sale.findOne({ tenantId, idempotencyKey })
      .populate("storeId", "name storeCode")
      .populate("cashierId", "name")
      .lean();
    if (existingSale) {
      return existingSale;
    }
  }

  // 2. Validate Store belongs to current Tenant
  const targetStoreId = storeId || data.storeId;
  const store = await Store.findOne({ _id: targetStoreId, tenantId, isDeleted: { $ne: true } }).lean();
  if (!store) {
    const error = new Error("Selected store location is invalid or does not belong to your store organization");
    error.statusCode = 404;
    throw error;
  }
  const storeCode = store.storeCode || "INV";

  const invoiceNumber = await generateInvoiceNumber(tenantId, storeCode);

  let subtotal = 0;
  const processedItems = [];
  const successfulDeductions = [];

  try {
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, tenantId, isDeleted: { $ne: true } }).lean();
      if (!product) {
        const error = new Error(`Product not found or inactive: ${item.productName || item.productId}`);
        error.statusCode = 404;
        throw error;
      }

      const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : product.basePrice);
      const quantity = Math.max(1, Number(item.quantity || 1));
      const itemDiscount = Math.max(0, Number(item.discount || 0));
      const lineTotal = Math.max(0, unitPrice * quantity - itemDiscount);

      subtotal += lineTotal;

      processedItems.push({
        productId: product._id,
        productName: product.name,
        variantSku: item.variantSku || null,
        variantLabel: item.variantLabel || null,
        unitPrice,
        quantity,
        discount: itemDiscount,
        lineTotal,
      });

      // 3. Conditional Atomic Inventory Deduction — prevent negative overselling & race conditions
      const invMatch = {
        tenantId,
        storeId: targetStoreId,
        productId: product._id,
        variantSku: item.variantSku || null,
      };

      // Atomic conditional update: only decrement if available quantity >= requested quantity
      const updatedInv = await InventoryItem.findOneAndUpdate(
        {
          ...invMatch,
          quantity: { $gte: quantity },
        },
        { $inc: { quantity: -quantity } },
        { new: true }
      );

      if (!updatedInv) {
        // Find existing to report accurate stock
        const existing = await InventoryItem.findOne(invMatch).lean();
        const available = existing ? existing.quantity : 0;
        const err = new Error(
          `Insufficient stock for '${product.name}'${item.variantLabel ? ` (${item.variantLabel})` : ""}. Available: ${available}, Requested: ${quantity}`
        );
        err.statusCode = 400;
        throw err;
      }

      successfulDeductions.push({
        match: invMatch,
        quantity,
      });
    }

    const total = Math.max(0, subtotal - Number(cartDiscount));
    const changeGiven = Math.max(0, Number(amountPaid) - total);

    const sale = await Sale.create({
      tenantId,
      storeId: targetStoreId,
      cashierId,
      customerId: customerId || null,
      customerSnapshot: {
        name: customerName || "Walk-in Customer",
        phone: customerPhone || "",
      },
      invoiceNumber,
      items: processedItems,
      subtotal,
      cartDiscount: Number(cartDiscount),
      total,
      amountPaid: Number(amountPaid) || total,
      changeGiven,
      paymentMethod,
      idempotencyKey: idempotencyKey || null,
      status: "completed",
    });

    // 4. Update customer loyalty scoped by tenant
    if (customerId) {
      await Customer.findOneAndUpdate(
        { _id: customerId, tenantId },
        {
          $inc: {
            totalPurchases: total,
            totalTransactions: 1,
            loyaltyPoints: Math.floor(total / 100),
          },
        }
      ).catch(() => {});
    }

    // Invalidate caches
    cacheService.invalidate(["sales", "inventory", "reports", "admin_stats"], tenantId);

    return sale;
  } catch (error) {
    // 5. Compensating Transaction Rollback: restore any items decremented before failure
    for (const ded of successfulDeductions) {
      await InventoryItem.findOneAndUpdate(
        ded.match,
        { $inc: { quantity: ded.quantity } }
      ).catch((e) => console.error("[Sale Rollback Error]", e));
    }
    throw error;
  }
};

export const listSales = async (tenantId, { search, storeId, paymentMethod, status, startDate, endDate, page = 1, limit = 9 }) => {
  const skip = (page - 1) * limit;
  const query = { tenantId };

  if (storeId && storeId !== "all") query.storeId = storeId;
  if (paymentMethod && paymentMethod !== "all") query.paymentMethod = paymentMethod;
  if (status && status !== "all") query.status = status;

  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: "i" } },
      { "customerSnapshot.name": { $regex: search, $options: "i" } },
      { "customerSnapshot.phone": { $regex: search, $options: "i" } },
    ];
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const [sales, total] = await Promise.all([
    Sale.find(query)
      .populate("storeId", "name storeCode")
      .populate("cashierId", "name")
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Sale.countDocuments(query),
  ]);

  return { sales, total, page, limit };
};

export const getSaleById = async (id, tenantId = null) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { _id: id } : { invoiceNumber: id };
  if (tenantId) query.tenantId = tenantId;

  const sale = await Sale.findOne(query)
    .populate("storeId", "name address phone storeCode footerNote receiptWidth")
    .populate("cashierId", "name")
    .populate("customerId", "name phone")
    .lean();

  if (!sale) {
    const error = new Error("Sale not found");
    error.statusCode = 404;
    throw error;
  }
  return sale;
};

export const returnSale = async (tenantId, saleId, { items, reason }) => {
  const sale = await Sale.findOne({ _id: saleId, tenantId });
  if (!sale) {
    const error = new Error("Sale record not found");
    error.statusCode = 404;
    throw error;
  }

  const returnItemsList = items || sale.items;
  for (const item of returnItemsList) {
    await InventoryItem.findOneAndUpdate(
      {
        tenantId,
        storeId: sale.storeId,
        productId: item.productId,
        variantSku: item.variantSku || null,
      },
      { $inc: { quantity: item.quantity } }
    );
  }

  sale.status = "returned";
  sale.returnReason = reason || "Customer return";
  sale.returnedItems = returnItemsList;
  await sale.save();

  cacheService.invalidate(["sales", "inventory", "reports"], tenantId);
  return sale;
};

export default {
  createSale,
  listSales,
  getSaleById,
  returnSale,
};
