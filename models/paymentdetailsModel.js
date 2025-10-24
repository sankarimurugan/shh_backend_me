const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Leadupload",
      required: true,
    },
    lead_id: {
      type: String,
      unique: true,  // This already creates an index
    },
    name: { type: String, required: true },
    interested_course: {
      type: {
        addcourse: { type: String },
        amount: { type: Number },
        duration: { type: String },
      },
      required: true,
    },
    amount: { type: String, required: true },
    paid_amount: { type: String, required: true },
    balance_amount: { type: String, required: true },
    mode_of_amount: { type: String, required: true },
    email: { type: String, required: true },
    phonenumber: { type: String, required: true },
    transaction_id: { type: String },
    payment_status: { type: String },
    remarks: { type: String },
  },
  { timestamps: true }
);

paymentSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.model("Paymentdetails").countDocuments();
    this.lead_id = `SHH${(count + 1).toString().padStart(4, "0")}`;
  }
  next();
});

// Add compound index for frequent queries
paymentSchema.index({ leadId: 1, createdAt: -1 });
// Remove the duplicate lead_id index since it's already created by unique: true

// Add indexes for frequently queried fields
paymentSchema.index({ email: 1 });
paymentSchema.index({ phonenumber: 1 });
paymentSchema.index({ createdAt: -1 });

// Add validation for email and phone
paymentSchema.path('email').validate(function(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}, 'Invalid email format');

paymentSchema.path('phonenumber').validate(function(phone) {
    return /^\d{10}$/.test(phone);
}, 'Invalid phone number format');

module.exports = mongoose.model("Paymentdetails", paymentSchema);
