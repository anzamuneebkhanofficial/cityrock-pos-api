import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    storeType: {
      type: String,
      enum: [
        "clothing",
        "shoes",
        "general_retail",
        "supermarket",
        "pharmacy",
        "kiryana",
        "electronics",
        "cosmetics",
        "bakery",
        "jewelry",
        "stationery",
        "hardware",
      ],
      default: "general_retail",
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    storeCode: {
      type: String,
      default: "",
      trim: true,
    },
    receiptWidth: {
      type: String,
      enum: ["80mm", "58mm"],
      default: "80mm",
    },
    footerNote: {
      type: String,
      default: "Thank you for shopping with us!",
      trim: true,
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    isMainStore: {
      type: Boolean,
      default: false,
    },
    parentStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

// Performance compound indexes
storeSchema.index({ tenantId: 1, isActive: 1 });
storeSchema.index({ tenantId: 1, isDeleted: 1 });
storeSchema.index({ parentStoreId: 1 });
storeSchema.index({ tenantId: 1, isMainStore: 1 });
storeSchema.index({ tenantId: 1, parentStoreId: 1 });

const Store = mongoose.model("Store", storeSchema);

export default Store;
