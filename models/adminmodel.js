const mongoose = require('mongoose');


const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    profileimage: { type: String ,default: '' },
    password: { type: String, required: true },
    otp: String,
    otpExpires: Date
    // confirmpassword:{type: String, required:true},
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;


