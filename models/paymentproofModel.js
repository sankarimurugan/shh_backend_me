const mongoose = require("mongoose");

const payproofleadSchema = new mongoose.Schema(
  {
    leaduploads: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentProof", payproofleadSchema);
