import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: { type: String, default: "" },
  variantSku: { type: String, default: null },
  variantLabel: { type: String, default: null },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  discount: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
});

const saleSchema = new mongoose.Schema(
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
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    customerSnapshot: {
      name: { type: String, default: "Walk-in Customer" },
      phone: { type: String, default: "" },
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    items: {
      type: [saleItemSchema],
      required: true,
      validate: [(val) => val.length > 0, "Sale must have at least one item"],
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    cartDiscount: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    changeGiven: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "wallet"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["completed", "returned", "cancelled"],
      default: "completed",
    },
    returnedItems: {
      type: Array,
      default: [],
    },
    returnReason: {
      type: String,
      default: null,
    },
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Performance compound indexes matching MongoDB
saleSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ tenantId: 1, storeId: 1, createdAt: -1 });
saleSchema.index({ tenantId: 1, cashierId: 1, createdAt: -1 });
saleSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
saleSchema.index({ tenantId: 1, idempotencyKey: 1 }, { sparse: true });
saleSchema.index({ customerId: 1, createdAt: -1 });

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;
