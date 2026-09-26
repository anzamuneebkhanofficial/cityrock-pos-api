import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
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
    contactPerson: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
    },
    taxNumber: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
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

supplierSchema.index({ tenantId: 1, storeId: 1, name: 1 });
supplierSchema.index({ tenantId: 1, storeId: 1, createdAt: -1 });
supplierSchema.index({ tenantId: 1, storeId: 1, isDeleted: 1, createdAt: -1 });

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;
