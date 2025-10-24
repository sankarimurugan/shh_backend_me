const coursesModel = require("../models/coursesModel");
const { sendResponse } = require("../utils/responseHandler");
const courses = async (req, res) => {
  try {
    const { addcourse, amount, duration } = req.body;

    if (!addcourse || !amount || !duration) {
      return res.status(400).json({ error: "course name are required" });
    }
    const addcoursed = await coursesModel.findOne({ addcourse });
    if (addcoursed) {
      return res.status(400).json({ error: "Courses name are already given" });
    }
    const newcoursename = await coursesModel.create({
      addcourse,
      amount,
      duration,
    });
    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "courses added successfuilly",
      data: newcoursename,
    });
  } catch (error) {
    console.error("Error showing course:", error);
    return res.status(500).json({ error: "Internal server Error" });
  }
};

const getcoursename = async (req, res) => {
  try {
    const getcourse = await coursesModel.find();
    return res.status(200).json({
      status_code: 200,
      status: "success",
      data: getcourse,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const editcoursename = async (req, res) => {
  try {
    const { id } = req.params;
    const editcourse = req.body;
    const editcoursename = await coursesModel.findByIdAndUpdate(
      id,
      editcourse,
      { new: true }
    );

    if (!editcoursename) {
      res.status(400).json({ error: "Course name not found " });
    }
    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "Edit course updated successfully",
      data: editcoursename,
    });
  } catch (error) {
    console.error("Error updating course", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deletecourse = async (req, res) => {
  try {
    const { id } = req.params;
    const deletecourse = req.body;

    const deletecourses = await coursesModel.findByIdAndDelete(
      id,
      deletecourse,
      { new: true }
    );

    if (!deletecourses) {
      return res.status(404).json({ error: "course not found" });
    }
    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "courses deleted successfully",
      data: deletecourses,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return res.status(500).json({ error: "Internal Server error" });
  }
};

module.exports = { courses, getcoursename, editcoursename, deletecourse };
