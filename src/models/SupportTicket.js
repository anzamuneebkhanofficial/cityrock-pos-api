import mongoose from "mongoose";

const ticketMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  senderName: {
    type: String,
    required: true,
  },
  senderRole: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  isInternal: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const supportTicketSchema = new mongoose.Schema(
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
    ticketNumber: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["general", "billing", "bug", "hardware", "technical", "feature"],
      default: "general",
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    messages: {
      type: [ticketMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Performance compound indexes matching MongoDB
supportTicketSchema.index({ tenantId: 1, storeId: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ assignedAgent: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
