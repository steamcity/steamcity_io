const Storage = require("../utils/storage");
const SensorData = require("../models/SensorData");
const fs = require("fs").promises;

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

const uploadCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No CSV file provided"
            });
        }

        const csvContent = await fs.readFile(req.file.path, "utf8");
        const lines = csvContent.split("\\n").filter(line => line.trim());
        const headers = lines[0].split(",");

        const newData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",");
            const dataObj = {};
            headers.forEach((header, index) => {
                dataObj[header.trim()] = values[index] ? values[index].trim() : "";
            });

            try {
                const sensorData = new SensorData(dataObj);
                newData.push(sensorData);
            } catch (validationError) {
                console.warn(`Invalid data row ${i}:`, validationError.message);
            }
        }

        const currentData = await Storage.loadSensorData();
        const updatedData = [...currentData, ...newData];
        await Storage.saveSensorData(updatedData);

        // Cleanup uploaded file
        await fs.unlink(req.file.path);

        res.json({
            success: true,
            message: `Successfully imported ${newData.length} sensor readings`,
            imported: newData.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to process CSV upload",
            message: error.message
        });
    }
};

module.exports = {
    getSensorData,
    addSensorData,
    uploadCSV
};
