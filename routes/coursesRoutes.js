const express = require('express');
const { courses, getcoursename, editcoursename, deletecourse } = require('../controllers/couresController');
const router = express.Router();

router.post('/addcourse', courses);
router.get('/getcourse', getcoursename);
router.put('/editcourse/:id', editcoursename);
router.delete('/deletecourse/:id', deletecourse)
module.exports = router;