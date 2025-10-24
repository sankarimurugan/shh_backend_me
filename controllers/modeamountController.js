const modeamountModel = require("../models/modeamountModel");
const { sendResponse } = require("../utils/responseHandler");

const modeofamount = async (req, res) => {
  try {
    const { amountname } = req.body;

    if (!amountname) {
      return res.status(400).json({ error: "amount name are required" });
    }
    const amountsource = await modeamountModel.findOne({ amountname });
    if (amountsource) {
      return res.status(400).json({ error: "amountname already exists" });
    }
    const newmodeamount = await modeamountModel.create({
      amountname,
    });

    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "mode of amount created successfully",
      data: newmodeamount,
    });
  } catch (error) {
    console.error("Error Showing amountname:", error);
    return res.status(500).json({ error: "Internal server Error" });
  }
};

const getamountname = async (req, res) => {
  try {
    const getamount = await modeamountModel.find().lean().select("amountname");
    return sendResponse(
      res,
      200,
      "success",
      "Amount names retrieved successfully",
      getamount
    );
  } catch (error) {
    console.error(`Error in getamountname:`, error);
    return sendResponse(
      res,
      500,
      "error",
      "Internal server error",
      process.env.NODE_ENV === "development" ? error.message : undefined
    );
  }
};

const getamountbyId = async (req, res) => {
  try {
    const getamountid = await modeamountModel.findById();
    return res.status(200).json({
      status_code: 200,
      status: "success",
      data: getamountid,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const editamountname = async (req, res) => {
  try {
    const { id } = req.params;
    const editamount = req.body;

    const editamountname = await modeamountModel.findByIdAndUpdate(
      id,
      editamount,
      { new: true }
    );
    if (!editamountname) {
      res.status(400).json({ error: "this modeamount not Found" });
    }
    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "Modeofamount updated successfully",
      data: editamountname,
    });
  } catch (error) {
    console.error("Error updating lead:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteamount = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteamount = req.body;

    const deletedamount = await modeamountModel.findByIdAndDelete(
      id,
      deleteamount,
      { new: true }
    );

    if (!deletedamount) {
      return res.status(404).json({ error: "deleted amount" });
    }
    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "amount deleted successfully",
      data: deletedamount,
    });
  } catch (error) {
    console.error("Error updating amount:", error);
    return res.status(500).json({ error: "Internal server Error" });
  }
};

module.exports = {
  modeofamount,
  getamountname,
  getamountbyId,
  editamountname,
  deleteamount,
};
