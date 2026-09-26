import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      default: "Pakistan",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "trial", "grace_period", "suspended", "cancelled"],
      default: "trial",
      index: true,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    timezone: {
      type: String,
      default: "Asia/Karachi",
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    cnic: {
      type: String,
      default: "",
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ status: 1, createdAt: -1 });

const Tenant = mongoose.model("Tenant", tenantSchema);

export default Tenant;
