const mongoose = require("mongoose");
const Note = require("../models/note");
const { sendResponse } = require("../utils/responseHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Optimize note creation with validation
exports.createNote = async (req, res) => {
  try {
    const { leadId, message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return sendResponse(res, 400, "error", "Invalid lead ID format");
    }

    const note = await Note.create({
      leadId: new mongoose.Types.ObjectId(leadId),
      messages: [{ text: message, timestamp: new Date() }],
    });

    return sendResponse(res, 201, "success", "Note added successfully", note);
  } catch (error) {
    console.error("Error creating note:", error);
    return sendResponse(res, 500, "error", "Internal server error");
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    console.log("Updating Message ID:", messageId);

    const note = await Note.findOneAndUpdate(
      { "messages._id": new mongoose.Types.ObjectId(messageId) },
      {
        $set: {
          "messages.$.text": text,
          "messages.$.timestamp": new Date(),
        },
      },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Notes updated successfully", note });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating Note", error: error.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { messageId } = req.params;

    console.log("Deleting Message ID:", messageId);

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid Message ID" });
    }

    const note = await Note.findOneAndUpdate(
      { "messages._id": new mongoose.Types.ObjectId(messageId) },
      {
        $pull: { messages: { _id: new mongoose.Types.ObjectId(messageId) } },
      },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Message deleted successfully", note });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting message", error: error.message });
  }
};

exports.getAllNotes = async (req, res) => {
  try {
    const { leadId } = req.params;

    const notes = await Note.find({
      leadId: new mongoose.Types.ObjectId(leadId),
    }).select("messages");

    if (!notes.length) {
      // Return 200 with empty array instead of 404
      return res.status(200).json({ 
        message: "No notes found for this lead", 
        notes: [] 
      });
    }

    const allMessages = notes.reduce(
      (acc, note) => acc.concat(note.messages),
      []
    );

    res.status(200).json({
      leadId,
      totalMessages: allMessages.length,
      messages: allMessages,
    });
  } catch (error) {
    console.error("Error in getAllNotes:", error);
    res
      .status(500)
      .json({ message: "Error fetching messages", error: error.message });
  }
};

exports.getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found for this ID" });
    }

    res.status(200).json(note);
  } catch (error) {
    console.error("Error fetching note by ID:", error);
    res
      .status(500)
      .json({ message: "Error fetching note", error: error.message });
  }
};
