const mongoose = require ('mongoose');

const modeamountSchema = new mongoose.Schema({
    amountname : {type: String, required: true},
}, {timestamps: true});

module.exports = mongoose.model('ModeofAmount', modeamountSchema);