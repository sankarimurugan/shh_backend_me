const { catchAsync, AppError } = require("../utils/errorHandler");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const Telecaller = require("../models/telecallermodel");
const path = require("path");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const nodemailer = require("nodemailer");
const BASE_URL = process.env.BASE_URL || "http://localhost:9099/";
const { sendResponse } = require("../utils/responseHandler");

const addTelecaller = async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;

    if (!name || !email || !phone || !role || !password) {
      return res.status(400).json({
        message: "All fields except image are required",
        received: { name, email, phone, role, password },
      });
    }

    const existingTelecaller = await Telecaller.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingTelecaller) {
      return res
        .status(400)
        .json({ error: "Telecaller with this email or phone already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let imageName = null;
    if (req.file) {
      imageName = req.file.filename;
      const imagePath = path.join(__dirname, "../public", imageName);

      // Move the uploaded file to /public
      await fs.promises.rename(req.file.path, imagePath);
    }

    const newTelecaller = new Telecaller({
      name,
      email,
      phone,
      role,
      password: hashedPassword,
      profileimage: imageName,
    });

    await newTelecaller.save();

    const profileimageURL = imageName
      ? `${process.env.BASE_URL}/public/${imageName}`
      : null;

    res.status(201).json({
      message: "Staff added successfully",
      telecaller: {
        _id: newTelecaller._id,
        name,
        email,
        phone,
        role,
        profileimageURL,
      },
    });
  } catch (error) {
    console.error("Error registering telecaller:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message || error });
  }
};

const getAllTelecaller = catchAsync(async (req, res) => {
  const telecallers = await Telecaller.find()
    .select("name email phone role profileimage active staff_id") // Add staff_id to select
    .lean();

  return sendResponse(
    res,
    200,
    "success",
    "Telecallers retrieved successfully",
    telecallers
  );
});

const getAllTelecallerByID = async (req, res) => {
  try {
    const telecaller = await Telecaller.findOne({ _id: req.params.id });
    if (!telecaller) {
      return res.status(404).json({ message: "Telecaller not found" });
    }

    const telecallerObj = telecaller.toObject();
    telecallerObj.profileimage = telecaller.profileimage
      ? `${process.env.BASE_URL}/public/${telecaller.profileimage}`
      : null; // Changed to null instead of default image

    res.status(200).json(telecallerObj);
  } catch (error) {
    console.error("Error fetching telecaller by ID:", error);
    res.status(500).json({ message: "Error fetching telecaller", error });
  }
};

// Create a new function specifically for admin updates
const updateTelecallerByAdmin = async (req, res) => {
  try {
    const { name, email, phone, role, password, active } = req.body;
    const { id } = req.params;
    const image = req.file ? req.file.filename : null;

    const BASE_URL = process.env.BASE_URL || "http://localhost:9099";

    const existingTelecaller = await Telecaller.findById(id);
    if (!existingTelecaller) {
      return res.status(404).json({ message: "Telecaller not found" });
    }

    const updateData = { name, email, phone, role };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (typeof active !== "undefined") {
      updateData.active = active;
    }

    if (image) {
      updateData.profileimage = image;

      // Delete old image
      if (existingTelecaller.profileimage) {
        const oldPath = path.join(__dirname, "../public", existingTelecaller.profileimage);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Move new image
      const newPath = path.join(__dirname, "../public", image);
      if (req.file.path !== newPath) {
        await fs.promises.rename(req.file.path, newPath);
      }
    }

    const updatedTelecaller = await Telecaller.findByIdAndUpdate(id, updateData, { new: true });

    const profileimageUrl = updatedTelecaller.profileimage
      ? `${BASE_URL}/public/${updatedTelecaller.profileimage}`
      : null;

    res.json({
      message: "Telecaller updated successfully",
      data: {
        _id: updatedTelecaller._id,
        name: updatedTelecaller.name,
        email: updatedTelecaller.email,
        phone: updatedTelecaller.phone,
        role: updatedTelecaller.role,
        active: updatedTelecaller.active,
        profileimage: profileimageUrl,
      },
    });
  } catch (error) {
    console.error("Error updating telecaller:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const updateTelecaller = updateTelecallerByAdmin;

const deleteTelecaller = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTelecaller = await Telecaller.findByIdAndDelete(id);

    if (!deletedTelecaller) {
      return res.status(404).json({ message: "Telecaller not found" });
    }

    if (deletedTelecaller.image) {
      const imagePath = path.join(
        __dirname,
        "../uploads",
        deletedTelecaller.image
      );
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    res.json({ message: "Telecaller deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting telecaller", error });
  }
};

const loginTelecaller = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const telecaller = await Telecaller.findOne({ email });
    if (!telecaller) {
      return res.status(400).json({ message: "Telecaller not found" });
    }

    // Check if telecaller is active
    if (!telecaller.active) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, telecaller.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: telecaller._id.toString(),  // <-- use MongoDB ObjectId as string
        role: "Telecaller",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(200).json({
      message: "Login successful",
      telecaller: {
        id: telecaller._id,
        name: telecaller.name,
        email: telecaller.email,
        phone: telecaller.phone,
        role: telecaller.role,
        active: telecaller.active, // Include active status in response
        image: telecaller.image,
        id: telecaller.id, // Add staff_id to response
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};

// const  logoutTellecaller = async (req, res) => {
//     try {
//         res.status(200).json({ message: 'Logout successful. Please remove token from client.' });
//     } catch (error) {
//         console.error('Logout error:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

const logoutTellecaller = async (req, res) => {
  try {
    if (!req.session) {
      return res.status(200).json({ message: "No active session to logout." });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res
          .status(500)
          .json({ message: "Error logging out. Please try again." });
      }
      res.clearCookie("connect.sid"); // Clear the session cookie
      res.status(200).json({ message: "Logout successful." });
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error during logout." });
  }
};

const sendOtpToTelecaller = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const telecaller = await Telecaller.findOne({ email });
    if (!telecaller)
      return res.status(404).json({ message: "Telecaller not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    telecaller.otp = otp;
    telecaller.otpExpires = otpExpires;

    await telecaller.save();

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
      subject: "SHH Telecaller Password Reset OTP",
      text: `Your OTP for resetting your password is: ${otp}`,
    };

    console.log("mailOptions", mailOptions);

    await transporter.sendMail(mailOptions);
    res.json({ message: "OTP sent to telecaller email" });
  } catch (error) {
    console.error("Failed to send OTP:", error);
    res.status(500).json({ message: "Failed to send OTP", error });
  }
};

const verifyTelecallerOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP are required" });

  try {
    const telecaller = await Telecaller.findOne({ email });

    if (!telecaller) {
      return res.status(400).json({ message: "Telecaller not found" });
    }

    if (String(telecaller.otp) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (telecaller.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    res.json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("OTP verification failed:", error);
    res.status(500).json({ message: "OTP verification failed", error });
  }
};

const resetTelecallerPassword = async (req, res) => {
  const { newPassword } = req.body;
  const { email } = req.params;

  if (!newPassword) {
    return res.status(400).json({ message: "New password is required" });
  }

  try {
    const telecaller = await Telecaller.findOne({ email });

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

module.exports = {
  addTelecaller,
  getAllTelecaller,
  getAllTelecallerByID,
  updateTelecaller,
  updateTelecallerByAdmin, // Add this
  deleteTelecaller, // Make sure this is defined
  loginTelecaller,
  logoutTellecaller,
  sendOtpToTelecaller,
  verifyTelecallerOtp,
  resetTelecallerPassword,
};
