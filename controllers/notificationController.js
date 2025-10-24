const { catchAsync, AppError } = require("../utils/errorHandler");
const { sendResponse } = require("../utils/responseHandler");
const Notification = require("../models/notificationModel");
const mongoose = require('mongoose');
// Add these two missing imports
const leadmanageModel = require('../models/leadmanageModel');
const BASE_URL = process.env.BASE_URL || "http://localhost:9099";

// Get all notifications for admin
const getAdminNotifications = catchAsync(async (req, res) => {
    // Check if user is admin
    const { role } = req.user;
    if (role !== 'Admin') {
        throw new AppError("Not authorized to access admin notifications", 403);
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get filter parameters
    const { read, type } = req.query;
    let query = {};

    // Apply filters if provided
    if (read !== undefined) {
        query.isRead = read === 'true';
    }

    if (type) {
        query.type = type;
    }
    
    // MODIFY THIS LINE: Only show payment_proof notifications to admins
    query.type = 'payment_proof';
    
    // Remove the line that excludes telecallerId notifications
    // query['relatedData.telecallerId'] = { $exists: false };

    // Get total count for pagination
    const total = await Notification.countDocuments(query);

    // Get notifications with populated creator info
    const notifications = await Notification.find(query)
        .populate({
            path: 'createdBy',
            select: 'name email phone profileimage',
            model: 'Telecaller'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    // Enhance notifications with additional details
    const enhancedNotifications = await Promise.all(notifications.map(async (notification) => {
        const notificationObj = notification.toObject();

        // Inside the enhancedNotifications Promise.all mapping function
        if (notification.type === 'payment_proof' && notification.relatedModel === 'telecallerpayment') {
            try {
                // Get the full payment proof details
                const paymentProof = await mongoose.model('telecallerpayment').findById(notification.relatedId)
                    .populate({
                        path: 'data',
                        // Include more fields from the lead data
                        select: 'name email phonenumber lead_id status interested_course address city state pincode college_name degree passedout source followupdate followuptime enrollement_date createdAt updatedAt',
                        model: 'Leadupload'
                    })
                    .lean();

                if (paymentProof) {
                    // Include more details from the payment proof
                    notificationObj.paymentDetails = {
                        _id: paymentProof._id,
                        paymentMethod: paymentProof.paymentmethood,
                        status: paymentProof.status,
                        image: paymentProof.image ? `${BASE_URL}/public/${paymentProof.image}` : `${BASE_URL}/uploads/default.jpg`,
                        createdAt: paymentProof.createdAt,
                        updatedAt: paymentProof.updatedAt,
                        lead: paymentProof.data
                    };
                    
                    // Add payment summary information if needed
                    if (paymentProof.data && paymentProof.data._id) {
                        // Get telecaller info for this lead
                        const lead = await leadmanageModel.findById(paymentProof.data._id)
                            .populate({
                                path: 'assignedto',
                                select: 'name email phone profileimage',
                                model: 'Telecaller'
                            })
                            .lean();
                        
                        if (lead && lead.assignedto) {
                            notificationObj.paymentDetails.telecaller = lead.assignedto;
                        }
                        
                        // Add payment summary information
                        const payments = await mongoose.model('Paymentdetails').find({ leadId: paymentProof.data._id })
                            .lean()
                            .select('amount paid_amount balance_amount');
                        
                        // Get course amount from interested_course
                        const courseAmount = paymentProof.data.interested_course?.amount || 0;
                        
                        // Calculate payment summary
                        const paymentSummary = payments.reduce((acc, payment) => {
                            acc.totalAmount += parseFloat(payment.amount || 0);
                            acc.paidAmount += parseFloat(payment.paid_amount || 0);
                            return acc;
                        }, { totalAmount: 0, paidAmount: 0 });
                        
                        // If no payments found, use course amount as balance
                        const totalPaid = paymentSummary.paidAmount;
                        const balanceAmount = courseAmount - totalPaid;
                        
                        // Add payment summary to the object
                        notificationObj.paymentDetails.payment_summary = {
                            course_amount: courseAmount,
                            total_amount: paymentSummary.totalAmount || courseAmount,
                            paid_amount: totalPaid,
                            balance_amount: balanceAmount >= 0 ? balanceAmount : 0,
                            fullyPaid: balanceAmount <= 0
                        };
                    }
                }
            } catch (error) {
                console.error('Error fetching payment proof details:', error);
            }
        }

        return notificationObj;
    }));

    return sendResponse(res, 200, "success", "Notifications retrieved successfully", {
        notifications: enhancedNotifications,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    });
});

// Mark notifications as read
const markNotificationsAsRead = catchAsync(async (req, res) => {
    const { role } = req.user;
    if (role !== 'Admin') {
        throw new AppError("Not authorized to update admin notifications", 403);
    }

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new AppError("Please provide notification IDs to mark as read", 400);
    }

    // Convert string IDs to ObjectIds
    const objectIds = ids.map(id => 
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
    );

    // Update notifications
    const result = await Notification.updateMany(
        { _id: { $in: objectIds } },
        { $set: { isRead: true } }
    );

    return sendResponse(res, 200, "success", "Notifications marked as read", {
        modifiedCount: result.modifiedCount
    });
});

// Get unread count
const getUnreadCount = catchAsync(async (req, res) => {
    const { role } = req.user;
    if (role !== 'Admin') {
        throw new AppError("Not authorized to access admin notifications", 403);
    }

    const count = await Notification.countDocuments({ isRead: false });

    return sendResponse(res, 200, "success", "Unread notification count retrieved", {
        unreadCount: count
    });
});

// Get payment proof details from notification
const getPaymentProofFromNotification = catchAsync(async (req, res) => {
    const { notificationId } = req.params;
    
    // Find the notification
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
        throw new AppError("Notification not found", 404);
    }
    
    if (notification.type !== 'payment_proof' || notification.relatedModel !== 'telecallerpayment') {
        throw new AppError("This notification is not for a payment proof", 400);
    }
    
    // Get the payment proof details
    const paymentProof = await mongoose.model('telecallerpayment').findById(notification.relatedId)
        .populate({
            path: 'data',
            select: 'name email phonenumber lead_id status interested_course address city state pincode college_name degree passedout source followupdate followuptime enrollement_date createdAt updatedAt',
            model: 'Leadupload'
        });
        
    if (!paymentProof) {
        throw new AppError("Payment proof not found", 404);
    }
    
    const paymentProofObj = paymentProof.toObject();
    
    // Format image URL
    const BASE_URL = process.env.BASE_URL || "http://localhost:9099";
    paymentProofObj.image = paymentProof.image 
        ? `${BASE_URL}/public/${paymentProof.image}` 
        : `${BASE_URL}/uploads/default.jpg`;
    
    // Get telecaller info for this lead
    if (paymentProofObj.data && paymentProofObj.data._id) {
        const lead = await leadmanageModel.findById(paymentProofObj.data._id)
            .populate({
                path: 'assignedto',
                select: 'name email phone profileimage',
                model: 'Telecaller'
            })
            .lean();
        
        if (lead && lead.assignedto) {
            paymentProofObj.telecaller = lead.assignedto;
        }
        
        // Add payment summary information
        const payments = await mongoose.model('Paymentdetails').find({ leadId: paymentProofObj.data._id })
            .lean()
            .select('amount paid_amount balance_amount');
        
        // Get course amount from interested_course
        const courseAmount = paymentProofObj.data.interested_course?.amount || 0;
        
        // Calculate payment summary
        const paymentSummary = payments.reduce((acc, payment) => {
            acc.totalAmount += parseFloat(payment.amount || 0);
            acc.paidAmount += parseFloat(payment.paid_amount || 0);
            return acc;
        }, { totalAmount: 0, paidAmount: 0 });
        
        // If no payments found, use course amount as balance
        const totalPaid = paymentSummary.paidAmount;
        const balanceAmount = courseAmount - totalPaid;
        
        // Add payment summary to the object
        paymentProofObj.payment_summary = {
            course_amount: courseAmount,
            total_amount: paymentSummary.totalAmount || courseAmount,
            paid_amount: totalPaid,
            balance_amount: balanceAmount >= 0 ? balanceAmount : 0,
            fullyPaid: balanceAmount <= 0
        };
    }
    
    // Mark notification as read
    notification.isRead = true;
    await notification.save();
    
    return sendResponse(res, 200, "success", "Payment proof details retrieved", {
        notification,
        paymentProof: paymentProofObj
    });
});

// Mark a single notification as read
const markSingleNotificationAsRead = catchAsync(async (req, res) => {
    const { role } = req.user;
    if (role !== 'Admin') {
        throw new AppError("Not authorized to update admin notifications", 403);
    }

    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Please provide a valid notification ID", 400);
    }

    // Update the notification
    const notification = await Notification.findByIdAndUpdate(
        id,
        { $set: { isRead: true } },
        { new: true }
    );

    if (!notification) {
        throw new AppError("Notification not found", 404);
    }

    return sendResponse(res, 200, "success", "Notification marked as read", {
        notification
    });
});

// Mark a single telecaller notification as read
const markSingleTelecallerNotificationAsRead = catchAsync(async (req, res) => {
    const { role, id } = req.user;
    if (role !== 'Telecaller' && role !== 'Admin') {
        throw new AppError("Not authorized to update telecaller notifications", 403);
    }
    
    const notificationId = req.params.id;
    
    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new AppError("Please provide a valid notification ID", 400);
    }
    
    // Get telecaller ID (either from the logged-in user or from query parameter)
    let telecallerId = id;
    
    // If admin is accessing telecaller notifications, require telecallerId parameter
    if (role === 'Admin') {
        telecallerId = req.query.telecallerId;
        if (!telecallerId) {
            throw new AppError("Admin must provide telecallerId parameter", 400);
        }
        console.log('Admin marking telecaller notification as read for telecallerId:', telecallerId);
    }

    // Convert telecallerId to string to ensure consistent comparison
    const teleCallerIdString = telecallerId.toString();
    
    // FIXED: Only use string comparison, no ObjectId conversion for custom IDs
    const notification = await Notification.findOneAndUpdate(
        { 
            _id: notificationId,
            $or: [
                { 'relatedData.telecallerId': teleCallerIdString },
                { createdBy: telecallerId }
            ]
        },
        { $set: { isRead: true } },
        { new: true }
    );

    if (!notification) {
        throw new AppError("Notification not found or not authorized to update", 404);
    }

    return sendResponse(res, 200, "success", "Notification marked as read", {
        notification
    });
});

// Get notifications for telecaller
const getTelecallerNotifications = catchAsync(async (req, res) => {
    // Check if user is telecaller or admin
    const { role, id } = req.user;
    console.log('User role:', role, 'User ID:', id);
    
    // Get telecaller ID (either from the logged-in user or from query parameter)
    let telecallerId = id;
    
    // If admin is accessing telecaller notifications, require telecallerId parameter
    if (role === 'Admin') {
        telecallerId = req.query.telecallerId;
        if (!telecallerId) {
            throw new AppError("Admin must provide telecallerId parameter", 400);
        }
        console.log('Admin accessing telecaller notifications for telecallerId:', telecallerId);
    } else if (role !== 'Telecaller') {
        throw new AppError("Not authorized to access telecaller notifications", 403);
    }

    // Convert telecallerId to string to ensure consistent comparison
    const teleCallerIdString = telecallerId.toString();
    console.log('Using telecallerId (as string):', teleCallerIdString);

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get filter parameters
    const { read } = req.query;
    
    // FIXED: Removed ObjectId conversion for custom telecaller IDs
    let query = {
        $or: [
            { 'relatedData.telecallerId': teleCallerIdString },
            { createdBy: telecallerId }
        ],
        // Add this line to exclude payment_proof notifications
        type: { $ne: 'payment_proof' }
    };

    // Apply read filter if provided
    if (read !== undefined) {
        query.isRead = read === 'true';
    }

    console.log('Telecaller notification query:', JSON.stringify(query));
    console.log('Telecaller ID:', telecallerId);

    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    console.log('Total matching notifications:', total);

    // Get notifications
    const notifications = await Notification.find(query)
        .populate({
            path: 'createdBy',
            select: 'name email phone profileimage',
            model: 'Admin' // Changed from Telecaller to Admin since admins assign leads
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    console.log('Found notifications:', notifications.length);
    
    // ADDED: Log all notification IDs and types for debugging
    if (notifications.length > 0) {
        notifications.forEach(notification => {
            console.log('Notification ID:', notification._id, 
                        'Type:', notification.type, 
                        'RelatedModel:', notification.relatedModel,
                        'TelecallerId in relatedData:', notification.relatedData?.telecallerId);
        });
    } else {
        console.log('No notifications found for this query');
    }

    // Enhance notifications with lead details
    const enhancedNotifications = await Promise.all(notifications.map(async (notification) => {
        const notificationObj = notification.toObject();
        console.log('Processing notification:', notification._id, 'relatedModel:', notification.relatedModel);

        // Add lead details based on the relatedModel
        if (notification.relatedModel === 'Lead') {
            try {
                // Use the Lead model
                const Lead = require('../models/leadmodel');
                const lead = await Lead.findById(notification.relatedId).lean();
                
                if (lead) {
                    notificationObj.leadDetails = lead;
                    console.log('Found lead details for notification:', notification._id);
                } else {
                    console.log('Lead not found for notification:', notification._id, 'relatedId:', notification.relatedId);
                }
            } catch (error) {
                console.error('Error fetching lead details:', error);
            }
        } else if (notification.relatedModel === 'Leadupload') {
            try {
                // Try to find the lead in the Leadupload model
                const lead = await mongoose.model('Leadupload').findById(notification.relatedId).lean();
                
                if (lead) {
                    notificationObj.leadDetails = lead;
                    console.log('Found Leadupload details for notification:', notification._id);
                } else {
                    console.log('Leadupload not found for notification:', notification._id, 'relatedId:', notification.relatedId);
                }
            } catch (error) {
                console.error('Error fetching Leadupload details:', error);
            }
        }

        return notificationObj;
    }));

    return sendResponse(res, 200, "success", "Telecaller notifications retrieved successfully", {
        notifications: enhancedNotifications,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    });
});

// Add a function to create lead assignment notifications
const createLeadAssignmentNotification = catchAsync(async (leadId, telecallerId, adminId) => {
    try {
        console.log('Creating notification for lead:', leadId, 'telecaller:', telecallerId, 'admin:', adminId);
        
        // Get lead details
        const lead = await mongoose.model('Leadupload').findById(leadId).lean();
        
        if (!lead) {
            console.error('Lead not found for notification creation, leadId:', leadId);
            return null;
        }
        
        console.log('Found lead for notification:', lead.name || 'Unnamed lead');
        
        // Create notification message
        const message = `New lead "${lead.name || 'Unnamed'}" (${lead.email || lead.phonenumber || 'No contact'}) has been assigned to you`;
        
        // Create notification
        // Create notification
        const notification = await Notification.create({
            type: 'lead_created',
            message: message,
            relatedId: leadId,
            relatedModel: 'Leadupload',
            createdBy: adminId, // Admin who assigned the lead
            relatedData: {
                telecallerId: telecallerId.toString(), // Convert to string for consistent comparison
                leadId: leadId
            },
            isRead: false,
            createdAt: new Date()
        });
        
        console.log('Notification created successfully:', notification._id);
        return notification;
    } catch (error) {
        console.error('Error creating lead assignment notification:', error);
        return null;
    }
});

// Mark telecaller notifications as read
const markTelecallerNotificationsAsRead = catchAsync(async (req, res) => {
    const { role, id } = req.user;
    if (role !== 'Telecaller') {
        throw new AppError("Not authorized to update telecaller notifications", 403);
    }

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new AppError("Please provide notification IDs to mark as read", 400);
    }

    // Convert string IDs to ObjectIds
    const objectIds = ids.map(id => 
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
    );

    // Update notifications - only those related to this telecaller
    const result = await Notification.updateMany(
        { 
            _id: { $in: objectIds },
            $or: [
                { createdBy: id },
                { 'relatedData.telecallerId': id }
            ]
        },
        { $set: { isRead: true } }
    );

    return sendResponse(res, 200, "success", "Notifications marked as read", {
        modifiedCount: result.modifiedCount
    });
});

// Test endpoint to create a notification for a telecaller
const createTestNotification = catchAsync(async (req, res) => {
    const { role, id } = req.user;
    console.log('createTestNotification - User role:', role, 'User ID:', id);
    
    // Allow both Admin and Telecaller roles
    if (role !== 'Admin' && role !== 'Telecaller') {
        throw new AppError("Not authorized to create test notifications", 403);
    }
    
    const { telecallerId, leadId } = req.body;
    console.log('createTestNotification - Request body:', req.body);
    
    if (!telecallerId) {
        throw new AppError("telecallerId is required", 400);
    }
    
    if (!leadId) {
        throw new AppError("leadId is required", 400);
    }
    
    // Create a test notification
    console.log('createTestNotification - Before calling createLeadAssignmentNotification');
    const notification = await createLeadAssignmentNotification(leadId, telecallerId, id);
    console.log('createTestNotification - After calling createLeadAssignmentNotification, result:', notification ? 'Success' : 'Null');
    
    if (!notification) {
        console.log('createTestNotification - Notification creation failed, throwing error');
        throw new AppError("Failed to create test notification", 500);
    }
    
    console.log('createTestNotification - Sending success response');
    return sendResponse(res, 200, "success", "Test notification created successfully", {
        notification
    });
});

module.exports = {
    getAdminNotifications,
    markNotificationsAsRead,
    getUnreadCount,
    getPaymentProofFromNotification,
    markSingleNotificationAsRead,
    getTelecallerNotifications,  // Make sure this is included
    markSingleTelecallerNotificationAsRead,
    markTelecallerNotificationsAsRead,
    createTestNotification,
    createLeadAssignmentNotification
};