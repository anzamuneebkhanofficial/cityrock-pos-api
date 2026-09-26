import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 1000 },
});

counterSchema.statics.getNextSequence = async function (counterName) {
  const ret = await this.findByIdAndUpdate(
    counterName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return ret.seq;
};

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;
