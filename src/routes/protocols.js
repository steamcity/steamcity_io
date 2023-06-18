const express = require('express');
const router = express.Router();
const { getProtocols, getProtocolById } = require('../controllers/protocolController');

router.get('/', getProtocols);
router.get('/:id', getProtocolById);

module.exports = router;