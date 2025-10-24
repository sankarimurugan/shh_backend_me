const { required } = require('joi');
const mongoose = require('mongoose');

const telepaySchema = new mongoose.Schema({
    data: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Leadupload',
        required: true
    },
    paymentmethood: { 
        type: String, 
        required: true,
        // Remove the enum validation to allow any payment method from modeamountModel
    },
    image: { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: "Pending"
    }
}, { timestamps: true });

// Add a custom validator to check if the payment method exists in modeamountModel
telepaySchema.path('paymentmethood').validate({
    validator: async function(value) {
        try {
            // If it's one of the hardcoded values, allow it for backward compatibility
            const hardcodedValues = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Credit Card'];
            if (hardcodedValues.includes(value)) {
                return true;
            }
            
            // Otherwise, check if it exists in the modeamountModel
            const ModeofAmount = mongoose.model('ModeofAmount');
            const method = await ModeofAmount.findOne({ amountname: value });
            return !!method; // Return true if the method exists
        } catch (error) {
            console.error('Error validating payment method:', error);
            return false;
        }
    },
    message: props => `\`${props.value}\` is not a valid payment method`
});

module.exports = mongoose.model('telecallerpayment', telepaySchema);