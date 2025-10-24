// const express = require("express");
// const router = express.Router();
// const { authMiddleware } = require("../middlewares/authmiddleware");
// const { checkIn, checkOut, getTodayStatus } = require("../controllers/attendanceController.js");

// router.get("/status", authMiddleware, getTodayStatus);
// router.post("/checkin", authMiddleware, checkIn);
// router.post("/checkout", authMiddleware, checkOut);

// module.exports = router;




// const express = require("express");
// const router = express.Router();
// const attendanceController = require("../controllers/attendanceController");
// const { authMiddleware } = require("../middlewares/authmiddleware");

// // router.post("/checkin", authMiddleware, attendanceController.checkIn);
// router.post("/checkin", attendanceController.checkIn);
// router.post("/checkout", authMiddleware, attendanceController.checkOut);
// router.get("/status", authMiddleware, attendanceController.getTodayStatus);
// router.get("/all", authMiddleware, attendanceController.getAllAttendances); 

// module.exports = router;









const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authMiddleware } = require("../middlewares/authmiddleware");
// Telecaller routes
router.post('/checkin', authMiddleware, attendanceController.telecallerCheckIn);
router.post('/checkout', authMiddleware, attendanceController.telecallerCheckOut);
router.get('/status', authMiddleware, attendanceController.getTelecallerTodayStatus);

// Admin route
// Admin routes
// router.get('/admin/all', attendanceController.getAllTelecallerAttendance);
router.get('/admin/:id', attendanceController.getTelecallerAttendanceById);
module.exports = router;
