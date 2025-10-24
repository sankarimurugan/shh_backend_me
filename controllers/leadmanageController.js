const { catchAsync, AppError } = require("../utils/errorHandler");
const { sendResponse } = require("../utils/responseHandler");
const Leadupload = require("../models/leadmanageModel");
const Paymentdetails = require("../models/paymentdetailsModel");
const mongoose = require("mongoose"); // Add this line
const { parse } = require("csv-parse");
const Source = require("../models/sourceModel");
const Telecaller = require("../models/telecallermodel"); // Add this line
const { Readable } = require("stream");

const leadcreate = catchAsync(async (req, res) => {
  const {
    name,
    email,
    phonenumber,
    address,
    city,
    state,
    pincode,
    college_name,
    degree,
    passedout,
    source,
    status,
    assignedto,
    interested_course,
    followupdate,
    followuptime,
    enrollement_date,
  } = req.body;

  // Basic validation
  if (!name || !email || !phonenumber) {
    throw new AppError("Please provide all required fields", 400);
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError("Please provide a valid email address", 400);
  }

  // Phone number validation
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phonenumber)) {
    throw new AppError("Please provide a valid 10-digit phone number", 400);
  }

  // Check for duplicate email
  const existingLeadEmail = await Leadupload.findOne({ email });
  if (existingLeadEmail) {
    throw new AppError("Lead with this email already exists", 400);
  }

  // Check for duplicate phone number
  const existingLeadPhone = await Leadupload.findOne({ phonenumber });
  if (existingLeadPhone) {
    throw new AppError("Lead with this phone number already exists", 400);
  }

  const existingLead = await Leadupload.findOne({ email });
  if (existingLead) {
    throw new AppError("Lead with this email already exists", 400);
  }

  // Get user role and ID from auth middleware
  const { role, id } = req.user;

  // Handle assignedto based on user role
  let finalAssignedTo = assignedto;

  // If telecaller is creating a lead, assign it to their staff_id
  if (role === "Telecaller") {
    const telecaller = await Telecaller.findById(id);
    finalAssignedTo = telecaller._id;
  }
  // If admin is creating a lead and no assignedto is specified, throw error
  else if (role === "Admin" && !assignedto) {
    throw new AppError("Please assign this lead to a telecaller", 400);
  }

  // Create lead with all fields
  // In the leadcreate function, modify the interested_course handling
  // Create lead with all fields
  // After successfully creating the lead
  const lead = await Leadupload.create({
    name,
    email,
    phonenumber,
    address,
    city,
    state,
    pincode,
    college_name,
    degree,
    passedout,
    source,
    status: status || "Enquiry",
    assignedto: finalAssignedTo,
    assignedby: role === "Admin" ? id : null,
    interested_course: {
      _id: mongoose.Types.ObjectId.isValid(interested_course?._id)
        ? new mongoose.Types.ObjectId(interested_course._id)
        : interested_course?._id,
      addcourse: interested_course?.addcourse,
      amount: interested_course?.amount,
      duration: interested_course?.duration,
    },
    followupdate: followupdate || null,
    followuptime: followuptime || null,
    enrollement_date: enrollement_date || null,
  });

  // Create notification if an admin is creating a lead and assigning it to a telecaller
  if (role === "Admin" && finalAssignedTo) {
    try {
      const Notification = require("../models/notificationModel");
      const telecaller = await Telecaller.findOne({
        _id: finalAssignedTo,
      });

      const message = `New lead "${lead.name || "Unnamed"}" (${lead.email || lead.phonenumber || "No contact"
        }) has been assigned to you`;

      await Notification.create({
        type: "lead_created",
        message: message,
        relatedId: lead._id,
        relatedModel: "Leadupload",
        createdBy: id,
        relatedData: {
          telecallerId: telecaller._id, // Use the actual telecaller ID for the notification
          leadId: lead._id,
        },
        isRead: false,
      });

      console.log(
        "Notification created successfully for telecaller:",
        finalAssignedTo
      );
    } catch (notificationError) {
      console.error(
        "Error creating lead assignment notification:",
        notificationError
      );
      // Continue with the response even if notification creation fails
    }
  }

  return sendResponse(res, 201, "success", "Lead created successfully", lead);
});

const getleadmanage = catchAsync(async (req, res) => {
  // Get user role and ID from auth middleware
  const { role, id } = req.user;

  console.log("User info:", { role, id }); // Debug log

  // Query based on role
  let query = {};

  // If telecaller, only show their leads
  if (role === "Telecaller") {
    const telecaller = await Telecaller.findById(id);
    if (!telecaller) {
      throw new AppError("Telecaller not found", 404);
    }
    query = { assignedto: telecaller._id };
  } else if (role !== "Admin") {
    return sendResponse(res, 403, "error", "Not authorized to view leads", []);
  }
  // For Admin, show all leads (no filter)

  let leads = await Leadupload.find(query)
    .lean()
    .select({
      _id: 1,
      lead_id: 1,
      name: 1,
      email: 1,
      phonenumber: 1,
      address: 1,
      city: 1,
      state: 1,
      pincode: 1,
      college_name: 1,
      degree: 1,
      passedout: 1,
      source: 1,
      status: 1,
      assignedto: 1,
      interested_course: 1,
      followupdate: 1,
      followuptime: 1,
      enrollement_date: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .sort({ createdAt: -1 });

  console.log(`Found ${leads.length} leads for query:`, query);

  // Get payment details for all leads
  const leadsWithPayments = await Promise.all(
    leads.map(async (lead) => {
      const payments = await Paymentdetails.find({ leadId: lead._id })
        .lean()
        .select("amount paid_amount balance_amount");

      // Get course amount from interested_course
      const courseAmount = lead.interested_course?.amount || 0;

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

      // Add fullyPaid flag based on balance amount
      const fullyPaid = balanceAmount <= 0;

      return {
        ...lead,
        course_amount: courseAmount,
        total_amount: paymentSummary.totalAmount || courseAmount,
        paid_amount: totalPaid,
        balance_amount: balanceAmount >= 0 ? balanceAmount : 0,
        fullyPaid: fullyPaid, // Add this line
        created_date: lead.createdAt,
        updated_date: lead.updatedAt,
        state_name:
          typeof lead.state === "object" ? lead.state.name : lead.state,
        city_name: typeof lead.city === "object" ? lead.city.name : lead.city,
      };
    })
  );

  return sendResponse(
    res,
    200,
    "success",
    "Leads retrieved successfully",
    leadsWithPayments
  );
});

const getleadmanageById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  // Find the lead with populated telecaller details
  const lead = await Leadupload.findById(id).populate({
    path: "assignedto",
    select: "name email phone profileimage role",
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  // If telecaller, verify they can access this lead
  if (role === "Telecaller") {
    const mongoose = require("mongoose");
    const objectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;
    const userIdStr = objectId.toString();

    // Handle the case where assignedto is now a populated object
    let leadAssignedTo;
    if (typeof lead.assignedto === "object" && lead.assignedto !== null) {
      // If it's a populated object, get the _id
      leadAssignedTo = lead.assignedto._id.toString();
    } else {
      // If it's still an ID (string or ObjectId)
      leadAssignedTo = mongoose.Types.ObjectId.isValid(lead.assignedto)
        ? lead.assignedto.toString()
        : lead.assignedto;
    }

    console.log("Comparing IDs:", { leadAssignedTo, userIdStr }); // Debug log

    if (leadAssignedTo !== userIdStr) {
      throw new AppError("Not authorized to access this lead", 403);
    }
  }

  // Get payment details for the lead
  const payments = await Paymentdetails.find({ leadId: id })
    .lean()
    .select("amount paid_amount balance_amount");

  // Get course amount from interested_course
  const courseAmount = lead.interested_course?.amount || 0;

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

  // Add fullyPaid flag based on balance amount
  const fullyPaid = balanceAmount <= 0;

  // Convert lead to plain object to add additional fields
  const leadObj = lead.toObject();

  // Add payment and fullyPaid information
  leadObj.course_amount = courseAmount;
  leadObj.total_amount = paymentSummary.totalAmount || courseAmount;
  leadObj.paid_amount = totalPaid;
  leadObj.balance_amount = balanceAmount >= 0 ? balanceAmount : 0;
  leadObj.fullyPaid = fullyPaid;

  return sendResponse(
    res,
    200,
    "success",
    "Lead retrieved successfully",
    leadObj
  );
});

const getLeadsByTelecallerId = catchAsync(async (req, res) => {
  const { telecallerId } = req.params;

  // First, verify the telecaller exists
  const telecaller = await mongoose
    .model("Telecaller")
    .findById(telecallerId)
    .select("name email phone profileimage");

  if (!telecaller) {
    throw new AppError("Telecaller not found", 404);
  }

  const leads = await Leadupload.find({ assignedto: telecallerId })
    .lean()
    .select({
      _id: 1,
      lead_id: 1,
      name: 1,
      email: 1,
      phonenumber: 1,
      address: 1,
      city: 1,
      state: 1,
      pincode: 1,
      college_name: 1,
      degree: 1,
      passedout: 1,
      source: 1,
      status: 1,
      assignedto: 1,
      interested_course: 1,
      followupdate: 1,
      followuptime: 1,
      enrollement_date: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .sort({ createdAt: -1 });

  if (!leads.length) {
    throw new AppError("No leads found for this telecaller", 404);
  }

  // Get payment details for all leads (similar to your other endpoints)
  const leadsWithPayments = await Promise.all(
    leads.map(async (lead) => {
      const payments = await Paymentdetails.find({ leadId: lead._id })
        .lean()
        .select("amount paid_amount balance_amount");

      // Get course amount from interested_course
      const courseAmount = lead.interested_course?.amount || 0;

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

      return {
        ...lead,
        course_amount: courseAmount,
        total_amount: paymentSummary.totalAmount || courseAmount,
        paid_amount: totalPaid,
        balance_amount: balanceAmount >= 0 ? balanceAmount : 0,
        created_date: lead.createdAt,
        updated_date: lead.updatedAt,
        state_name:
          typeof lead.state === "object" ? lead.state.name : lead.state,
        city_name: typeof lead.city === "object" ? lead.city.name : lead.city,
      };
    })
  );

  return sendResponse(res, 200, "success", "Leads retrieved successfully", {
    telecaller,
    leads: leadsWithPayments,
    count: leads.length,
  });
});

const getAllLeads = catchAsync(async (req, res) => {
  const { role, id } = req.user;

  if (role !== "Admin") {
    return sendResponse(res, 403, "error", "Not authorized to access all leads", []);
  }

  let leads = await Leadupload.find({})
    .lean()
    .select({
      _id: 1,
      lead_id: 1,
      name: 1,
      email: 1,
      phonenumber: 1,
      address: 1,
      city: 1,
      state: 1,
      pincode: 1,
      college_name: 1,
      degree: 1,
      passedout: 1,
      source: 1,
      status: 1,
      assignedto: 1,
      interested_course: 1,
      followupdate: 1,
      followuptime: 1,
      enrollement_date: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .sort({ createdAt: -1 });

  // Collect assignedto IDs (custom strings like SHHT001)
  const assignedIds = leads
    .map(lead => lead.assignedto)
    .filter(id => typeof id === "string");

  // Fetch matching telecallers
  const telecallers = await Telecaller.find({ _id: { $in: assignedIds } })
    .select("name email phone profileimage role")
    .lean();

  // Map telecaller _id -> details
  const telecallerMap = new Map(
    telecallers.map(tc => [tc._id, tc])
  );

  // Assign populated telecaller details
  leads = leads.map(lead => {
    lead.assignedto = telecallerMap.get(lead.assignedto) || null;
    return lead;
  });

  // Add payment details to each lead
  const leadsWithPayments = await Promise.all(
    leads.map(async (lead) => {
      const payments = await Paymentdetails.find({ leadId: lead._id })
        .lean()
        .select("amount paid_amount balance_amount");

      const courseAmount = lead.interested_course?.amount || 0;

      const paymentSummary = payments.reduce(
        (acc, payment) => {
          acc.totalAmount += parseFloat(payment.amount || 0);
          acc.paidAmount += parseFloat(payment.paid_amount || 0);
          return acc;
        },
        { totalAmount: 0, paidAmount: 0 }
      );

      const totalPaid = paymentSummary.paidAmount;
      const balanceAmount = courseAmount - totalPaid;

      return {
        ...lead,
        course_amount: courseAmount,
        total_amount: paymentSummary.totalAmount || courseAmount,
        paid_amount: totalPaid,
        balance_amount: balanceAmount >= 0 ? balanceAmount : 0,
        created_date: lead.createdAt,
        updated_date: lead.updatedAt,
        state_name: typeof lead.state === "object" ? lead.state.name : lead.state,
        city_name: typeof lead.city === "object" ? lead.city.name : lead.city,
      };
    })
  );

  return sendResponse(
    res,
    200,
    "success",
    "All leads retrieved successfully",
    leadsWithPayments
  );
});



const editleadmanage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const { role, id: userId } = req.user;

  // Validate if lead exists
  const existingLead = await Leadupload.findById(id);
  if (!existingLead) {
    throw new AppError("Lead not found", 404);
  }

  // If telecaller, verify they can edit this lead
  if (role === "Telecaller") {
    const mongoose = require("mongoose");
    const objectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;
    const leadAssignedTo = mongoose.Types.ObjectId.isValid(
      existingLead.assignedto
    )
      ? existingLead.assignedto.toString()
      : existingLead.assignedto;
    const userIdStr = objectId.toString();

    if (leadAssignedTo !== userIdStr) {
      throw new AppError("Not authorized to edit this lead", 403);
    }
  }

  // Check if assignedto is being changed and if the user is an admin
  const isAssignmentChange =
    updateData.assignedto &&
    existingLead.assignedto?.toString() !== updateData.assignedto.toString();

  // Update lead with new data
  const updatedLead = await Leadupload.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  // Create notification if this is a lead assignment by an admin
  if (role === "Admin" && isAssignmentChange) {
    try {
      // Import the Notification model
      const Notification = require("../models/notificationModel");

      // Create notification message
      const message = `New lead "${updatedLead.name || "Unnamed"}" (${updatedLead.email || updatedLead.phonenumber || "No contact"
        }) has been assigned to you`;

      // Create notification
      await Notification.create({
        type: "lead_created",
        message: message,
        relatedId: id,
        relatedModel: "Leadupload",
        createdBy: userId, // Admin who assigned the lead
        relatedData: {
          telecallerId: updateData.assignedto, // Telecaller who received the lead
          leadId: id,
        },
        isRead: false,
      });

      console.log(
        "Notification created successfully for telecaller:",
        updateData.assignedto
      );
    } catch (notificationError) {
      console.error(
        "Error creating lead assignment notification:",
        notificationError
      );
      // Continue with the response even if notification creation fails
    }
  }

  return sendResponse(
    res,
    200,
    "success",
    "Lead updated successfully",
    updatedLead
  );
});

const deleteleadmanage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  // Find the lead first to check if it exists
  const lead = await Leadupload.findById(id);
  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  // If telecaller, verify they can delete this lead
  if (role === "Telecaller") {
    const mongoose = require("mongoose");
    const objectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;
    const leadAssignedTo = mongoose.Types.ObjectId.isValid(lead.assignedto)
      ? lead.assignedto.toString()
      : lead.assignedto;
    const userIdStr = objectId.toString();

    if (leadAssignedTo !== userIdStr) {
      throw new AppError("Not authorized to delete this lead", 403);
    }
  }

  // Function to perform the delete operation with retry logic
  const performDelete = async (retryCount = 0, maxRetries = 3) => {
    try {
      // Start a session for transaction
      const session = await mongoose.startSession();

      // Inside the performDelete function in deleteleadmanage
      try {
        // Configure transaction with options
        session.startTransaction({
          readConcern: { level: "snapshot" },
          writeConcern: { w: "majority" },
          maxTimeMS: 30000, // 30 seconds timeout
        });

        // Delete related payment details
        const paymentResult = await Paymentdetails.deleteMany(
          { leadId: id },
          { session }
        );
        console.log(`Deleted ${paymentResult.deletedCount} payment details`);

        // Delete related payment proofs - ensure ID is properly formatted
        const proofResult = await mongoose
          .model("telecallerpayment")
          .deleteMany({ data: new mongoose.Types.ObjectId(id) }, { session });
        console.log(`Deleted ${proofResult.deletedCount} payment proofs`);

        // Delete related notes
        const noteResult = await mongoose
          .model("Note")
          .deleteMany({ leadId: id }, { session });
        console.log(`Deleted ${noteResult.deletedCount} notes`);

        // Delete the lead itself
        await Leadupload.findByIdAndDelete(id, { session });

        // Commit the transaction
        await session.commitTransaction();
        return true;
      } catch (error) {
        // If an error occurs, abort the transaction
        await session.abortTransaction();
        throw error; // Re-throw to be caught by outer try-catch
      } finally {
        session.endSession();
      }
    } catch (error) {
      // Check if error is retryable and we haven't exceeded max retries
      const isRetryableError =
        error.code === 112 || // WriteConflict
        error.code === 251 || // NoSuchTransaction
        error.errorLabels?.includes("TransientTransactionError") ||
        error.errorLabels?.includes("RetryableWriteError");

      if (isRetryableError && retryCount < maxRetries) {
        console.log(
          `Retry attempt ${retryCount + 1} for deleting lead ${id}. Error: ${error.codeName || error.message
          }`
        );
        // Wait before retrying (exponential backoff)
        const delay = Math.min(100 * Math.pow(2, retryCount), 2000); // Max 2 seconds
        await new Promise((resolve) => setTimeout(resolve, delay));
        return performDelete(retryCount + 1, maxRetries);
      }

      // If not retryable or max retries exceeded, throw the error
      throw error;
    }
  };

  // Add this fallback method to your controller
  const deleteLeadWithoutTransaction = async (id) => {
    try {
      // Delete related payment details
      const paymentResult = await Paymentdetails.deleteMany({ leadId: id });
      console.log(`Deleted ${paymentResult.deletedCount} payment details`);

      // Delete related payment proofs - ensure ID is properly formatted
      const proofResult = await mongoose
        .model("telecallerpayment")
        .deleteMany({ data: new mongoose.Types.ObjectId(id) });
      console.log(`Deleted ${proofResult.deletedCount} payment proofs`);

      // Delete related notes
      const noteResult = await mongoose
        .model("Note")
        .deleteMany({ leadId: id });
      console.log(`Deleted ${noteResult.deletedCount} notes`);

      // Delete the lead itself
      await Leadupload.findByIdAndDelete(id);

      return true;
    } catch (error) {
      console.error("Error in non-transactional delete:", error);
      throw error;
    }
  };

  // Then in your deleteleadmanage function, add this as a fallback
  try {
    await performDelete();
    return sendResponse(
      res,
      200,
      "success",
      "Lead and all related data deleted successfully",
      { id }
    );
  } catch (error) {
    console.error(
      "Error deleting lead with transaction, trying without transaction:",
      error
    );

    try {
      // Fallback to non-transactional delete
      await deleteLeadWithoutTransaction(id);
      return sendResponse(
        res,
        200,
        "success",
        "Lead and all related data deleted successfully (non-transactional)",
        { id }
      );
    } catch (fallbackError) {
      console.error("Error in fallback deletion:", fallbackError);
      throw new AppError("Failed to delete lead and related data", 500);
    }
  }
});

// Add this as a temporary endpoint for debugging
const debugLeadAssignments = catchAsync(async (req, res) => {
  const mongoose = require("mongoose"); // Add this line
  const leads = await Leadupload.find()
    .select("name email assignedto")
    .limit(10);
  const telecallers = await mongoose
    .model("Telecaller")
    .find()
    .select("_id name email");

  console.log("Sample leads:", leads);
  console.log("Available telecallers:", telecallers);

  return sendResponse(res, 200, "success", "Debug info", {
    leads,
    telecallers,
    note: "Check console logs for more details",
  });
});

const bulkLeadUpload = catchAsync(async (req, res) => {
  const { role, id } = req.user;

  if (!req.file) {
    throw new AppError("Please upload a file", 400);
  }

  let telecallerInfo = null;
  if (role === "Telecaller") {
    telecallerInfo = await Telecaller.findById(id);
    if (!telecallerInfo) {
      throw new AppError("Telecaller not found", 404);
    }
  }

  const results = [];
  const errors = [];

  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const bufferStream = new Readable();
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);
  bufferStream.pipe(parser);

  for await (const record of parser) {
    try {
      // Basic required fields check
      if (!record.name || !record.email || !record.phonenumber) {
        errors.push(`Missing required fields: ${JSON.stringify(record)}`);
        continue;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(record.email)) {
        errors.push(`Invalid email format: ${record.email}`);
        continue;
      }

      // Phone validation (digits, +, -, spaces, parentheses)
      const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
      if (!phoneRegex.test(record.phonenumber)) {
        errors.push(`Invalid phone number: ${record.phonenumber}`);
        continue;
      }

      // Check duplicate lead by email or phone
      const existingLead = await Leadupload.findOne({
        $or: [{ email: record.email }, { phonenumber: record.phonenumber }],
      });

      if (existingLead) {
        errors.push(
          `Duplicate lead: email=${record.email} or phone=${record.phonenumber}`
        );
        continue;
      }

      // Construct leadData object with interested_course as object
      const leadData = {
        ...record,
        status: record.status || "Enquiry",
        assignedto: role === "Telecaller" ? telecallerInfo._id : record.assignedto,
        assignedby: role === "Admin" ? id : null,
        interested_course: {
          name: record.interested_course_name || "", // <-- Here convert string to object
        },
      };

      if (role === "Admin" && leadData.assignedto) {
        const assignedTelecaller = await Telecaller.findOne({
          _id: leadData.assignedto,
        });
        if (!assignedTelecaller) {
          errors.push(`Invalid telecaller staff_id: ${leadData.assignedto}`);
          continue;
        }
        leadData.telecaller = assignedTelecaller._id;
      }

      // Create lead
      const lead = await Leadupload.create(leadData);
      results.push(lead);

      // Create notification for telecaller if admin uploaded
      if (role === "Admin" && leadData.telecaller) {
        await Notification.create({
          type: "lead_created",
          message: `New lead "${lead.name}" (${lead.email}) has been assigned to you through bulk upload`,
          relatedId: lead._id,
          relatedModel: "Leadupload",
          createdBy: id,
          relatedData: {
            telecallerId: leadData.telecaller,
            leadId: lead._id,
          },
        });
      }
    } catch (err) {
      errors.push(
        `Error processing record: ${JSON.stringify(record)} - ${err.message}`
      );
    }
  }

  return sendResponse(res, 200, "success", "Bulk upload completed", {
    successful: results.length,
    failed: errors.length,
    errors,
  });
});

// Add this to the exports
module.exports = {
  leadcreate,
  getleadmanage,
  getleadmanageById,
  getLeadsByTelecallerId,
  getAllLeads,
  editleadmanage,
  deleteleadmanage,
  debugLeadAssignments,
  bulkLeadUpload,
};
