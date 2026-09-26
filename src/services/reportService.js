import mongoose from "mongoose";
import Sale from "../models/Sale.js";
import InventoryItem from "../models/InventoryItem.js";

export const getSalesSummary = async (
  tenantId,
  period = "today",
  storeId = null,
  customStartDate = null,
  customEndDate = null
) => {
  const now = new Date();
  let startDate = new Date();
  let endDate = null;

  if (customStartDate || customEndDate) {
    if (customStartDate) startDate = new Date(customStartDate);
    if (customEndDate) {
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    }
  } else if (period === "today") {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "yesterday") {
    startDate.setDate(now.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date();
    endDate.setDate(now.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "week" || period === "7days") {
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "month" || period === "30days") {
    startDate.setDate(now.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "quarter" || period === "90days") {
    startDate.setDate(now.getDate() - 90);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "half_year" || period === "180days") {
    startDate.setDate(now.getDate() - 180);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "year" || period === "365days") {
    startDate.setDate(now.getDate() - 365);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "all") {
    startDate = null;
  }

  const matchStage = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "completed",
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }

  if (storeId && storeId !== "all") {
    matchStage.storeId = new mongoose.Types.ObjectId(storeId);
  }

  const summary = await Sale.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$total" },
        totalTransactions: { $sum: 1 },
        totalDiscount: { $sum: "$cartDiscount" },
        avgOrderValue: { $avg: "$total" },
      },
    },
  ]);

  const stats = summary[0] || {
    totalRevenue: 0,
    totalTransactions: 0,
    totalDiscount: 0,
    avgOrderValue: 0,
  };

  // Group by date for chart trend
  const trend = await Sale.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Karachi" } },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Financial COGS & Gross Profit Accounting calculation
  const financialResult = await Sale.aggregate([
    { $match: matchStage },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $group: {
        _id: null,
        totalCost: {
          $sum: {
            $multiply: [
              "$items.quantity",
              { $ifNull: [{ $arrayElemAt: ["$product.costPrice", 0] }, 0] },
            ],
          },
        },
      },
    },
  ]);

  const cogs = financialResult[0]?.totalCost || 0;
  const netRevenue = (stats.totalRevenue || 0) - (stats.totalDiscount || 0);
  const grossProfit = netRevenue - cogs;
  const grossMargin = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 100) : 0;

  return {
    ...stats,
    netRevenue,
    costOfGoodsSold: cogs,
    grossProfit,
    grossMargin,
    period,
    trend: trend.map((t) => ({ date: t._id, revenue: t.revenue, orders: t.orders })),
  };
};


export const getTopProducts = async (tenantId, limit = 5) => {
  return Sale.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: "completed" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        productName: { $first: "$items.productName" },
        totalSold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.lineTotal" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: Number(limit) },
  ]);
};

export const getCashierPerformance = async (tenantId) => {
  return Sale.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: "completed" } },
    {
      $group: {
        _id: "$cashierId",
        totalSales: { $sum: "$total" },
        totalTransactions: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "cashier",
      },
    },
    { $unwind: "$cashier" },
    {
      $project: {
        cashierName: "$cashier.name",
        cashierEmail: "$cashier.email",
        totalSales: 1,
        totalTransactions: 1,
      },
    },
    { $sort: { totalSales: -1 } },
  ]);
};

export const getCategoryShare = async (tenantId, period = "month") => {
  return Sale.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: "completed" } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: { $ifNull: ["$product.category", "Uncategorized"] },
        totalRevenue: { $sum: "$items.lineTotal" }
      }
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        totalRevenue: 1
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 6 } // top 5 + other could be handled on frontend
  ]);
};

export const getInventoryLevels = async (tenantId) => {
  return InventoryItem.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        productName: "$product.name",
        quantity: 1,
        reorderLevel: 1
      }
    },
    { $sort: { quantity: 1 } },
    { $limit: 10 }
  ]);
};

export const getStoresComparison = async (tenantId, period = "month") => {
  return Sale.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: "completed" } },
    {
      $group: {
        _id: "$storeId",
        totalRevenue: { $sum: "$total" },
        totalOrders: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "stores",
        localField: "_id",
        foreignField: "_id",
        as: "store"
      }
    },
    { $unwind: "$store" },
    {
      $project: {
        _id: 0,
        storeName: "$store.name",
        totalRevenue: 1,
        totalOrders: 1
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
};

export const getTopCustomers = async (tenantId, limit = 10) => {
  return Sale.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: "completed", customerId: { $ne: null } } },
    {
      $group: {
        _id: "$customerId",
        totalSpent: { $sum: "$total" },
        orderCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "customers",
        localField: "_id",
        foreignField: "_id",
        as: "customer"
      }
    },
    { $unwind: "$customer" },
    {
      $project: {
        _id: 0,
        customerName: "$customer.name",
        totalSpent: 1,
        orderCount: 1
      }
    },
    { $sort: { totalSpent: -1 } },
    { $limit: Number(limit) }
  ]);
};

export const getSalesByHour = async (tenantId, targetDate) => {
  const dateStr = targetDate || new Date().toISOString().split('T')[0];
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);

  const results = await Sale.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: "completed", createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $hour: { date: "$createdAt", timezone: "Asia/Karachi" } },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Fill all 24 hours
  const hourlyData = Array.from({ length: 24 }).map((_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    revenue: 0,
    orders: 0
  }));

  results.forEach(r => {
    hourlyData[r._id] = {
      hour: `${r._id.toString().padStart(2, '0')}:00`,
      revenue: r.revenue,
      orders: r.orders
    };
  });

  return hourlyData;
};

export default {
  getSalesSummary,
  getTopProducts,
  getCashierPerformance,
  getCategoryShare,
  getInventoryLevels,
  getStoresComparison,
  getTopCustomers,
  getSalesByHour
};
