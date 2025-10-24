const express = require('express');
const  {sourcecreate, getsourcename, getuserSourceId, editsourcename, deletesourcename} = require('../controllers/sourceController');
const router = express.Router();

router.post('/sourcename', sourcecreate);
router.get('/sourceget', getsourcename );
router.get('/sourceget/:id', getuserSourceId)
router.put('/sourceedit/:id',editsourcename)
router.delete('/sourcedelete/:id',deletesourcename )
module.exports = router;