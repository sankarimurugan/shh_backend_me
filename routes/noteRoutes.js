const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');

router.post('/addnotes', noteController.createNote);
router.put('/update/:messageId', noteController.updateNote);
router.delete('/delete/:messageId', noteController.deleteNote);
router.get('/allnotes/:leadId', noteController.getAllNotes);
router.get('/note/:id', noteController.getNoteById);

module.exports = router;
