const express = require("express");
const router = express.Router();
const { getSensorData, getUniqueSensors, addSensorData, uploadCSV } = require("../controllers/sensorController");
const upload = require("../utils/upload");

router.get("/", getSensorData);
router.get("/unique", getUniqueSensors);
router.post("/", addSensorData);
router.post("/upload-csv", upload.single("csvFile"), uploadCSV);

module.exports = router;
