const mongoose = require('mongoose');
const Telecaller = require('../models/telecallermodel');
require('dotenv').config();

// Connect to your database
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function updateExistingTelecallers() {
    try {
        // Get all telecallers without staff_id
        const telecallers = await Telecaller.find({ _id: { $exists: false } });
        
        console.log(`Found ${telecallers.length} telecallers without staff_id`);
        
        // Update each telecaller
        for (let i = 0; i < telecallers.length; i++) {
            const telecaller = telecallers[i];
            // Generate staff_id (SHHTC + 4-digit number)
            const _id = `SHHTC${(i + 1).toString().padStart(4, "0")}`;
            
            // Update the telecaller
            await Telecaller.updateOne(
                { _id: telecaller._id },
                { $set: { _id:_id } }
            );
            
            console.log(`Updated telecaller ${telecaller.name} with staff_id ${_id}`);
        }
        
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        mongoose.disconnect();
    }
}

updateExistingTelecallers();