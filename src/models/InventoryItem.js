import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
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
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variantSku: {
      type: String,
      default: null,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      default: 10,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    batchNumber: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index prevents duplicate inventory records for same store & product/variant
inventoryItemSchema.index(
  { tenantId: 1, storeId: 1, productId: 1, variantSku: 1 },
  { unique: true }
);
inventoryItemSchema.index({ tenantId: 1, storeId: 1, quantity: 1 });
inventoryItemSchema.index({ tenantId: 1, batchNumber: 1 });
inventoryItemSchema.index({ expiryDate: 1 });

const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);

export default InventoryItem;
