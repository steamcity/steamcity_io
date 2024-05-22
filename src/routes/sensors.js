const express = require("express");
const router = express.Router();
const { getSensorData, addSensorData, uploadCSV } = require("../controllers/sensorController");
const upload = require("../utils/upload");

router.get("/", getSensorData);
router.post("/", addSensorData);
router.post("/upload-csv", upload.single("csvFile"), uploadCSV);

module.exports = router;
