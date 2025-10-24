const mongoose = require('mongoose');
const Telecaller = require('../models/telecallermodel');
require('dotenv').config();

// Connect to your database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkTelecaller() {
  try {
    // Find the specific telecaller by ID
    const telecaller = await Telecaller.findByOne(id);

    if (!telecaller) {
      console.log('Telecaller not found');
      return;
    }

    console.log('Telecaller details:', telecaller);

    // Check if staff_id exists
    if (telecaller._id) {
      console.log('Staff ID exists:', telecaller._id);
    } else {
      console.log('Staff ID does not exist. Generating one...');

      // Generate and save staff_id
      const count = await Telecaller.countDocuments();
      telecaller._id = `SHHTC${(count + 1).toString().padStart(4, "0")}`;
      await telecaller.save();

      console.log('Generated staff ID:', telecaller._id);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkTelecaller();
