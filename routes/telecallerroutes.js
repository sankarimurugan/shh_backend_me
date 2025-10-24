const express = require('express');
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const { addTelecaller, getAllTelecaller, getAllTelecallerByID, updateTelecaller, deleteTelecaller, loginTelecaller, logoutTellecaller, sendOtpToTelecaller,
    verifyTelecallerOtp,
    resetTelecallerPassword } = require('../controllers/telecallercontroller');
const { authMiddleware } = require('../middlewares/authmiddleware');

const router = express.Router()

const storage = multer.diskStorage({
    destination: "./public",
    filename: (req, file, cb) => {
        return cb(
            null,
            `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
        );
    },
});
const upload = multer({
    storage: storage,
});

router.route("/addtelecaller").post(upload.single("image"), addTelecaller);
router.post('/addlogintelecaller', loginTelecaller)
router.get('/getalltelecallers', getAllTelecaller);
router.get('/telecallers/:id', getAllTelecallerByID);
router.put('/edittelecallers/:id', upload.single('image'), updateTelecaller);
router.delete('/telecallers/:id', deleteTelecaller);
router.post('/logintelecaller', loginTelecaller);
router.post('/logout', logoutTellecaller)
router.post('/telecaller/send-otp', sendOtpToTelecaller);
router.post('/telecaller/verify-otp', verifyTelecallerOtp);
router.post('/telecaller/reset-password/:email', resetTelecallerPassword);

module.exports = router;