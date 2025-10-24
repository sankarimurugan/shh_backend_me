const express = require('express');
const {paymentlead, getpaymentlead, editpayment,deletepayment,getpaymentleadById,getPaymentLeadByIdOrName,getPaymentById } = require('../controllers/paymentdetailController');
const { authMiddleware } = require('../middlewares/authmiddleware');

const router = express.Router();

// Protected routes - require authentication
router.post('/payment', authMiddleware, paymentlead);
router.get('/getpayment', authMiddleware, getpaymentlead);
router.get('/getpayment/:id', authMiddleware, getpaymentleadById);
router.get('/detailsgetpaymentid/:id', authMiddleware, getPaymentLeadByIdOrName);
router.put('/editpayment/:id', authMiddleware, editpayment);
router.delete('/deletepayment/:id', authMiddleware, deletepayment);
router.get('/payment/id/:id', authMiddleware, getPaymentById);

module.exports = router;
