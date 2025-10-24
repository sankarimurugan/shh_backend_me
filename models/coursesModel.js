const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    addcourse: { type: String, required: true },
    amount: { type: String, required: true },
    duration: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Courses", courseSchema);
