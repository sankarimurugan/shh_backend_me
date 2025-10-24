const express = require('express');
const { modeofamount, getamountname, editamountname, deleteamount } = require('../controllers/modeamountController');
const router = express.Router();

router.post('/modeamount', modeofamount);
router.get('/getamount', getamountname);
router.put('/editamount/:id', editamountname);
router.delete('/deleteamount/:id', deleteamount);

module.exports = router;