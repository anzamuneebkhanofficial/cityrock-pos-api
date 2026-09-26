import mongoose from "mongoose";

const paymentAccountSchema = new mongoose.Schema(
  {
    providerType: {
      type: String,
      enum: ["bank", "wallet", "easypaisa", "jazzcash", "sadapay", "nayapay", "other"],
      default: "bank",
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
    },
    accountTitle: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    iban: {
      type: String,
      default: "",
      trim: true,
    },
    instructions: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const PaymentAccount = mongoose.model("PaymentAccount", paymentAccountSchema);

export default PaymentAccount;
