const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  lead_id: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phonenumber: { type: String, required: true, unique: true },
  status: {
    type: String,
    default: "Enquiry",
  },
  source: { type: String, required: true },
  assignedby: { type: String },
  assignedto: { 
    type: mongoose.Schema.Types.Mixed, 
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
  followupdate: { type: String },
  followuptime: { type: String },
  interested_course: {
    type: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Courses' }, // Add this line
      addcourse: { type: String},
      amount: { type: Number },
      duration: { type: String },
    },
    required: true
  },
  enrollement_date: { 
    type: String,
    get: function(val) {
      return val; // Return as is when retrieving
    },
    set: function(val) {
      if (!val) return null;
      
      // If it's already in YYYY-MM-DD format, return as is
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return val;
      }
      
      // Otherwise, format it
      const date = new Date(val);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // Months are 0-indexed
      const day = date.getDate();
      
      // Format as YYYY-MM-DD with padded zeros
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  },
  notes: { type: String },  
  degree: { type: String },
  passedout: { type: String },
  college_name: { type: String },
  address: { type: String },
  pincode: { type: String },
  state: {
    type: mongoose.Schema.Types.Mixed,  // Can be either string or object
    get: function(val) {
      return typeof val === 'object' ? val : { name: val };
    },
    set: function(val) {
      return typeof val === 'string' ? { name: val } : val;
    }
  },
  city: {
    type: mongoose.Schema.Types.Mixed,  // Can be either string or object
    get: function(val) {
      return typeof val === 'object' ? val : { name: val };
    },
    set: function(val) {
      return typeof val === 'string' ? { name: val } : val;
    }
  },
  DOB: { type: String },
  Walkin: { type: String }
}, { timestamps: true });

leadSchema.pre('save', async function (next) {
  if (this.isNew) {
    const Lead = mongoose.model('Leadupload', leadSchema);
    const count = await Lead.countDocuments();
    this.lead_id = `SHH${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Add this near the end of your schema definition, before the model export
leadSchema.pre('findOneAndDelete', async function(next) {
  const leadId = this.getQuery()._id;
  
  try {
    // Delete related payment details
    await mongoose.model('Paymentdetails').deleteMany({ leadId });
    
    // Delete related payment proofs
    await mongoose.model('telecallerpayment').deleteMany({ data: leadId });
    
    // Delete related notes
    await mongoose.model('Note').deleteMany({ leadId });
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Leadupload', leadSchema);
