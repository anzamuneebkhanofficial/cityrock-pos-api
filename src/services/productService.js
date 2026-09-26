import Product from "../models/Product.js";
import InventoryItem from "../models/InventoryItem.js";
import Store from "../models/Store.js";
import { cacheService } from "../config/cache.js";

export const listProducts = async (tenantId, { search = "", category = "all", status = "all", page = 1, limit = 9 }) => {
  const skip = (page - 1) * limit;
  const query = { tenantId, isDeleted: { $ne: true } };

  if (category && category !== "all") query.category = category;
  if (status && status !== "all") {
    query.isActive = status === "active" || status === "true";
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { barcode: { $regex: search, $options: "i" } },
    ];
  }

  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(query),
  ]);

  return { products, total, page, limit };
};

export const getProductById = async (tenantId, productId) => {
  const product = await Product.findOne({ _id: productId, tenantId, isDeleted: { $ne: true } }).lean();
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  return product;
};

export const createProduct = async (tenantId, data) => {
  const {
    name,
    basePrice,
    costPrice = 0,
    category = "",
    sku = "",
    barcode = "",
    unit = "pcs",
    batchNumber = "",
    variants = [],
    initialStock = 0,
  } = data;

  if (!name || basePrice === undefined) {
    const error = new Error("Product name and selling price (basePrice) are required");
    error.statusCode = 400;
    throw error;
  }

  const product = await Product.create({
    tenantId,
    name,
    basePrice,
    costPrice,
    category,
    sku,
    barcode,
    unit: unit || "pcs",
    batchNumber: batchNumber || "",
    variants: variants || [],
    isActive: true,
  });

  // Automatically provision inventory for all tenant stores
  const stores = await Store.find({ tenantId, isDeleted: { $ne: true } }).select("_id isMainStore").lean();
  const inventoryDocs = [];

  for (const store of stores) {
    const stockQty = store.isMainStore ? Number(initialStock) || 0 : 0;
    if (variants && variants.length > 0) {
      for (const v of variants) {
        inventoryDocs.push({
          tenantId,
          storeId: store._id,
          productId: product._id,
          variantSku: v.sku || null,
          quantity: stockQty,
          reorderLevel: 10,
          batchNumber: batchNumber || "",
        });
      }
    } else {
      inventoryDocs.push({
        tenantId,
        storeId: store._id,
        productId: product._id,
        variantSku: null,
        quantity: stockQty,
        reorderLevel: 10,
        batchNumber: batchNumber || "",
      });
    }
  }

  if (inventoryDocs.length > 0) {
    await InventoryItem.insertMany(inventoryDocs, { ordered: false }).catch(() => {});
  }

  // Invalidate products and inventory caches for this tenant
  cacheService.invalidate(["products", "inventory"], tenantId);

  return product;
};

export const updateProduct = async (tenantId, productId, data) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, tenantId, isDeleted: { $ne: true } },
    { $set: data },
    { new: true }
  );

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  cacheService.invalidate(["products", "inventory"], tenantId);
  return product;
};

export const deleteProduct = async (tenantId, productId) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, tenantId },
    { $set: { isDeleted: true, isActive: false } },
    { new: true }
  );

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  cacheService.invalidate(["products", "inventory"], tenantId);
  return product;
};

export default {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
