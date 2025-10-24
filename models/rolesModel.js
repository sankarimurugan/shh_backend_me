const mongoose = require('mongoose');

const rolesSchema = new mongoose.Schema({
    addroles:{type: String, required: true},
}, {timestamps: true});

module.exports = mongoose.model('Roles', rolesSchema);