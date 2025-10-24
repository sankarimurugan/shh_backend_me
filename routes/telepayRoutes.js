const express = require('express');
const { posttelepayproof, edittelepayproof, deletepayproof, gettelepayproof, getTelepayProofsByLeadId, getTelepayProofByLeadIdAndProofId, getAllTelePayProofByID, getTelePayProofByID, getproofcontroller } = require('../controllers/telepayproofController');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authMiddleware } = require('../middlewares/authmiddleware');
const { handleMulterError } = require('../middlewares/multerErrorHandler');
const router = express.Router();

// Match the storage configuration with the controller
const storage = multer.diskStorage({
  destination: "./public", // Keep this as public
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// Configure multer with limits and file filtering like in the controller
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Allow only 1 file per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WEBP are allowed'));
    }
  }
});

// Add debugging middleware to see what's being received
// Use upload.single("image") to match what the controller expects
router.route("/addtelecaller").post(
  authMiddleware, // Add authentication middleware here
  upload.single("image"),
  handleMulterError,
  (req, res, next) => {
    console.log('Request body:', req.body);
    console.log('File:', req.file);
    posttelepayproof(req, res, next);
  }
);

// Update this route to use authentication middleware
router.get("/telecaller/view", authMiddleware, gettelepayproof);
router.get("/view/:id", getTelePayProofByID);
router.get('/getallproof', authMiddleware, getproofcontroller);
// Update this route to use authentication middleware
router.get('/telecaller/:leadId', authMiddleware, getTelepayProofsByLeadId);
router.get('/telecaller/:leadId/:proofId', getTelepayProofByLeadIdAndProofId);

// Use upload.single("image") for these routes too and add error handling
router.route("/telecaller/edit/:id").put(
  authMiddleware, // Add this line
  upload.single("image"),
  handleMulterError,
  edittelepayproof
);
router.route("/telecaller/delete/:id").delete(
  upload.single("image"),
  handleMulterError,
  deletepayproof
);

module.exports = router;