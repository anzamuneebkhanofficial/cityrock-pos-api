import PurchaseOrder from "../models/PurchaseOrder.js";
import InventoryItem from "../models/InventoryItem.js";
import { cacheService } from "../config/cache.js";

export const list = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 9 } = req.query;
    const skip = (page - 1) * limit;
    const query = { tenantId: req.tenantId };
    if (status && status !== "all") query.status = status;

    const [pos, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate("supplierId", "name contactPerson phone")
        .populate("storeId", "name storeCode")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseOrder.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: pos,
      meta: { total, page: parseInt(page, 10), limit: parseInt(limit, 10) },
    });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const { storeId, supplierId, items = [] } = req.body;
    const count = await PurchaseOrder.countDocuments({ tenantId: req.tenantId });
    const poNumber = `PO-${String(count + 1).padStart(4, "0")}`;

    const totalAmount = items.reduce((acc, item) => acc + (Number(item.totalCost) || 0), 0);

    const po = await PurchaseOrder.create({
      tenantId: req.tenantId,
      storeId,
      supplierId,
      poNumber,
      items,
      totalAmount,
      status: "draft",
    });

    cacheService.invalidate(["purchase_orders"], req.tenantId);
    res.status(201).json({ success: true, message: "Purchase order created", data: po });
  } catch (error) {
    next(error);
  }
};

export const receive = async (req, res, next) => {
  try {
    // Atomic status transition check to prevent double-restocking race condition
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId, status: { $ne: "received" } },
      { $set: { status: "received", receivedAt: new Date() } },
      { new: true }
    );

    if (!po) {
      const existing = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
      if (existing && existing.status === "received") {
        return res.status(400).json({
          success: false,
          message: "This purchase order has already been received. Inventory has already been restocked.",
        });
      }
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }

    // Restock items in store inventory matching variant SKU
    for (const item of po.items) {
      await InventoryItem.findOneAndUpdate(
        {
          tenantId: req.tenantId,
          storeId: po.storeId,
          productId: item.productId,
          variantSku: item.variantSku || null,
        },
        { $inc: { quantity: Math.max(0, Number(item.quantity || 0)) } },
        { upsert: true }
      );
    }

    cacheService.invalidate(["purchase_orders", "inventory", "reports"], req.tenantId);
    res.status(200).json({ success: true, message: "Purchase order marked as received and stock updated", data: po });
  } catch (error) {
    next(error);
  }
};

export default { list, create, receive };
