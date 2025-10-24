const mongoose = require("mongoose");
const paymentdetailsModel = require("../models/paymentdetailsModel");
const leaduploadModel = require("../models/leadmanageModel");
const telepayModel = require("../models/telepayModel");
const leadmanageModel = require("../models/leadmanageModel"); // Add this import
const { sendResponse } = require("../utils/responseHandler");

const paymentlead = async (req, res) => {
  try {
    const lead = await mongoose.model("Leadupload").findById(req.body.leadId);

    
    if (!lead) {
      return res.status(404).json({
        status_code: 404,
        status: "error",
        message: "Lead not found",
      });
    }

    const paymentData = {
      ...req.body,
      lead_id: lead.lead_id,
      email: lead.email,
      phonenumber: lead.phonenumber,
      interested_course: {
        addcourse: req.body.interested_course?.addcourse || "",
        amount: req.body.interested_course?.amount || 0,
        duration: req.body.interested_course?.duration || "",
      },
    };

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Save the payment
      const payment = new paymentdetailsModel(paymentData);
      await payment.save({ session });

      // Only update the specific payment proof if a proof ID is provided
      let updatedProofs;
      if (req.body.proofId) {
        // Update only the specific payment proof
        updatedProofs = await telepayModel.updateOne(
          { _id: req.body.proofId, status: "Pending" },
          { status: "Approved" },
          { session }
        );
        console.log(
          `Updated specific payment proof ${req.body.proofId} to Approved status`
        );
      } else {
        // Fallback to previous behavior if no proof ID is provided
        updatedProofs = await telepayModel.updateMany(
          { data: req.body.leadId, status: "Pending" },
          { status: "Approved" },
          { session }
        );
        console.log(
          `Updated ${updatedProofs.modifiedCount} payment proofs to Approved status`
        );
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Find the updated proofs to include in the response
      const updatedProofDetails = req.body.proofId
        ? await telepayModel.findById(req.body.proofId).lean()
        : await telepayModel.find({ data: req.body.leadId }).lean();

      return res.status(200).json({
        status_code: 200,
        status: "success",
        message: "Payment saved successfully and payment proof updated",
        data: payment,
        updated_proofs: {
          count: updatedProofs.modifiedCount,
          proofs: updatedProofDetails,
        },
      });
    } catch (error) {
      // If an error occurs, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error(`Error in paymentlead:`, error);
    return sendResponse(
      res,
      500,
      "error",
      "Internal server error",
      process.env.NODE_ENV === "development" ? error.message : undefined
    );
  }
};

const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await paymentdetailsModel.findById(id);

    if (!payment) {
      return res.status(404).json({
        status_code: 404,
        status: "error",
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      status_code: 200,
      status: "success",
      data: payment,
    });
  } catch (error) {
    console.error("Error fetching payment by ID:", error);
    return res.status(500).json({
      status_code: 500,
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getpaymentlead = async (req, res) => {
  try {
    const { role, id } = req.user;
    
    let query = {};
    
    // If telecaller, only show payments for their assigned leads
    if (role === 'Telecaller') {
      // Find leads assigned to this telecaller
      const assignedLeads = await leadmanageModel.find({ assignedto: id })
        .select('_id')
        .lean();
            
      query = { leadId: { $in: assignedLeads.map(lead => lead._id) } };
    }
    
    // Use lean() for better performance and select only needed fields
    const allPayments = await paymentdetailsModel
      .find(query)
      .lean()
      .populate(
        'leadId',
        'name email phonenumber status source assignedby assignedto followupdate followuptime interested_course enrollement_date notes degree passedout college_name address pincode state city DOB Walkin createdAt updatedAt lead_id'
      )
      .select(
        'leadId amount paid_amount balance_amount mode_of_amount transaction_id payment_status remarks createdAt'
      )
      .exec();

    const paymentMap = {};

    allPayments.forEach((payment) => {
      if (payment.leadId) {
        const lead = payment.leadId;
        const leadId = lead._id.toString();

        const courseAmount = lead.interested_course?.amount || 0;

        if (!paymentMap[leadId]) {
          paymentMap[leadId] = {
            invoice_no: `INV${Date.now()}${Math.floor(Math.random() * 1000)}`,
            invoice_from:
              "SAI HUSTLE HUB 10A North Mada Street kolathur chennai-600099",
            invoice_To: lead.address,
            invoice_Phone: "+916385662291",
            invoice_mail: " info@saihustlehub.com",
            Manager_Name: "Harish Kumar",
            institute_Name: "SAI HUSTLE HUB",
            invoice_from_date: payment.createdAt,
            invoice_to_date: payment.createdAt,
            transaction_ids: [],
            lead_id: leadId,
            lead_details: {
              _id: lead._id,
              lead_id: lead.lead_id,
              name: lead.name,
              email: lead.email,
              phonenumber: lead.phonenumber,
              status: lead.status,
              source: lead.source,
              assignedby: lead.assignedby,
              assignedto: lead.assignedto,
              followupdate: lead.followupdate,
              followuptime: lead.followuptime,
              interested_course: lead.interested_course,
              enrollement_date: lead.enrollement_date,
              notes: lead.notes,
              degree: lead.degree,
              passedout: lead.passedout,
              college_name: lead.college_name,
              address: lead.address || "",
              pincode: lead.pincode,
              state: lead.state,
              city: lead.city,
              DOB: lead.DOB,
              Walkin: lead.Walkin,
              createdAt: lead.createdAt,
              updatedAt: lead.updatedAt,
            },
            total_payments: 0,
            total_amount: courseAmount,
            total_paid_amount: 0,
            total_balance_amount: courseAmount,
            payment_history: [],
          };
        }

        const currentLead = paymentMap[leadId];

        if (payment.createdAt < currentLead.invoice_from_date) {
          currentLead.invoice_from_date = payment.createdAt;
        }
        if (payment.createdAt > currentLead.invoice_to_date) {
          currentLead.invoice_to_date = payment.createdAt;
        }

        currentLead.payment_history.push({
          payment_id: payment._id,
          amount: parseFloat(payment.amount),
          paid_amount: parseFloat(payment.paid_amount),
          balance_amount: parseFloat(payment.balance_amount),
          mode_of_amount: payment.mode_of_amount,
          transaction_id: payment.transaction_id || payment.transaction_id,
          date: payment.createdAt,
        });

        const txnId = payment.transaction_id || payment.transaction_id;
        if (txnId && !currentLead.transaction_ids.includes(txnId)) {
          currentLead.transaction_ids.push(txnId);
        }

        currentLead.total_payments += 1;
        currentLead.total_paid_amount += parseFloat(payment.paid_amount);
        currentLead.total_balance_amount =
          currentLead.total_amount - currentLead.total_paid_amount;
      }
    });

    const groupedPayments = Object.values(paymentMap);

    return res.status(200).json({
      status_code: 200,
      status: "success",
      data: {
        grouped_payments: groupedPayments,
      },
    });
  } catch (error) {
    console.error("Error fetching lead and payment history:", error);
    return sendResponse(res, 500, "error", error.message);
  }
};

const getpaymentleadById = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await leaduploadModel.findById(id);
    if (!lead) {
      return res.status(404).json({
        status_code: 404,
        status: "error",
        message: "Lead not found",
      });
    }

    const payments = await paymentdetailsModel.find({ leadId: id });

    return res.status(200).json({
      status_code: 200,
      status: "success",
      lead_name: lead.name,
      lead_id: lead._id,
      total_payments: payments.length,
      payment_history: payments,
    });
  } catch (error) {
    console.error("Error fetching payments for lead:", error);
    return res.status(500).json({
      status_code: 500,
      status: "error",
      message: "Internal server error",
    });
  }
};

const getPaymentLeadByIdOrName = async (req, res) => {
  try {
    const { id } = req.params;
    let lead;

    // Check if the parameter is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

    if (isValidObjectId) {
      lead = await leaduploadModel.findById(id);
    } else {
      lead = await leaduploadModel.findOne({ name: id.trim() });
    }

    if (!lead) {
      return res.status(404).json({
        status_code: 404,
        status: "error",
        message: "Lead not found",
      });
    }

    // Find payments based on lead._id
    const payments = await paymentdetailsModel.find({ leadId: lead._id });

    return res.status(200).json({
      status_code: 200,
      status: "success",
      lead_name: lead.name,
      lead_id: lead._id,
      total_payments: payments.length,
      payment_history: payments,
    });
  } catch (error) {
    console.error("Error fetching payments for lead:", error);
    return res.status(500).json({
      status_code: 500,
      status: "error",
      message: "Internal server error",
    });
  }
};

const editpayment = async (req, res) => {
  try {
    const { id } = req.params;
    const editpayment = req.body;

    const updatedPayment = await paymentdetailsModel.findByIdAndUpdate(
      id,
      editpayment,
      { new: true }
    );

    if (!updatedPayment) {
      return res.status(404).json({ error: "Payment record not found" });
    }
    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "Payment updated successfully",
      data: updatedPayment,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deletepayment = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPayment = await paymentdetailsModel.findByIdAndDelete(id);

    if (!deletedPayment) {
      return res.status(400).json({ error: "Payment record not found" });
    }
    return res.status(200).json({
      status_code: 200,
      status: "success",
      message: "Payment deleted successfully",
      data: deletedPayment,
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  paymentlead,
  getpaymentlead,
  getpaymentleadById,
  getPaymentLeadByIdOrName,
  editpayment,
  deletepayment,
  getPaymentById,
};
