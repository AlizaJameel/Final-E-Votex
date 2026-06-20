const express = require('express');
const router = express.Router();
const { placeholder } = require('../controllers/resultController');

router.get('/', placeholder);

module.exports = router;
