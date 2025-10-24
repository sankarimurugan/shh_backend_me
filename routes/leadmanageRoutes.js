const express = require("express");
const multer = require("multer");
const {
  leadcreate,
  getleadmanage,
  getleadmanageById,
  getLeadsByTelecallerId,
  getAllLeads,
  editleadmanage,
  deleteleadmanage,
  debugLeadAssignments,
  bulkLeadUpload, // Add this line
} = require("../controllers/leadmanageController");
const { authMiddleware } = require("../middlewares/authmiddleware");

const router = express.Router();
const upload = multer();

// Telecaller and Admin shared routes
router.post("/addleadmanage", authMiddleware, leadcreate);
router.get("/getlead/:id", authMiddleware, getleadmanageById);
router.put("/editlead/:id", authMiddleware, editleadmanage);
router.delete("/delete/:id", authMiddleware, deleteleadmanage);

// Telecaller's lead list - shows only their assigned leads
router.get("/getAlllead", authMiddleware, getleadmanage);

// Admin's all lead list - shows all leads
router.get("/admin/getAllLeads", authMiddleware, getAllLeads);

// Keep this route for backward compatibility if needed
router.get(
  "/leads/telecaller/:telecallerId",
  authMiddleware,
  getLeadsByTelecallerId
);

// Add this for debugging
router.get("/debug-assignments", authMiddleware, debugLeadAssignments);

// Bulk lead upload route
router.post(
  "/bulk-upload",
  authMiddleware,
  upload.single("file"),
  bulkLeadUpload
);

module.exports = router;
