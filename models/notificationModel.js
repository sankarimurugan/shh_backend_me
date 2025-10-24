const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['payment_proof', 'lead_created', 'lead_updated'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    relatedModel: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.Mixed,
        ref: 'Telecaller',
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Add this field to your schema if it doesn't exist
    relatedData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);