const express = require('express');
const router = express.Router();
const { getLeadWithPaymentProof } = require('../controllers/paymentproofController');

router.get('/lead/:id/paymentproof', getLeadWithPaymentProof);
// router.delete('/lead/:id/paymentproof', )
module.exports = router;
