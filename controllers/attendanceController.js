const Attendance = require("../models/attendance");
const Telecaller = require("../models/telecallermodel");
const moment = require("moment");

// Telecaller Check-in
exports.telecallerCheckIn = async (req, res) => {
  const telecallerId = req.user?.id || req.user?._id;
  const today = moment().format("YYYY-MM-DD");
  const currentTime = moment().format("hh:mm A");

  if (!telecallerId) {
    return res.status(400).json({ error: "Unauthorized or missing telecaller ID" });
  }

  try {
    const telecaller = await Telecaller.findById(telecallerId);
    if (!telecaller) return res.status(404).json({ error: "Telecaller not found" });

    let attendance = await Attendance.findOne({ userId: telecallerId, date: today });

    if (!attendance) {
      attendance = new Attendance({
        userId: telecallerId,
        date: today,
        checkIn: currentTime,
        status: "checked_in",
      });
    } else {
      attendance.checkIn = currentTime;
      attendance.status = "checked_in";
    }

    await attendance.save();
    res.status(200).json({ success: true, checkIn: attendance.checkIn });
  } catch (err) {
    console.error("Check-in Error:", err);
    res.status(500).json({ error: "Server error during check-in" });
  }
};

// Telecaller Check-out
exports.telecallerCheckOut = async (req, res) => {
  const telecallerId = req.user?.id || req.user?._id;
  const today = moment().format("YYYY-MM-DD");
  const currentTime = moment().format("hh:mm A");

  if (!telecallerId) {
    return res.status(400).json({ error: "Unauthorized or missing telecaller ID" });
  }

  try {
    const telecaller = await Telecaller.findById(telecallerId);
    if (!telecaller) return res.status(404).json({ error: "Telecaller not found" });

    let attendance = await Attendance.findOne({ userId: telecallerId, date: today });

    if (!attendance) {
      attendance = new Attendance({
        userId: telecallerId,
        date: today,
        checkOut: currentTime,
        status: "checked_out",
      });
    } else {
      attendance.checkOut = currentTime;
      attendance.status = "checked_out";
    }

    await attendance.save();
    res.status(200).json({ success: true, checkOut: attendance.checkOut });
  } catch (err) {
    console.error("Check-out Error:", err);
    res.status(500).json({ error: "Server error during check-out" });
  }
};

// Get today's status
exports.getTelecallerTodayStatus = async (req, res) => {
  try {
    console.log("req.user:", req.user);
    const telecallerId = req.user?.id || req.user?._id;

    if (!telecallerId) {
      console.warn("No telecallerId found in req.user");
      return res.status(400).json({ error: "Unauthorized or missing telecaller ID" });
    }

    const telecaller = await Telecaller.findById(telecallerId);
    if (!telecaller) {
      console.warn("Telecaller not found with ID:", telecallerId);
      return res.status(404).json({ error: "Telecaller not found" });
    }

    const today = moment().format("YYYY-MM-DD");
    let attendance = await Attendance.findOne({ userId: telecallerId, date: today });

    if (!attendance) {
      attendance = new Attendance({ userId: telecallerId, date: today, status: "checked_out" });
      await attendance.save();
    }

    return res.status(200).json({ status: attendance.status });
  } catch (err) {
    console.error("Status Error:", err);
    return res.status(500).json({ error: "Server error while fetching status" });
  }
};


// Admin: Get attendance report by telecaller ID
exports.getTelecallerAttendanceById = async (req, res) => {
  const telecallerId = req.params.id;

  try {
    const telecaller = await Telecaller.findById(telecallerId);
    if (!telecaller) {
      return res.status(404).json({ error: "Telecaller not found" });
    }

    const attendanceRecords = await Attendance.find({ userId: telecallerId }).sort({ date: -1 });

    const formattedAttendance = attendanceRecords.map((att) => ({
      date: att.date,
      checkIn: att.checkIn || "Not Available",
      checkOut: att.checkOut || "Not Available",
    }));

    res.status(200).json({
      success: true,
      telecaller: {
        id: telecaller._id,
        name: telecaller.name,
        email: telecaller.email,
        phone: telecaller.phone,
      },
      attendance: formattedAttendance,
    });
  } catch (error) {
    console.error("Fetch Attendance Error:", error);
    res.status(500).json({ error: "Server error while fetching attendance" });
  }
};
