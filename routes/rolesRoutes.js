const express = require('express');
const { addroles, getrolesname, editRole, deleteroles } = require('../controllers/rolesController');
const router = express.Router();

router.post('/addroles', addroles);
router.get('/getroles', getrolesname);
router.put('/editroles/:id', editRole);
router.delete('/deleteroles/:id', deleteroles);
module.exports = router;