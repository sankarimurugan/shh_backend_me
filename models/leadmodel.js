const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phonenumber: { type: String, required: true },
  status: { type: String, default: 'Enquiry' },
   assignedto: { 
     type: mongoose.Schema.Types.Mixed, // Changed from ObjectId to Mixed
     ref: 'Telecaller',
     get: function(val) {
       return val;
     },
     set: function(val) {
       // If it's a valid ObjectId, keep it as is
       if (mongoose.Types.ObjectId.isValid(val) && String(val).length === 24) {
         return val;
       }
       // Otherwise return it as a string
       return val;
     }
   },
  assignedby: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  telecaller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Telecaller',
    required: true
  },
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);