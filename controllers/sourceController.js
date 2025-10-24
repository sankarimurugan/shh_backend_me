const sourceModel = require("../models/sourceModel");
const { sendResponse } = require("../utils/responseHandler");

const sourcecreate = async (req, res) => {
  try {
    const { sourcename } = req.body;

    if (!sourcename) {
      return sendResponse(res, 400, "error", "Source name is required");
    }

    const existingsource = await sourceModel.findOne({ sourcename }).lean();
    if (existingsource) {
      return sendResponse(res, 400, "error", "Source name already exists");
    }

    const newsource = await sourceModel.create({ sourcename });
    return sendResponse(
      res,
      200,
      "success",
      "Source name created successfully",
      newsource
    );
  } catch (error) {
    console.error(`Error in sourcecreate:`, error);
    return sendResponse(
      res,
      500,
      "error",
      "Internal server error",
      process.env.NODE_ENV === "development" ? error.message : undefined
    );
  }
};

const getsourcename = async (req, res) => {
  try {
    const getsources = await sourceModel.find();
    return res.status(200).json({
      status_code: 200,
      status: "success",
      data: getsources,
    });
  } catch (error) {
    res.status(500).json({ error: error.messaage });
  }
};

const getuserSourceId = async (req, res) => {
  try {
    const sourcename = await sourceModel.findById(
      req.params.id,
      "name, email,phone"
    );
    if (!sourcename) {
      return res.status(404).json({ message: "Telecaller not found" });
    }
    res.json(sourcename);
  } catch (error) {
    res.status(500).json({ message: "Error Fetching telecaller", error });
  }
};

const editsourcename = async (req, res) => {
  try {
    const { id } = req.params;
    const { sourcename } = req.body;

    if (!sourcename) {
      return res.status(400).json({ error: "Source name is required" });
    }

    const updatedSource = await sourceModel.findByIdAndUpdate(
      id,
      { sourcename },
      { new: true } // returns the updated document
    );

    if (!updatedSource) {
      return res.status(404).json({ error: "Source not found" });
    }

    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "Source name updated successfully",
      data: updatedSource,
    });
  } catch (error) {
    console.error("Error updating source:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deletesourcename = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSource = await sourceModel.findByIdAndDelete(id);

    if (!deletedSource) {
      return res.status(404).json({ error: "Source not found" });
    }

    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "Source deleted successfully",
      data: deletedSource,
    });
  } catch (error) {
    console.error("Error deleting source:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  sourcecreate,
  getsourcename,
  getuserSourceId,
  editsourcename,
  deletesourcename,
};
