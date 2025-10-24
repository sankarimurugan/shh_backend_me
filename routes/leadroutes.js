const express = require("express");
const {
  getAllLeads,
  createLead,
  getLeadById,
  updateLead,
  deleteLead,
  assignLeadToTelecaller,
} = require("../controllers/leadcontroller");
const { authMiddleware } = require("../middlewares/authmiddleware");

const router = express.Router();

// Protected routes - require authentication
router.get("/", authMiddleware, getAllLeads); // Changed from '/leads'
router.post("/", authMiddleware, createLead); // Changed from '/leads'
router.get("/:id", authMiddleware, getLeadById); // Changed from '/leads/:id'
router.put("/:id", authMiddleware, updateLead); // Changed from '/leads/:id'
router.delete("/:id", authMiddleware, deleteLead); // Changed from '/leads/:id'
router.post("/assign", authMiddleware, assignLeadToTelecaller); // Changed from '/leads/assign'

module.exports = router;
