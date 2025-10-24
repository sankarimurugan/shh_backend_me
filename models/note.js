const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  text: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const noteSchema = new mongoose.Schema({
  leadId: String,
  messages: [messageSchema]
}, { timestamps: true });

module.exports = mongoose.model("Note", noteSchema);

