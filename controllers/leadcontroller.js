const mongoose = require('mongoose');
const Lead = require('../models/leadmodel'); // Make sure to import your Lead model
const Telecaller = require("../models/telecallermodel"); // Add this line

// Get all leads - different behavior for admin and telecaller
const getAllLeads = async (req, res) => {
  try {
    const { role, id } = req.user;
    
    let leads;
    
    if (role === 'Admin') {
      leads = await Lead.find()
        .populate('telecaller', 'name email phone staff_id')
        .sort({ createdAt: -1 });
    } 
    else if (role === 'Telecaller') {
      // First find the telecaller by their MongoDB _id
      const telecaller = await Telecaller.findById(id);
      if (!telecaller) {
        return res.status(404).json({
          success: false,
          message: 'Telecaller not found'
        });
      }
      
      // Then find leads using the staff_id
      db.leads.find({ assignedto: { $type: "string" } })
      .sort({ createdAt: -1 });
    }
    else {
      return res.status(403).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    if (!leads) {
      leads = [];
    }
    
    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Create new lead
const createLead = async (req, res) => {
  try {
    const { role, id } = req.user; // From auth middleware
    
    // If telecaller is creating a lead, assign it to themselves
    if (role === 'Telecaller') {
      req.body.telecaller = id;
    }
    
    // If admin is creating a lead, they must specify a telecaller
    else if (role === 'Admin' && !req.body.telecaller) {
      return res.status(400).json({
        success: false,
        message: 'Please assign this lead to a telecaller'
      });
    }
    
    const lead = await Lead.create(req.body);
    
    res.status(201).json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get lead by ID
const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update lead
const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete lead
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Assign lead to telecaller (admin only)
const assignLeadToTelecaller = async (req, res) => {
  try {
    const { role, id: adminId } = req.user; // From auth middleware
    const { leadId, telecallerId } = req.body;
    
    // Only admin can assign leads
    if (role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign leads'
      });
    }
    
    const lead = await Lead.findByIdAndUpdate(
      leadId,
      { telecaller: telecallerId },
      { new: true }
    );
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    // Create notification for the telecaller
    try {
      // Import the Notification model
      const Notification = require('../models/notificationModel');
      
      // Create notification message
      const message = `New lead "${lead.name || 'Unnamed'}" (${lead.email || lead.phonenumber || 'No contact'}) has been assigned to you`;
      
      // Create notification
      await Notification.create({
        type: 'lead_created',
        message: message,
        relatedId: leadId,
        relatedModel: 'Leadupload', // Change from 'Lead' to 'Leadupload'
        createdBy: adminId, // Admin who assigned the lead
        relatedData: {
          telecallerId: telecallerId, // Telecaller who received the lead
          leadId: leadId
        },
        isRead: false
      });
      
      console.log('Notification created successfully for telecaller:', telecallerId);
    } catch (notificationError) {
      console.error('Error creating lead assignment notification:', notificationError);
      // Continue with the response even if notification creation fails
    }
    
    res.status(200).json({
      success: true,
      data: lead,
      message: 'Lead assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Export all controller functions
module.exports = {
  getAllLeads,
  createLead,
  getLeadById,
  updateLead,
  deleteLead,
  assignLeadToTelecaller
};