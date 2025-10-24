const Paymentdetails = require("../models/paymentdetailsModel");
const Leadupload = require("../models/leadmanageModel");
const { sendResponse } = require("../utils/responseHandler");
const generateInvoice = async (req, res) => {
  try {
    const { leadId } = req.params;

    const [lead, payments] = await Promise.all([
      Leadupload.findById(leadId).lean().select("name email phonenumber"),
      Paymentdetails.find({ leadId })
        .lean()
        .select("amount paid_amount balance_amount createdAt"),
    ]);

    if (!lead) {
      return sendResponse(res, 404, "error", "Lead not found");
    }

    if (!payments.length) {
      return sendResponse(res, 400, "error", "No payments found for this lead");
    }

    let totalPaid = 0;
    let totalBalance = 0;
    let totalAmount = 0;

    payments.forEach((payment) => {
      totalPaid += parseFloat(payment.paid_amount || 0);
      totalBalance += parseFloat(payment.balance_amount || 0);
      totalAmount += parseFloat(payment.amount || 0);
    });

    const invoiceNo = `INV${Date.now()}`;
    const invoiceDate = new Date().toISOString().split("T")[0];

    res.status(200).json({
      status_code: 200,
      status: "success",
      invoice_no: invoiceNo,
      invoice_date: invoiceDate,
      invoice_from: {
        company: "SAI HUSTLE HUB",
        address: "No 10a, North Mada Street, kolathur, chennai,600099",
        email: "info@saihustlehub.com",
        phone: "+916385659291",
      },
      billed_to: {
        name: lead.name,
        email: lead.email,
        phone: lead.phonenumber,
        lead_id: lead._id,
      },
      payment_summary: {
        total_amount: totalAmount,
        total_paid: totalPaid,
        total_balance: totalBalance,
        number_of_payments: payments.length,
      },
      payment_history: payments,
    });
  } catch (error) {
    console.error(`Error in generateInvoice:`, error);
    return sendResponse(
      res,
      500,
      "error",
      "Internal server error",
      process.env.NODE_ENV === "development" ? error.message : undefined
    );
  }
};

module.exports = { generateInvoice };
