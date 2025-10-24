const rolesModel = require("../models/rolesModel");
const { sendResponse } = require("../utils/responseHandler");
const addroles = async (req, res) => {
  try {
    const { addroles } = req.body;

    if (!addroles) {
      return res.status(400).json({ error: "Roles name are required" });
    }

    const addroleses = await rolesModel.findOne({ addroles });

    if (addroleses) {
      return res.status(400).json({ error: "Roles name already exists" });
    }
    const newroles = await rolesModel.create({
      addroles,
    });
    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "Roles added successfully",
      dats: newroles,
    });
  } catch (error) {
    console.error("Error showing roles:", error);
    return res.status(500).json({ error: "Internal Seerver Error" });
  }
};

const getrolesname = async (req, res) => {
  try {
    const getroles = await rolesModel.find();
    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "roles viewed successfully",
      data: getroles,
    });
  } catch (error) {
    console.error("Error showing roles", error);
    return res.status(500).json({ error: "Internall server error" });
  }
};

const editRole = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updatedRole = await rolesModel.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!updatedRole) {
      return res.status(404).json({ error: "Role not found" });
    }

    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "Role updated successfully",
      data: updatedRole,
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteroles = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteroles = req.body;

    const deleteroleses = await rolesModel.findByIdAndDelete(id, deleteroles, {
      new: true,
    });

    if (!deleteroleses) {
      return res.status(404).json({ error: "roles not found" });
    }
    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "roles deleted successfully",
      data: deleteroleses,
    });
  } catch (error) {
    console.error("Error updating roles:", error);
    return res.status(500).json({ error: "Internal Server error" });
  }
};

module.exports = { addroles, getrolesname, editRole, deleteroles };
