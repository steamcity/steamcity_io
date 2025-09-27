const express = require("express");
const router = express.Router();
const {
    getSensorData,
    getUniqueSensors,
    addSensorData,
    uploadCSV,
    getSensorDevices,
    getSensorTypes,
    getSensorMeasurements
} = require("../controllers/sensorController");
const upload = require("../utils/upload");

// Legacy routes (keep for compatibility)
router.get("/", getSensorData);
router.get("/unique", getUniqueSensors);
router.post("/", addSensorData);
router.post("/upload-csv", upload.single("csvFile"), uploadCSV);

// New modern sensor API routes
router.get("/devices", getSensorDevices);
router.get("/types", getSensorTypes);
router.get("/measurements", getSensorMeasurements);

module.exports = router;
