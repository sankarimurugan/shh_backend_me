require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not set in environment.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    const db = conn.connection.db;
    const collection = db.collection('telecallers');

    const indexes = await collection.indexes();
    const hasNumberIndex = indexes.some((idx) => idx.name === 'number_1');

    if (hasNumberIndex) {
      console.log('Dropping index number_1 on telecallers...');
      await collection.dropIndex('number_1');
      console.log('Dropped index number_1 successfully.');
    } else {
      console.log('Index number_1 not found on telecallers. No action needed.');
    }

    // Optionally ensure Mongoose model indexes are in sync (won't recreate number_1 unless defined in schema)
    try {
      await mongoose.model('Telecaller').syncIndexes();
    } catch (e) {
      // If model isn't loaded, ignore
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to drop index number_1:', err);
    process.exit(1);
  }
})();