const express = require('express');
const router = express.Router();

const {
  getExperiments,
  createExperiment,
  getExperimentById,
  getExperimentData
} = require('../controllers/experimentController');

router.get('/', getExperiments);

router.post('/', createExperiment);

router.get('/:id', getExperimentById);

router.get('/:id/data', getExperimentData);

module.exports = router;