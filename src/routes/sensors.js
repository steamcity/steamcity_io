const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const {
  getSensorData,
  addSensorData,
  getSensorTypes,
  getDataStats,
  getDiverseSensorData,
  getUniqueSensors
} = require('../controllers/sensorController');

const upload = multer({ dest: 'uploads/' });

router.get('/', getSensorData);

router.post('/', addSensorData);

router.get('/types', getSensorTypes);

router.get('/stats', getDataStats);

router.get('/diverse', getDiverseSensorData);

router.get('/unique', getUniqueSensors);

// router.get('/types-by-experiment', getSensorTypesByExperiment);

router.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No CSV file uploaded'
    });
  }

  const results = [];
  const filePath = req.file.path;

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          try {
            const processedData = {
              experimentId: data.experimentId || 'unknown',
              studentName: data.studentName || 'unknown',
              studentGroup: data.studentGroup || '',
              sensorType: data.sensorType || 'other',
              value: parseFloat(data.value) || 0,
              unit: data.unit || '',
              timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
              notes: data.notes || ''
            };
            results.push(processedData);
          } catch (error) {
            console.error('Error processing CSV row:', error);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const req_body_backup = req.body;
    req.body = results;
    
    await addSensorData(req, res);
    
    req.body = req_body_backup;
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file',
      message: error.message
    });
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });
  }
});

module.exports = router;