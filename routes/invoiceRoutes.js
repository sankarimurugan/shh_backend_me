const express = require('express');
const router = express.Router();
const { generateInvoice } = require('../controllers/invoiceController');


router.get('/invoice/:leadId', generateInvoice);

module.exports = router;
