import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    monthlyPrice: {
      type: Number,
      required: true,
    },
    annualPrice: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "PKR",
    },
    maxStores: {
      type: Number,
      default: 1,
    },
    discountPercent: {
      type: Number,
      default: 17,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

planSchema.index({ isActive: 1, sortOrder: 1 });

const Plan = mongoose.model("Plan", planSchema);

export default Plan;
