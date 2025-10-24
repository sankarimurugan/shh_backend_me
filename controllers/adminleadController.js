// const adminleadModel = require('../Models/adminleadModel');

// const adminlead = async (req, res) => {
//     try {
//         const { name, email, phonenumber, source, interestedcourse, assignedto, degree, passedout, college_name, pincode, address, city, state } = req.body;

//         if (!name || !email || !phonenumber || !interestedcourse ||!source) {
//             return res.status(400).json({ error: "All fields are required" });
//         }

//         const existingadminlead = await adminleadModel.findOne({ email, phonenumber });
//         if (existingadminlead) {
//             return res.status(400).json({ error: "Lead with this phoennumber and email already exists" });
//         }
//         const adminnewlead = await adminleadModel.create({
//             name,
//             email,
//             phonenumber,
//             source,
//             assignedto,
//             interestedcourse,
//             degree,
//             passedout,
//             college_name,
//             address,
//             pincode,
//             state,
//             city
//         });
//         return res.status(201).json({
//             status_code: 201,
//             status: "success",
//             message: "Lead created successfully",
//             data: adminnewlead,

//         });
//     } catch (error) {
//         console.error("Error lead:", error);
//         return res.status(500).json({ error: "Internal server error" });

//     }
// };

// const getadminlead = async (req, res) => {
//     try {
//         const getleads = await adminleadModel.find();
//         return res.status(200).json({
//             status_code: 200,
//             status: "success",
//             data: getleads
//         });
//     }
//     catch (error) {
//         console.error("Error Fetching leads:", error);
//         return res.status(500).json({ error: "Internal server error" });

//     }
// };

// const editadminlead = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const updates = req.body;

//         const adminupdatelead = await adminleadModel.findByIdAndUpdate(id, updates, { new: true });

//         if (!adminupdatelead) {
//             return res.status(400).json({ error: "Lead not found" });

//         }
//         return res.status(200).json({
//             status_code: 200,
//             status: "success",
//             message: "updated successfully",
//             data: adminupdatelead,
//         })
//     } catch (error) {
//         console.error("Error updating lead:", error);
//         return res.status(500).json({ error: "Internal Server Error" })

//     }
// };

// const deleteadminlead = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const deltess = req.body;

//         const deleteadminlead = await adminleadModel.findByIdAndDelete(id, deltess, { new: true });

//         if (!deleteadminlead) {
//             return res.status(400).json({ error: "Lead not found" });
//         }
//         return res.status(200).json({
//             status_code: 200,
//             status: "success",
//             message: "adminlead deleted successfully",
//             data: deleteadminlead,
//         });
//     } catch (error) {
//         console.error("Error updating lead:", error);
//         return res.status(500).json({ error: "Internal Server Error" });

//     }
// }



// module.exports = { adminlead, getadminlead, editadminlead, deleteadminlead };