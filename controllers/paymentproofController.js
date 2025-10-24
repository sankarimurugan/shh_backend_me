const mongoose = require("mongoose");
const telepayModel = require("../models/telepayModel");
const leadmanageModel = require("../models/leadmanageModel");
const paymentdetailsModel = require("../models/paymentdetailsModel");
const { sendResponse } = require("../utils/responseHandler");

const BASE_URL = process.env.BASE_URL || "http://localhost:9099";

const getLeadWithPaymentProof = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("API called with ID:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("Invalid ID format:", id);
      return sendResponse(res, 400, "error", "Invalid ID format");
    }

    // First try to find the payment proof
    const paymentProof = await telepayModel
      .findOne({ _id: id }) // Try to find by payment proof ID
      .lean()
      .select("data image paymentmethood status createdAt updatedAt");

    // Inside the if(paymentProof) block
    if (paymentProof) {
      // If found by payment proof ID, get the lead using the data field
      console.log("Payment proof found with ID:", id);
      console.log("Payment proof data (lead ID):", paymentProof.data);
      console.log("Payment proof data type:", typeof paymentProof.data);
      
      const lead = await leadmanageModel.findById(paymentProof.data).lean();
      console.log("Lead found with payment proof data:", lead ? "Yes" : "No");
      
      if (!lead) {
        // Instead of returning an error, return just the payment proof info
        const response = {
          lead: null,
          course_details: null,
          payment_summary: null,
          payment_proof: {
            _id: paymentProof._id,
            payment_method: paymentProof.paymentmethood,
            status: paymentProof.status,
            created_at: paymentProof.createdAt,
            updated_at: paymentProof.updatedAt,
            image: paymentProof.image
              ? `${BASE_URL}/public/${paymentProof.image}`
              : `${BASE_URL}/uploads/default.jpg`,
            referenced_lead_id: paymentProof.data, // Include the missing lead ID
          },
        };

        return sendResponse(
          res,
          200,
          "success",
          "Payment proof found but referenced lead is missing",
          response
        );
      }
      
      // Get course amount from the lead's interested_course
      const courseAmount = lead.interested_course?.amount || 0;

      // Calculate payment summaries efficiently
      const payments = await paymentdetailsModel
        .find({ leadId: paymentProof.data })
        .lean()
        .select(
          "amount paid_amount balance_amount mode_of_amount transaction_id payment_status remarks createdAt"
        );

      const paymentSummary = payments.reduce(
        (summary, payment) => {
          const amount = parseFloat(payment.amount || 0);
          const paidAmount = parseFloat(payment.paid_amount || 0);
          const balanceAmount = parseFloat(payment.balance_amount || 0);

          summary.totalAmount += amount;
          summary.totalPaid += paidAmount;
          summary.totalBalance += balanceAmount;
          summary.paymentHistory.push({
            payment_id: payment._id,
            amount,
            paid_amount: paidAmount,
            balance_amount: balanceAmount,
            mode_of_amount: payment.mode_of_amount,
            transaction_id: payment.transaction_id || "",
            payment_status: payment.payment_status || "Completed",
            remarks: payment.remarks || "",
            date: payment.createdAt,
          });

          return summary;
        },
        { totalAmount: 0, totalPaid: 0, totalBalance: 0, paymentHistory: [] }
      );

      // If no payments found, use course amount as balance
      const totalPaid = paymentSummary.totalPaid;
      const balanceAmount = courseAmount > 0 ? courseAmount - totalPaid : 0;
      
      // Add fullyPaid flag based on balance amount
      const fullyPaid = balanceAmount <= 0;

      // Format city and state if they are objects
      const formattedCity =
        typeof lead.city === "object" ? lead.city.name : lead.city;
      const formattedState =
        typeof lead.state === "object" ? lead.state.name : lead.state;

      // In the response object, modify the lead section
      const response = {
        lead: {
          _id: lead._id,
          name: lead.name,
          email: lead.email,
          phonenumber: lead.phonenumber,
          status: lead.status,
          address: lead.address || "",
          city: formattedCity || "",
          state: formattedState || "",
          pincode: lead.pincode || "",
          college_name: lead.college_name || "",
          degree: lead.degree || "",
          passedout: lead.passedout || "",
          followupdate: lead.followupdate || "",
          followuptime: lead.followuptime || "",
          enrollement_date: lead.enrollement_date || "",
          assignedto: lead.assignedto || null,
          interested_course: lead.interested_course || {}, 
          fullyPaid: fullyPaid, // Add this line
        },
        course_details: {
          course_name: lead.interested_course?.addcourse || "",
          course_amount: courseAmount,
          course_duration: lead.interested_course?.duration || "",
        },
        payment_summary: {
          total_payments: payments.length,
          total_amount: courseAmount, // Use course amount as the total amount
          total_paid_amount: totalPaid,
          total_balance_amount: balanceAmount,
          payment_history: paymentSummary.paymentHistory,
        },
        payment_proof: {
          _id: paymentProof._id,
          payment_method: paymentProof.paymentmethood,
          status: paymentProof.status,
          created_at: paymentProof.createdAt,
          updated_at: paymentProof.updatedAt,
          image: paymentProof.image
            ? `${BASE_URL}/public/${paymentProof.image}`
            : `${BASE_URL}/uploads/default.jpg`,
        },
      };

      return sendResponse(
        res,
        200,
        "success",
        "Payment proof retrieved successfully",
        response
      );
    } else {
      // If not found as a payment proof ID, try as a lead ID
      const lead = await leadmanageModel.findById(id).lean();
      console.log("Lead found:", lead ? "Yes" : "No");

      if (!lead) {
        return sendResponse(res, 404, "error", "Lead not found");
      }
      
      // Then find payment proofs for this lead
      const paymentProof = await telepayModel
        .findOne({ data: id })
        .lean()
        .select("data image paymentmethood status createdAt updatedAt");
        
      // If no payment proof exists, return the lead with empty payment info
      if (!paymentProof) {
        // Get course amount from the lead's interested_course
        const courseAmount = lead.interested_course?.amount || 0;
        
        // Format city and state if they are objects
        const formattedCity = typeof lead.city === "object" ? lead.city.name : lead.city;
        const formattedState = typeof lead.state === "object" ? lead.state.name : lead.state;

        const response = {
          lead: {
            _id: lead._id,
            name: lead.name,
            email: lead.email,
            phonenumber: lead.phonenumber,
            status: lead.status,
            address: lead.address || "",
            city: formattedCity || "",
            state: formattedState || "",
            pincode: lead.pincode || "",
            college_name: lead.college_name || "",
            degree: lead.degree || "",
            passedout: lead.passedout || "",
            followupdate: lead.followupdate || "",
            followuptime: lead.followuptime || "",
            enrollement_date: lead.enrollement_date || "",
            assignedto: lead.assignedto || null,
            interested_course: lead.interested_course || {}, 
          },
          course_details: {
            course_name: lead.interested_course?.addcourse || "",
            course_amount: courseAmount,
            course_duration: lead.interested_course?.duration || "",
          },
          payment_summary: {
            total_payments: 0,
            total_amount: courseAmount,
            total_paid_amount: 0,
            total_balance_amount: courseAmount,
            payment_history: [],
          },
          payment_proof: null,
        };

        return sendResponse(
          res,
          200,
          "success",
          "Lead found but no payment proof exists",
          response
        );
      }

      // Parallel queries for better performance
      const payments = await paymentdetailsModel
        .find({ leadId: paymentProof.data })
        .lean()
        .select(
          "amount paid_amount balance_amount mode_of_amount transaction_id payment_status remarks createdAt"
        );

      // Get course amount from the lead's interested_course
      const courseAmount = lead.interested_course?.amount || 0;

      // Calculate payment summaries efficiently
      const paymentSummary = payments.reduce(
        (summary, payment) => {
          const amount = parseFloat(payment.amount || 0);
          const paidAmount = parseFloat(payment.paid_amount || 0);
          const balanceAmount = parseFloat(payment.balance_amount || 0);

          summary.totalAmount += amount;
          summary.totalPaid += paidAmount;
          summary.totalBalance += balanceAmount;
          summary.paymentHistory.push({
            payment_id: payment._id,
            amount,
            paid_amount: paidAmount,
            balance_amount: balanceAmount,
            mode_of_amount: payment.mode_of_amount,
            transaction_id: payment.transaction_id || "",
            payment_status: payment.payment_status || "Completed",
            remarks: payment.remarks || "",
            date: payment.createdAt,
          });

          return summary;
        },
        { totalAmount: 0, totalPaid: 0, totalBalance: 0, paymentHistory: [] }
      );

      // If no payments found, use course amount as balance
      const totalPaid = paymentSummary.totalPaid;
      const balanceAmount = courseAmount > 0 ? courseAmount - totalPaid : 0;
      
      // Format city and state if they are objects
      const formattedCity =
        typeof lead.city === "object" ? lead.city.name : lead.city;
      const formattedState =
        typeof lead.state === "object" ? lead.state.name : lead.state;

      // In the response object, modify the lead section
      const response = {
        lead: {
          _id: lead._id,
          name: lead.name,
          email: lead.email,
          phonenumber: lead.phonenumber,
          status: lead.status,
          address: lead.address || "",
          city: formattedCity || "",
          state: formattedState || "",
          pincode: lead.pincode || "",
          college_name: lead.college_name || "",
          degree: lead.degree || "",
          passedout: lead.passedout || "",
          followupdate: lead.followupdate || "",
          followuptime: lead.followuptime || "",
          enrollement_date: lead.enrollement_date || "",
          assignedto: lead.assignedto || null,
          interested_course: lead.interested_course || {}, 
        },
        course_details: {
          course_name: lead.interested_course?.addcourse || "",
          course_amount: courseAmount,
          course_duration: lead.interested_course?.duration || "",
        },
        payment_summary: {
          total_payments: payments.length,
          total_amount: courseAmount, // Use course amount as the total amount
          total_paid_amount: totalPaid,
          total_balance_amount: balanceAmount,
          payment_history: paymentSummary.paymentHistory,
        },
        payment_proof: {
          _id: paymentProof._id,
          payment_method: paymentProof.paymentmethood,
          status: paymentProof.status,
          created_at: paymentProof.createdAt,
          updated_at: paymentProof.updatedAt,
          image: paymentProof.image
            ? `${BASE_URL}/public/${paymentProof.image}`
            : `${BASE_URL}/uploads/default.jpg`,
        },
      };

      return sendResponse(
        res,
        200,
        "success",
        "Payment proof retrieved successfully",
        response
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return sendResponse(res, 500, "error", "Internal server error");
  }
};

module.exports = {
  getLeadWithPaymentProof,
};
