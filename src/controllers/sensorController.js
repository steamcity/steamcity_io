const Storage = require("../utils/storage");
const SensorData = require("../models/SensorData");

const getSensorData = async (req, res) => {
    try {
        const data = await Storage.loadSensorData();
        res.json({
            success: true,
            count: data.length,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to retrieve sensor data"
        });
    }
};

const addSensorData = async (req, res) => {
    try {
        const sensorData = new SensorData(req.body);
        const currentData = await Storage.loadSensorData();
        currentData.push(sensorData);
        await Storage.saveSensorData(currentData);

        res.status(201).json({
            success: true,
            message: "Sensor data added successfully",
            data: sensorData
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: "Failed to add sensor data",
            message: error.message
        });
    }
};

module.exports = {
    getSensorData,
    addSensorData
};
