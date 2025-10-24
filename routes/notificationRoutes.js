const express = require("express");
const router = express.Router();
const {
  getAdminNotifications,
  markNotificationsAsRead,
  getUnreadCount,
  markSingleNotificationAsRead,
  getTelecallerNotifications,
  markTelecallerNotificationsAsRead,
  createTestNotification,
  markSingleTelecallerNotificationAsRead, // Add this import
} = require("../controllers/notificationController");
const authMiddleware = require("../middlewares/authmiddleware");

// All routes require authentication
router.use(authMiddleware.authMiddleware);

// Admin routes
// Get all notifications (admin only)
router.get("/", getAdminNotifications);

// Get unread notification count (admin only)
router.get("/unread-count", getUnreadCount);

// Mark notifications as read (admin only)
router.post("/mark-read", markNotificationsAsRead);

// Mark a single notification as read (admin only)
router.post("/mark-read/:id", markSingleNotificationAsRead);

// Telecaller routes
// Get all notifications for telecaller
router.get("/telecaller", getTelecallerNotifications);

// Mark telecaller notifications as read
router.post("/telecaller/mark-read", markTelecallerNotificationsAsRead);

// Test route to create a notification (admin only)
router.post("/test-notification", createTestNotification);

// Add this route
router.post(
  "/telecaller/mark-read/:id",
  markSingleTelecallerNotificationAsRead
);

module.exports = router;
