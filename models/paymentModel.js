const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    item_id: {
      type: String,
    },
    price: {
      type: Number,
    },
    payment_id: {
      type: String,
    },
    paymentType: {
      type: String,
    },
    status: {
      type: Boolean,
      default: true,
    },
    expirationDate: {
      type: Date,
      default: undefined,
    },
    validViews: {
      type: Number,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payments", paymentSchema);
