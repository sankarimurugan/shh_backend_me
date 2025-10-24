const multer = require("multer");
const path = require("path");
const fs = require("fs");
const telepayModel = require("../models/telepayModel");
const leadmanageModel = require("../models/leadmanageModel");
const mongoose = require("mongoose");
const { sendResponse } = require("../utils/responseHandler");
// Add this line to import the Notification model
const Notification = require("../models/notificationModel");

const BASE_URL = process.env.BASE_URL || "http://localhost:9099";

// Helper function to safely handle user ID conversion
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Optimize image upload configuration
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Allow only 1 file per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG and WEBP are allowed"));
    }
  },
});

// POST - Add Telepay Proof
const posttelepayproof = async (req, res) => {
  try {
    const { data, paymentmethood, status } = req.body;
    const image = req.file?.filename;
    const userId = req.user?.id || null;

    // Validate required fields
    if (!data || !image || !paymentmethood || !status) {
      const missingFields = Object.entries({
        data,
        image,
        paymentmethood,
        status,
      }).filter(([, value]) => !value);
      return res.status(400).json({
        status: "error",
        message: "Missing required fields",
        missing: missingFields,
      });
    }

    // Check if the lead exists
    const leadExists = await leadmanageModel.findById(data);
    if (!leadExists) {
      return res.status(404).json({
        status: "error",
        message: "Lead not found. Cannot add payment proof.",
      });
    }

    // Check for first payment
    const existingProofs = await telepayModel.find({ data });
    const isFirstPayment = existingProofs.length === 0;

    // Save the new payment proof
    const newEntry = new telepayModel({
      data,
      image,
      paymentmethood,
      status,
    });
    await newEntry.save();

    // Prepare update data for lead
    const updateData = { status: "Enrollment" };
    if (isFirstPayment) {
      updateData.enrollement_date = new Date();
      console.log(
        `First payment - setting enrollement_date: ${updateData.enrollement_date}`
      );
    }

    // Update lead
    await leadmanageModel.findByIdAndUpdate(data, updateData);

    // Create notification
    const notification = new Notification({
      type: "payment_proof",
      message: `New payment proof added for lead ${leadExists.name} (${leadExists.email})`,
      relatedId: newEntry._id,
      relatedModel: "telecallerpayment",
      createdBy: userId,
      relatedData: {
        telecallerId: leadExists.assignedto?.toString() || null,
        leadId: leadExists._id,
      },
    });
    await notification.save();
    console.log("Notification created:", notification);

    // Construct result with image URL
    const result = newEntry.toObject();
    result.image = image
      ? `${BASE_URL}/public/${image}`
      : `${BASE_URL}/uploads/default.jpg`;

    return res.status(201).json({
      message:
        "Telepay proof added successfully and lead status updated to Enrollment",
      telepayProof: result,
      leadStatus: "Enrollment",
      isFirstPayment,
    });
  } catch (error) {
    console.error("Error in posttelepayproof:", error);
    return sendResponse(
      res,
      500,
      "error",
      "Internal server error",
      process.env.NODE_ENV === "development" ? error.message : undefined
    );
  }
};

// GET - All Telepay Proofs with role-based access control
const gettelepayproof = async (req, res) => {
  try {
    const { role, id } = req.user; // Changed from _id to id to match other functions
    console.log("User role and ID:", { role, id });

    // Validate user ID only if it's supposed to be an ObjectId
    // For custom user IDs like SHHT001, skip ObjectId validation
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    let query = {};

    // If telecaller, show payment proofs for leads assigned to them OR created by them
    if (role === "Telecaller") {
      console.log(`Processing telecaller request for ID: ${id}`);

      // Build query for finding leads - handle both ObjectId and string formats
      let leadQuery = {};
      
      // For assignedto field (could be ObjectId or string)
      if (isValidObjectId(id)) {
        leadQuery = {
          $or: [
            { assignedto: new mongoose.Types.ObjectId(id) },
            { assignedto: id },
            { assignedby: id.toString() }
          ]
        };
      } else {
        leadQuery = {
          $or: [
            { assignedto: id },
            { assignedby: id.toString() }
          ]
        };
      }

      // Find all leads assigned to this telecaller or created by them
      const userLeads = await leadmanageModel
        .find(leadQuery)
        .select("_id name email")
        .lean();

      console.log(`Found ${userLeads.length} leads for telecaller:`, userLeads.map(l => ({ id: l._id, name: l.name })));

      if (userLeads.length === 0) {
        console.log("No leads found for this telecaller");
        return res.status(200).json({
          status_code: 200,
          status: "success",
          count: 0,
          data: [],
        });
      }

      // Extract lead IDs
      const leadIds = userLeads.map((lead) => lead._id);

      // Only fetch payment proofs for these leads
      query = { data: { $in: leadIds } };
      console.log("Query for payment proofs:", query);

      // Debug: Check if there are any payment proofs for these leads
      const debugProofs = await telepayModel.find(query).select("_id data").lean();
      console.log(`Found ${debugProofs.length} payment proofs for telecaller's leads:`, debugProofs);
    }

    // For Admin, show all payment proofs (empty query)
    const payments = await telepayModel
      .find(query)
      .populate({
        path: "data",
        select:
          "name email phonenumber lead_id status interested_course address city state pincode college_name degree passedout source followupdate followuptime enrollement_date createdAt updatedAt",
        model: "Leadupload",
      })
      .sort({ createdAt: -1 });

    console.log(`Found ${payments.length} payment records in database`);

    const updated = await Promise.all(
      payments.map(async (item) => {
        const obj = item.toObject();

        // Format image URL
        obj.image = item.image
          ? `${BASE_URL}/public/${item.image}`
          : `${BASE_URL}/uploads/default.jpg`;

        // If lead data is populated, add telecaller info and payment details
        if (obj.data && obj.data._id) {
          // Get telecaller info for this lead
          const lead = await leadmanageModel
            .findById(obj.data._id)
            .populate({
              path: "assignedto",
              select: "name email phone profileimage",
              model: "Telecaller",
            })
            .lean();

          if (lead && lead.assignedto) {
            obj.telecaller = lead.assignedto;
          }

          // Add a flag to indicate if this lead was created by the current telecaller
          if (role === "Telecaller" && lead && lead.assignedby === id.toString()) {
            obj.createdByCurrentUser = true;
          }

          // Add payment summary information
          const payments = await mongoose
            .model("Paymentdetails")
            .find({ leadId: obj.data._id })
            .lean()
            .select("amount paid_amount balance_amount");

          // Get course amount from interested_course
          const courseAmount = obj.data.interested_course?.amount || 0;

          // Calculate payment summary
          const paymentSummary = payments.reduce(
            (acc, payment) => {
              acc.totalAmount += parseFloat(payment.amount || 0);
              acc.paidAmount += parseFloat(payment.paid_amount || 0);
              return acc;
            },
            { totalAmount: 0, paidAmount: 0 }
          );

          // If no payments found, use course amount as balance
          const totalPaid = paymentSummary.paidAmount;
          const balanceAmount = courseAmount - totalPaid;

          // Add payment summary to the object
          obj.payment_summary = {
            course_amount: courseAmount,
            total_amount: paymentSummary.totalAmount || courseAmount,
            paid_amount: totalPaid,
            balance_amount: balanceAmount >= 0 ? balanceAmount : 0,
            fullyPaid: balanceAmount <= 0,
          };
        }

        return obj;
      })
    );

    console.log(`Returning ${updated.length} payment proofs for ${role}`);

    return res.status(200).json({
      status_code: 200,
      status: "success",
      count: updated.length,
      data: updated,
    });
  } catch (error) {
    console.error(`Error in gettelepayproof:`, error);
    return sendResponse(
      res,
      500,
      "error",
      "Internal server error",
      process.env.NODE_ENV === "development" ? error.message : undefined
    );
  }
};

const getproofcontroller = async (req, res) => {
  try {
    const { role, id } = req.user;
    console.log("User role and ID:", { role, id });

    // Validate user ID only if it's supposed to be an ObjectId
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    console.log("req.user:", req.user);

    let query = {};

    // If telecaller, show payment proofs for leads assigned to them OR created by them OR proofs they created
    if (role === "Telecaller") {
      // Build query for finding leads - handle both ObjectId and string formats
      let leadQuery = {};
      
      if (isValidObjectId(id)) {
        leadQuery = {
          $or: [
            { assignedto: new mongoose.Types.ObjectId(id) },
            { assignedto: id },
            { assignedby: id.toString() }
          ]
        };
      } else {
        leadQuery = {
          $or: [
            { assignedto: id },
            { assignedby: id.toString() }
          ]
        };
      }

      // First, find all leads assigned to this telecaller
      const assignedLeads = await leadmanageModel.find(leadQuery)
        .select("_id")
        .lean();

      // Find all payment proofs this telecaller has created or updated
      // This ensures they can see proofs they've worked with even if leads are reassigned
      const telecallerProofs = await telepayModel
        .find({})
        .select("data")
        .lean();

      // Extract lead IDs from all sources
      const assignedLeadIds = assignedLeads.map((lead) => lead._id.toString());
      const proofLeadIds = telecallerProofs.map((proof) =>
        proof.data.toString()
      );

      // Combine all IDs and remove duplicates
      const allLeadIds = [
        ...new Set([...assignedLeadIds, ...proofLeadIds]),
      ];

      // Convert string IDs to ObjectIds where valid
      const objectIdLeadIds = allLeadIds.map((leadId) =>
        isValidObjectId(leadId)
          ? new mongoose.Types.ObjectId(leadId)
          : leadId
      );

      // Only fetch payment proofs for these leads
      query = { data: { $in: objectIdLeadIds } };

      console.log(
        `Telecaller ${id} has access to ${objectIdLeadIds.length} leads`
      );

      if (objectIdLeadIds.length === 0) {
        return res.status(200).json({
          status_code: 200,
          status: "success",
          count: 0,
          data: [],
        });
      }
    }

    // For Admin, show all payment proofs (empty query)

    // Find payment proofs based on role-specific query
    const proofs = await telepayModel
      .find(query)
      .populate({
        path: "data",
        select: "name email phonenumber lead_id status interested_course",
        model: "Leadupload",
      })
      .sort({ createdAt: -1 });

    const formattedProofs = await Promise.all(
      proofs.map(async (proof) => {
        const obj = proof.toObject();

        // Format image URL
        obj.image = proof.image
          ? `${BASE_URL}/public/${proof.image}`
          : `${BASE_URL}/uploads/default.jpg`;

        // If lead data is populated, add telecaller info
        if (obj.data && obj.data._id) {
          // Get telecaller info for this lead
          const lead = await leadmanageModel
            .findById(obj.data._id)
            .populate({
              path: "assignedto",
              select: "name email phone",
              model: "Telecaller",
            })
            .lean();

          if (lead && lead.assignedto) {
            obj.telecaller = lead.assignedto;
          }
        }

        return obj;
      })
    );

    console.log(`Found ${formattedProofs.length} proofs for ${role}`);

    return res.status(200).json({
      status_code: 200,
      status: "success",
      count: formattedProofs.length,
      data: formattedProofs,
    });
  } catch (error) {
    console.error("Error fetching proofs:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET - Single Telepay Proof by ID
const getTelePayProofByID = async (req, res) => {
  try {
    const id = req.params.id;
    const payment = await telepayModel.findOne({ _id: id }).populate({
      path: "data",
      select:
        "name email phonenumber lead_id status interested_course address city state pincode college_name degree passedout source followupdate followuptime enrollement_date createdAt updatedAt",
      model: "Leadupload",
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment proof not found" });
    }

    const paymentObj = payment.toObject();
    paymentObj.image = payment.image
      ? `${BASE_URL}/public/${payment.image}`
      : `${BASE_URL}/uploads/default.jpg`;

    // Add telecaller info if lead data is available
    if (paymentObj.data && paymentObj.data._id) {
      // Get telecaller info for this lead
      const lead = await leadmanageModel
        .findById(paymentObj.data._id)
        .populate({
          path: "assignedto",
          select: "name email phone profileimage",
          model: "Telecaller",
        })
        .lean();

      if (lead && lead.assignedto) {
        paymentObj.telecaller = lead.assignedto;
      }

      // Add payment summary information
      const payments = await mongoose
        .model("Paymentdetails")
        .find({ leadId: paymentObj.data._id })
        .lean()
        .select("amount paid_amount balance_amount");

      // Get course amount from interested_course
      const courseAmount = paymentObj.data.interested_course?.amount || 0;

      // Calculate payment summary
      const paymentSummary = payments.reduce(
        (acc, payment) => {
          acc.totalAmount += parseFloat(payment.amount || 0);
          acc.paidAmount += parseFloat(payment.paid_amount || 0);
          return acc;
        },
        { totalAmount: 0, paidAmount: 0 }
      );

      // If no payments found, use course amount as balance
      const totalPaid = paymentSummary.paidAmount;
      const balanceAmount = courseAmount - totalPaid;

      // Add payment summary to the object
      paymentObj.payment_summary = {
        course_amount: courseAmount,
        total_amount: paymentSummary.totalAmount || courseAmount,
        paid_amount: totalPaid,
        balance_amount: balanceAmount >= 0 ? balanceAmount : 0,
        fullyPaid: balanceAmount <= 0,
      };
    }

    return res.status(200).json({
      status_code: 200,
      status: "success",
      data: paymentObj,
    });
  } catch (error) {
    console.error("Error fetching payment proof by ID:", error);
    return res
      .status(500)
      .json({ message: "Error fetching payment proof", error });
  }
};

const getTelepayProofsByLeadId = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { role, id } = req.user; // Get user role and ID

    if (!leadId) {
      return res.status(400).json({ message: "Lead ID is required" });
    }

    // Check if lead exists
    const lead = await leadmanageModel.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // If telecaller, verify they can access this lead
    if (role === "Telecaller") {
      const leadAssignedTo = lead.assignedto
        ? lead.assignedto.toString()
        : null;
      const leadCreatedBy = lead.assignedby || null;
      const telecallerId = id.toString();

      // Check if telecaller is assigned to this lead OR created this lead
      if (leadAssignedTo !== telecallerId && leadCreatedBy !== telecallerId) {
        return res.status(403).json({
          message: "Not authorized to access payment proofs for this lead",
        });
      }
    }

    // Find payment proofs for this lead
    const proofs = await telepayModel
      .find({ data: leadId })
      .sort({ createdAt: -1 });

    if (!proofs || proofs.length === 0) {
      return res
        .status(404)
        .json({ message: "No payment proofs found for this lead" });
    }

    const updated = proofs.map((item) => {
      const obj = item.toObject();
      obj.image = item.image
        ? `${BASE_URL}/public/${item.image}`
        : `${BASE_URL}/uploads/default.jpg`;
      return obj;
    });

    return res.status(200).json({
      status_code: 200,
      status: "success",
      count: updated.length,
      data: updated,
    });
  } catch (error) {
    console.error("Error fetching payment proofs by lead ID:", error);
    return res
      .status(500)
      .json({ message: "Error fetching payment proofs", error: error.message });
  }
};

const getTelepayProofByLeadIdAndProofId = async (req, res) => {
  try {
    const { leadId, proofId } = req.params;

    if (!leadId || !proofId) {
      return res
        .status(400)
        .json({ message: "Both Lead ID and Proof ID are required" });
    }

    const proof = await telepayModel.findOne({ _id: proofId, data: leadId });

    if (!proof) {
      return res.status(404).json({
        message: "Telepay proof not found for the given Lead ID and Proof ID",
      });
    }

    const result = proof.toObject();
    result.image = proof.image
      ? `${BASE_URL}/public/${proof.image}`
      : `${BASE_URL}/uploads/default.jpg`;

    return res.status(200).json({
      status_code: 200,
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error in getTelepayProofByLeadIdAndProofId:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// PUT - Edit Telepay Proof
const edittelepayproof = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const image = req.file ? req.file.filename : null;

    const telepayProof = await telepayModel.findById(id);
    if (!telepayProof) {
      return res.status(404).json({ message: "Telepay proof not found" });
    }

    Object.assign(telepayProof, updates);
    if (image) {
      if (telepayProof.image) {
        const oldPath = path.join(__dirname, "../public", telepayProof.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      telepayProof.image = image;
    }

    await telepayProof.save();

    const result = telepayProof.toObject();
    result.image = result.image
      ? `${BASE_URL}/public/${result.image}`
      : `${BASE_URL}/uploads/default.jpg`;

    // Get the lead ID to help with redirecting
    const leadId = telepayProof.data;

    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "Telepay proof updated successfully",
      telepayProof: result,
      leadId: leadId, // Add this to help with redirecting
      redirectUrl: `/api/telepay/telecaller/${leadId}`, // Add this for easy redirection
    });
  } catch (error) {
    console.error("Error in Edit:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// DELETE - Telepay Proof
const deletepayproof = async (req, res) => {
  try {
    const { id } = req.params;

    const proof = await telepayModel.findByIdAndDelete(id);
    if (!proof) {
      return res.status(404).json({ message: "Telepay proof not found" });
    }

    if (proof.image) {
      const imagePath = path.join(__dirname, "../public", proof.image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    return res
      .status(200)
      .json({ message: "Telepay proof deleted successfully" });
  } catch (error) {
    console.error("Error in Delete:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  upload,
  posttelepayproof,
  gettelepayproof,
  getTelepayProofsByLeadId,
  getTelepayProofByLeadIdAndProofId,
  edittelepayproof,
  deletepayproof,
  getTelePayProofByID,
  getproofcontroller,
};