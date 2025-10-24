const mongoose = require ('mongoose');

const sourceSchema = new mongoose.Schema({
    sourcename: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Sourcename', sourceSchema);