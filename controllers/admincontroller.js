const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Admin = require("../models/adminmodel");
const { sendResponse } = require("../utils/responseHandler");
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"), false);
  }
};
const upload = multer({ storage, fileFilter });

const registerAdmin = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const profileimage = req.file ? req.file.filename : null;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: "All fields except profile are required",
        received: { name, email, phone, password },
      });
    }
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingAdmin) {
      return res
        .status(400)
        .json({ error: "Admin with this email or phone already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let imageName = null;
    if (req.file) {
      imageName = req.file.filename;
      const imagePath = path.join(__dirname, "../public", imageName);

      fs.rename(req.file.path, imagePath, (err) => {
        if (err) {
          console.error("Error saving image file", err);
          return res
            .status(500)
            .json({ message: "Error saving the profile image" });
        }
      });
    }

    const newAdmin = new Admin({
      name,
      email,
      phone,
      password: hashedPassword,
      profileimage: imageName,
    });

    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    console.error("Error registering admin: ", error);
    res.status(500).json({
      message: "Error registering admin",
      error: error.message || error,
    });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;
    const { name, email, phone, password } = req.body;

    // Handle both field names (image and profileimage)
    const profileimage = req.file ? req.file.filename : undefined;

    // Log the request for debugging
    console.log("Update request:", {
      adminId,
      body: req.body,
      file: req.file,
    });

    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (profileimage) updateData.profileimage = profileimage;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if the image exists in uploads directory first
    const fs = require("fs");
    const uploadsPath = path.join(
      __dirname,
      "../uploads",
      updatedAdmin.profileimage || ""
    );
    const publicPath = path.join(
      __dirname,
      "../public",
      updatedAdmin.profileimage || ""
    );

    let imageUrl = null;
    if (updatedAdmin.profileimage) {
      // Check if file exists in uploads directory
      if (fs.existsSync(uploadsPath)) {
        imageUrl = `${process.env.BASE_URL}/uploads/${updatedAdmin.profileimage}`;
      }
      // Check if file exists in public directory
      else if (fs.existsSync(publicPath)) {
        imageUrl = `${process.env.BASE_URL}/public/${updatedAdmin.profileimage}`;
      }
    }

    res.json({
      message: "Admin updated successfully",
      admin: {
        id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        phone: updatedAdmin.phone,
        profileimage: imageUrl,
      },
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({
      message: "Failed to update admin",
      error: error.message || error,
    });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { 
        id: admin._id,
        role: 'Admin' // Role is correctly added to token
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );
    res.json({
      message: "Login successful",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};

const getAdminProfile = async (req, res) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  try {
    const admin = await Admin.findById(id).select(
      "name email phone profileimage"
    );
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const adminData = admin.toObject();

    // Check if profileimage exists before trying to join paths
    if (admin.profileimage) {
      // Check if the image exists in uploads directory first
      const fs = require("fs");
      const uploadsPath = path.join(__dirname, "../uploads", admin.profileimage);
      const publicPath = path.join(__dirname, "../public", admin.profileimage);

      // Check if file exists in uploads directory
      if (fs.existsSync(uploadsPath)) {
        adminData.profileimage = `${process.env.BASE_URL}/uploads/${admin.profileimage}`;
      }
      // Check if file exists in public directory
      else if (fs.existsSync(publicPath)) {
        adminData.profileimage = `${process.env.BASE_URL}/public/${admin.profileimage}`;
      }
      // If file doesn't exist in either directory
      else {
        adminData.profileimage = null;
      }
    } else {
      adminData.profileimage = null;
    }

    res.json({
      message: "Profile retrieved successfully",
      admin: adminData,
    });
  } catch (error) {
    console.error("Error retrieving admin profile:", error);
    res.status(500).json({ message: "Error retrieving profile", error });
  }
};

const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    admin.otp = otp;
    admin.otpExpires = otpExpires;
    await admin.save();
    const transporter = nodemailer.createTransport({
      host: "mail.saihustlehub.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "SHH Password Reset OTP",
      text: `Your Verify OTP is: ${otp}`,
    };

    console.log("mailOptions", mailOptions);

    await transporter.sendMail(mailOptions);
    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP", error });
  }
};


const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP are required" });

  try {
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }

    if (String(admin.otp) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (admin.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    res.json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("OTP verification failed:", error);
    res.status(500).json({ message: "OTP verification failed", error });
  }
};
const resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  const { email } = req.params;

  if (!newPassword) {
    return res.status(400).json({ message: "New password is required" });
  }

  try {
    const telecaller = await Admin.findOne({ email });

    if (!telecaller) {
      return res.status(404).json({ message: "Telecaller not found" });
    }

    if (telecaller.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    telecaller.password = hashedPassword;

    // Clear OTP after use
    telecaller.otp = null;
    telecaller.otpExpires = null;

    await telecaller.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res
      .status(500)
      .json({ message: "Password reset failed", error: error.message });
  }
};

const logoutUser = async (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ error: "Failed to logout. Try again." });
      }
      res.status(200).json({ message: "Logout successful." });
    });
  } else {
    res.status(200).json({ message: "No active session to destroy." });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  sendOtp,
  verifyOtp,
  resetPassword,
  updateAdmin,
  logoutUser,
  upload,
};
