const express = require('express')
const router = express.Router()
const { getExperiments, addExperiment } = require('../controllers/experimentController')

router.get('/', getExperiments)
router.post('/', addExperiment)

module.exports = router
