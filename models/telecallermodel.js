const mongoose = require("mongoose");

const telecallerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    profileimage: { type: String },
    _id: { type: String },

    otp: { type: String },
    otpExpires: { type: Number },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Add pre-save middleware to generate staff_id
telecallerSchema.pre("save", async function (next) {
  // Only generate staff_id if it's a new document or staff_id is not set
  if (this.isNew || !this._id) {
    try {
      // Count existing telecallers to generate sequential ID
      const count = await mongoose.model("Telecaller").countDocuments();
      // Format: SHHT followed by 3-digit number padded with zeros
      this._id = `SHHT${(count + 1).toString().padStart(3, "0")}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Telecaller = mongoose.model("Telecaller", telecallerSchema);
module.exports = Telecaller;
