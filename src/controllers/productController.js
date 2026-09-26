import productService from "../services/productService.js";
import Product from "../models/Product.js";
import { clearCache } from "../middleware/cacheMiddleware.js";
import {
  generateProductTemplate,
  exportProductsExcel,
  parseProductExcelBuffer,
} from "../utils/excelGenerator.js";

export const list = async (req, res, next) => {
  try {
    const { search = "", category = "all", status = "all", page = 1, limit = 9 } = req.query;
    const { products, total } = await productService.listProducts(req.tenantId, {
      search,
      category,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      data: products,
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

export const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.tenantId, req.params.id);
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.fileUrl) data.imageUrl = req.fileUrl;
    const product = await productService.createProduct(req.tenantId, data);
    clearCache("products", req.tenantId, req.activeStoreId);
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.fileUrl) data.imageUrl = req.fileUrl;
    const product = await productService.updateProduct(req.tenantId, req.params.id, data);
    clearCache("products", req.tenantId, req.activeStoreId);
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.tenantId, req.params.id);
    clearCache("products", req.tenantId, req.activeStoreId);
    res.status(200).json({
      success: true,
      message: "Product removed from catalog",
    });
  } catch (error) {
    next(error);
  }
};

export const downloadTemplate = async (req, res, next) => {
  try {
    await generateProductTemplate(res);
  } catch (error) {
    next(error);
  }
};

export const exportExcel = async (req, res, next) => {
  try {
    const products = await Product.find({ tenantId: req.tenantId, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();
    await exportProductsExcel(products, res);
  } catch (error) {
    next(error);
  }
};

export const importExcel = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "No spreadsheet file uploaded" });
    }

    const { validCount, errorCount, errors, rows } = await parseProductExcelBuffer(req.file.buffer);

    for (const row of rows) {
      await productService.createProduct(req.tenantId, row);
    }
    clearCache("products", req.tenantId, req.activeStoreId);

    res.status(200).json({
      success: true,
      message: `Import completed: ${validCount} products imported, ${errorCount} errors.`,
      data: { validCount, errorCount, errors },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  list,
  getProduct,
  create,
  update,
  deleteProduct,
  downloadTemplate,
  exportExcel,
  importExcel,
};
