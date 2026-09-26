import ExcelJS from "exceljs";

/**
 * Generate Product Import Excel Template
 */
export const generateProductTemplate = async (res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");

  sheet.columns = [
    { header: "Name *", key: "name", width: 25 },
    { header: "SKU", key: "sku", width: 15 },
    { header: "Barcode", key: "barcode", width: 18 },
    { header: "Category", key: "category", width: 18 },
    { header: "Base Price *", key: "basePrice", width: 14 },
    { header: "Cost Price", key: "costPrice", width: 14 },
    { header: "Unit", key: "unit", width: 10 },
  ];

  // Sample row
  sheet.addRow({
    name: "Classic Cotton T-Shirt",
    sku: "TSH-BLK-M",
    barcode: "890123456789",
    category: "Clothing",
    basePrice: 1500,
    costPrice: 900,
    unit: "pcs",
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=product-import-template.xlsx");

  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Export Products to Excel
 */
export const exportProductsExcel = async (products, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");

  sheet.columns = [
    { header: "Product ID", key: "_id", width: 26 },
    { header: "Name", key: "name", width: 25 },
    { header: "SKU", key: "sku", width: 15 },
    { header: "Barcode", key: "barcode", width: 18 },
    { header: "Category", key: "category", width: 18 },
    { header: "Base Price (PKR)", key: "basePrice", width: 16 },
    { header: "Cost Price (PKR)", key: "costPrice", width: 16 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Active", key: "isActive", width: 10 },
  ];

  products.forEach((p) => {
    sheet.addRow({
      _id: p._id.toString(),
      name: p.name,
      sku: p.sku || "",
      barcode: p.barcode || "",
      category: p.category || "",
      basePrice: p.basePrice,
      costPrice: p.costPrice || 0,
      unit: p.unit || "pcs",
      isActive: p.isActive ? "Yes" : "No",
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=products-export.xlsx");

  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Export Inventory to Excel
 */
export const exportInventoryExcel = async (items, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventory");

  sheet.columns = [
    { header: "Store Branch", key: "storeName", width: 20 },
    { header: "Product Name", key: "productName", width: 25 },
    { header: "SKU", key: "sku", width: 16 },
    { header: "Barcode", key: "barcode", width: 18 },
    { header: "Stock Qty", key: "quantity", width: 12 },
    { header: "Reorder Alert Level", key: "reorderLevel", width: 18 },
    { header: "Status", key: "status", width: 14 },
  ];

  items.forEach((item) => {
    const qty = item.quantity || 0;
    const reorder = item.reorderLevel || 10;
    const status = qty <= 0 ? "Out of Stock" : qty <= reorder ? "Low Stock" : "Healthy";

    sheet.addRow({
      storeName: item.storeId?.name || "Main Store",
      productName: item.productId?.name || "Unknown",
      sku: item.productId?.sku || "",
      barcode: item.productId?.barcode || "",
      quantity: qty,
      reorderLevel: reorder,
      status,
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=inventory-export.xlsx");

  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Export Sales Report to Excel
 */
export const exportSalesReportExcel = async (sales, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sales Report");

  sheet.columns = [
    { header: "Invoice No", key: "invoiceNumber", width: 16 },
    { header: "Date & Time", key: "date", width: 20 },
    { header: "Store Branch", key: "store", width: 18 },
    { header: "Cashier", key: "cashier", width: 18 },
    { header: "Items Count", key: "itemCount", width: 12 },
    { header: "Subtotal (PKR)", key: "subtotal", width: 16 },
    { header: "Discount (PKR)", key: "discount", width: 16 },
    { header: "Total (PKR)", key: "total", width: 16 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
    { header: "Status", key: "status", width: 14 },
  ];

  sales.forEach((s) => {
    sheet.addRow({
      invoiceNumber: s.invoiceNumber,
      date: new Date(s.createdAt).toLocaleString(),
      store: s.storeId?.name || "Store",
      cashier: s.cashierId?.name || "Staff",
      itemCount: s.items?.length || 0,
      subtotal: s.subtotal || s.total,
      discount: s.cartDiscount || 0,
      total: s.total,
      paymentMethod: (s.paymentMethod || "cash").toUpperCase(),
      status: (s.status || "completed").toUpperCase(),
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=sales-report.xlsx");

  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Parse and validate uploaded Excel buffer for Product Import
 */
export const parseProductExcelBuffer = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];

  const validRows = [];
  const errors = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const name = row.getCell(1).text?.trim();
    const sku = row.getCell(2).text?.trim() || "";
    const barcode = row.getCell(3).text?.trim() || "";
    const category = row.getCell(4).text?.trim() || "General";
    const basePrice = parseFloat(row.getCell(5).text) || 0;
    const costPrice = parseFloat(row.getCell(6).text) || 0;
    const unit = row.getCell(7).text?.trim() || "pcs";

    if (!name) {
      errors.push({ row: rowNumber, message: "Product Name is required" });
      return;
    }
    if (basePrice <= 0) {
      errors.push({ row: rowNumber, message: `Invalid Base Price for '${name}'` });
      return;
    }

    validRows.push({
      name,
      sku,
      barcode,
      category,
      basePrice,
      costPrice,
      unit,
    });
  });

  return {
    validCount: validRows.length,
    errorCount: errors.length,
    errors,
    rows: validRows,
  };
};

export default {
  generateProductTemplate,
  exportProductsExcel,
  exportInventoryExcel,
  exportSalesReportExcel,
  parseProductExcelBuffer,
};
