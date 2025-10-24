const express = require('express');
const { registerAdmin, loginAdmin, getAdminProfile, sendOtp,
    verifyOtp, resetPassword, updateAdmin, logoutUser } = require('../controllers/admincontroller');
const multer = require("multer");
const path = require("path");
const router = express.Router();
const fs = require("fs");
const { authMiddleware } = require('../middlewares/authmiddleware');

const storage = multer.diskStorage({
    destination: "./uploads", 
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Routes
router.post('/admin/register', upload.single('profileimage'), registerAdmin);
// Change this line
router.put('/admin/update/:id', upload.single('image'), updateAdmin);
router.post('/admin/login', loginAdmin);
router.post('/admin/send-otp', sendOtp);
router.post('/admin/verify-otp', verifyOtp);
router.post('/admin/reset-password/:email', resetPassword); // Remove authMiddleware
router.get('/admin/:id', getAdminProfile);
router.post('/admin/logout', logoutUser);

module.exports = router;
