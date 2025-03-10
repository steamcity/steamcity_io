const Storage = require("../utils/storage");
const SensorData = require("../models/SensorData");
const fs = require("fs").promises;

const getSensorData = async (req, res) => {
    try {
        const data = await Storage.loadSensorData();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        const paginatedData = data.slice(startIndex, endIndex);

        res.json({
            success: true,
            count: paginatedData.length,
            total: data.length,
            page: page,
            totalPages: Math.ceil(data.length / limit),
            data: paginatedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to retrieve sensor data"
        });
    }
};

const getUniqueSensors = async (req, res) => {
    try {
        const data = await Storage.loadSensorData();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const experimentId = req.query.experimentId;

        let filteredData = data;
        if (experimentId) {
            filteredData = data.filter(sensor => sensor.experimentId === experimentId);
        }

        // Group by experiment and sensor type to create unique sensors
        const sensorGroups = {};
        filteredData.forEach(measurement => {
            const key = `${measurement.experimentId}_${measurement.sensorType}`;
            if (!sensorGroups[key]) {
                sensorGroups[key] = {
                    experimentId: measurement.experimentId,
                    sensorType: measurement.sensorType,
                    measurements: [],
                    lastValue: null,
                    lastTimestamp: null,
                    studentName: measurement.studentName,
                    location: measurement.location
                };
            }
            sensorGroups[key].measurements.push(measurement);
            if (!sensorGroups[key].lastTimestamp || new Date(measurement.timestamp) > new Date(sensorGroups[key].lastTimestamp)) {
                sensorGroups[key].lastValue = measurement.value;
                sensorGroups[key].lastTimestamp = measurement.timestamp;
                sensorGroups[key].unit = measurement.unit;
            }
        });

        const uniqueSensors = Object.values(sensorGroups);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedSensors = uniqueSensors.slice(startIndex, endIndex);

        res.json({
            success: true,
            count: paginatedSensors.length,
            total: uniqueSensors.length,
            page: page,
            totalPages: Math.ceil(uniqueSensors.length / limit),
            data: paginatedSensors
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to retrieve unique sensors"
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
    getUniqueSensors,
    addSensorData,
    uploadCSV
};
