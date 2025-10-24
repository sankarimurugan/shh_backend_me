const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    ref: "Telecaller",
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["checked_in", "checked_out"],
    default: "checked_out",
  },
  checkIn: {
    type: String,
    default: null,
  },
  checkOut: {
    type: String,
    default: null,
  },
});

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
