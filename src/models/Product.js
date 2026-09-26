import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  size: { type: String, default: "" },
  color: { type: String, default: "" },
  sku: { type: String, default: "" },
  barcode: { type: String, default: "" },
  additionalPrice: { type: Number, default: 0 },
});

const productSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      default: "",
      trim: true,
    },
    barcode: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    costPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: "pcs",
      trim: true,
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
    batchNumber: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// High performance compound & text search indexes
productSchema.index({ tenantId: 1, storeId: 1, category: 1 });
productSchema.index({ tenantId: 1, storeId: 1, barcode: 1 });
productSchema.index({ tenantId: 1, storeId: 1, batchNumber: 1 });
productSchema.index({ tenantId: 1, storeId: 1, isActive: 1, isDeleted: 1 });
productSchema.index({ tenantId: 1, storeId: 1, isDeleted: 1, createdAt: -1 });
productSchema.index(
  { name: "text", sku: "text", barcode: "text" },
  { weights: { name: 3, barcode: 2, sku: 2 }, name: "product_text_search" }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
