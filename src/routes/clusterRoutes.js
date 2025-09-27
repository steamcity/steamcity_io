const express = require('express');
const router = express.Router();
const {
  getAllClusters,
  getClusterById,
  getClusterProtocols,
  getAllProtocols,
  getProtocolById,
  searchProtocols
} = require('../controllers/clusterController');

router.get('/clusters', getAllClusters);
router.get('/clusters/:id', getClusterById);
router.get('/clusters/:id/protocols', getClusterProtocols);

router.get('/cluster-protocols', getAllProtocols);
router.get('/cluster-protocols/search', searchProtocols);
router.get('/cluster-protocols/:id', getProtocolById);

module.exports = router;