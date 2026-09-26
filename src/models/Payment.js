import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "annual"],
      default: "monthly",
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "PKR",
    },
    paymentAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentAccount",
      default: null,
    },
    status: {
      type: String,
      enum: ["awaiting_proof", "pending_review", "confirmed", "rejected"],
      default: "pending_review",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    proofFileUrl: {
      type: String,
      default: null,
    },
    referenceNote: {
      type: String,
      default: "",
    },
    transactionId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },
    whatsappConfirmed: {
      type: Boolean,
      default: false,
      index: true,
    },
    whatsappConfirmedAt: {
      type: Date,
      default: null,
    },
    whatsappNumber: {
      type: String,
      default: "",
      trim: true,
    },
    adminCrossCheckedWhatsApp: {
      type: Boolean,
      default: false,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    gatewayTransactionId: {
      type: String,
      default: null,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    periodCovered: {
      start: { type: Date, default: null },
      end: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ tenantId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
