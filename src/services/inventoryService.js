import mongoose from "mongoose";
import InventoryItem from "../models/InventoryItem.js";
import Product from "../models/Product.js";
import { cacheService } from "../config/cache.js";

export const listInventory = async (tenantId, { search = "", storeId = "all", stockStatus = "all", page = 1, limit = 9 }) => {
  const skip = (page - 1) * limit;
  const query = { tenantId };

  if (storeId && storeId !== "all") {
    query.storeId = storeId;
  }

  if (stockStatus === "out_of_stock") {
    query.quantity = { $lte: 0 };
  } else if (stockStatus === "low_stock") {
    query.$expr = { $lte: ["$quantity", "$reorderLevel"] };
  } else if (stockStatus === "in_stock") {
    query.quantity = { $gt: 0 };
  }

  let productMatch = { tenantId, isDeleted: { $ne: true } };
  if (search) {
    productMatch.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { barcode: { $regex: search, $options: "i" } },
    ];
    const matchingProducts = await Product.find(productMatch).select("_id").lean();
    query.productId = { $in: matchingProducts.map((p) => p._id) };
  }

  const [items, total] = await Promise.all([
    InventoryItem.find(query)
      .populate("productId", "name sku barcode category basePrice costPrice unit")
      .populate("storeId", "name storeCode isMainStore")
      .sort({ quantity: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InventoryItem.countDocuments(query),
  ]);

  return { items, total, page, limit };
};

export const getLowStock = async (tenantId, storeId = null) => {
  const query = {
    tenantId,
    $expr: { $lte: ["$quantity", "$reorderLevel"] },
  };
  if (storeId && storeId !== "all") query.storeId = storeId;

  return InventoryItem.find(query)
    .populate("productId", "name sku barcode basePrice")
    .populate("storeId", "name storeCode")
    .limit(20)
    .lean();
};

export const getValuation = async (tenantId, storeId = null) => {
  const match = { tenantId: new mongoose.Types.ObjectId(tenantId) };
  if (storeId && storeId !== "all") {
    match.storeId = new mongoose.Types.ObjectId(storeId);
  }

  const result = await InventoryItem.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: "$quantity" },
        totalCostValuation: { $sum: { $multiply: ["$quantity", { $ifNull: ["$product.costPrice", 0] }] } },
        totalRetailValuation: { $sum: { $multiply: ["$quantity", { $ifNull: ["$product.basePrice", 0] }] } },
        lowStockCount: {
          $sum: {
            $cond: [
              { $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$reorderLevel"] }] },
              1,
              0,
            ],
          },
        },
        outOfStockCount: {
          $sum: {
            $cond: [{ $lte: ["$quantity", 0] }, 1, 0],
          },
        },
      },
    },
  ]);

  return result[0] || {
    totalItems: 0,
    totalQuantity: 0,
    totalCostValuation: 0,
    totalRetailValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };
};

export const adjustStock = async (tenantId, payload) => {
  let item;
  const targetId = payload.id || payload.inventoryId;
  const updateDoc = {};

  if (payload.quantity !== undefined) {
    updateDoc.$set = { ...updateDoc.$set, quantity: Number(payload.quantity) };
  } else if (payload.adjustmentQty !== undefined) {
    updateDoc.$inc = { quantity: Number(payload.adjustmentQty) };
  }

  if (payload.reorderLevel !== undefined) {
    updateDoc.$set = { ...updateDoc.$set, reorderLevel: Number(payload.reorderLevel) };
  }

  if (targetId) {
    item = await InventoryItem.findOneAndUpdate(
      { _id: targetId, tenantId },
      updateDoc,
      { new: true }
    );
  } else {
    item = await InventoryItem.findOneAndUpdate(
      {
        tenantId,
        storeId: payload.storeId,
        productId: payload.productId,
        variantSku: payload.variantSku || null,
      },
      updateDoc,
      { new: true, upsert: true }
    );
  }

  cacheService.invalidate(["inventory", "products", "reports"], tenantId);
  return item;
};

export default { listInventory, getLowStock, adjustStock, getValuation };
