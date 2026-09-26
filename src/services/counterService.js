import Counter from "../models/Counter.js";

export const getNextSequence = async (counterName) => {
  const counter = await Counter.findByIdAndUpdate(
    counterName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

export const generateInvoiceNumber = async (tenantId, storeCode = "INV") => {
  const prefix = (storeCode || "INV").toUpperCase();
  const counterKey = `invoice_${tenantId}_${prefix}`;
  const seq = await getNextSequence(counterKey);
  return `${prefix}-${seq}`;
};

export default { getNextSequence, generateInvoiceNumber };
