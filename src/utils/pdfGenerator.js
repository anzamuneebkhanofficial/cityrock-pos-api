import PDFDocument from "pdfkit";

/**
 * Streams an invoice PDF to the Express response
 */
export const generateInvoicePDF = (sale, store, res) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=Invoice-${sale.invoiceNumber}.pdf`);

  doc.pipe(res);

  // Header
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(store?.name || "CityRock Retail", { align: "center" })
    .moveDown(0.2);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#555555")
    .text(store?.address || "", { align: "center" })
    .text(`City: ${store?.city || ""} | Tel: ${store?.phone || "N/A"}`, { align: "center" })
    .moveDown(1);

  doc
    .strokeColor("#cccccc")
    .lineWidth(1)
    .moveTo(40, doc.y)
    .lineTo(555, doc.y)
    .stroke()
    .moveDown(1);

  // Invoice Meta
  const leftCol = 40;
  const rightCol = 350;
  const topMetaY = doc.y;

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text(`Invoice No: ${sale.invoiceNumber}`, leftCol, topMetaY)
    .font("Helvetica")
    .text(`Date: ${new Date(sale.createdAt).toLocaleString()}`, leftCol, topMetaY + 16)
    .text(`Cashier: ${sale.cashierId?.name || "Staff"}`, leftCol, topMetaY + 32);

  doc
    .font("Helvetica-Bold")
    .text(`Customer: ${sale.customerSnapshot?.name || "Walk-in Customer"}`, rightCol, topMetaY)
    .font("Helvetica")
    .text(`Payment: ${(sale.paymentMethod || "CASH").toUpperCase()}`, rightCol, topMetaY + 16)
    .text(`Status: ${(sale.status || "COMPLETED").toUpperCase()}`, rightCol, topMetaY + 32);

  doc.y = topMetaY + 60;
  doc.moveDown(1);

  // Table Header
  const tableTop = doc.y;
  doc
    .rect(40, tableTop, 515, 22)
    .fill("#f3f4f6")
    .stroke();

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#111827")
    .text("#", 48, tableTop + 6)
    .text("Item / Description", 80, tableTop + 6)
    .text("Price (PKR)", 320, tableTop + 6, { width: 70, align: "right" })
    .text("Qty", 395, tableTop + 6, { width: 40, align: "center" })
    .text("Total (PKR)", 445, tableTop + 6, { width: 100, align: "right" });

  let curY = tableTop + 26;

  (sale.items || []).forEach((item, index) => {
    const desc = item.productName + (item.variantLabel ? ` (${item.variantLabel})` : "");
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#374151")
      .text(`${index + 1}`, 48, curY)
      .text(desc, 80, curY, { width: 230 })
      .text(Number(item.unitPrice).toLocaleString(), 320, curY, { width: 70, align: "right" })
      .text(String(item.quantity), 395, curY, { width: 40, align: "center" })
      .text(Number(item.lineTotal).toLocaleString(), 445, curY, { width: 100, align: "right" });

    curY += 22;
  });

  doc
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .moveTo(40, curY)
    .lineTo(555, curY)
    .stroke();

  curY += 10;

  // Summary
  const summaryX = 350;
  doc
    .fontSize(10)
    .font("Helvetica")
    .text("Subtotal:", summaryX, curY)
    .text(`PKR ${(sale.subtotal || sale.total).toLocaleString()}`, 445, curY, { width: 100, align: "right" });
  curY += 16;

  if (sale.cartDiscount > 0) {
    doc
      .text("Discount:", summaryX, curY)
      .text(`- PKR ${Number(sale.cartDiscount).toLocaleString()}`, 445, curY, { width: 100, align: "right" });
    curY += 16;
  }

  if (sale.tax > 0) {
    doc
      .text("Tax:", summaryX, curY)
      .text(`PKR ${Number(sale.tax).toLocaleString()}`, 445, curY, { width: 100, align: "right" });
    curY += 16;
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Grand Total:", summaryX, curY)
    .text(`PKR ${Number(sale.total).toLocaleString()}`, 445, curY, { width: 100, align: "right" });
  curY += 22;

  if (sale.amountPaid) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("Amount Paid:", summaryX, curY)
      .text(`PKR ${Number(sale.amountPaid).toLocaleString()}`, 445, curY, { width: 100, align: "right" });
    curY += 16;
    doc
      .text("Change Given:", summaryX, curY)
      .text(`PKR ${Number(sale.changeGiven || 0).toLocaleString()}`, 445, curY, { width: 100, align: "right" });
  }

  // Footer note
  doc
    .moveDown(4)
    .fontSize(10)
    .font("Helvetica-Oblique")
    .fillColor("#6b7280")
    .text(store?.footerNote || "Thank you for shopping with us! Please come again.", { align: "center" });

  doc.end();
};

export default { generateInvoicePDF };
