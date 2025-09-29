const Storage = require("../utils/storage");
const SensorData = require("../models/SensorData");
const fs = require("fs").promises;
const path = require("path");

const getSensorData = async (req, res) => {
    try {
        const data = await Storage.loadSensorData();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || null;
        const experimentId = req.query.experimentId;

        let filteredData = data;
        if (experimentId) {
            filteredData = data.filter(sensor => sensor.experimentId === experimentId);
        }

        let paginatedData = filteredData;

        if (limit) {
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            paginatedData = filteredData.slice(startIndex, endIndex);
        }

        res.json({
            success: true,
            count: paginatedData.length,
            total: filteredData.length,
            page: page,
            totalPages: limit ? Math.ceil(filteredData.length / limit) : 1,
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
        const limit = parseInt(req.query.limit) || null;
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
        let paginatedSensors = uniqueSensors;

        if (limit) {
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            paginatedSensors = uniqueSensors.slice(startIndex, endIndex);
        }

        res.json({
            success: true,
            count: paginatedSensors.length,
            total: uniqueSensors.length,
            page: page,
            totalPages: limit ? Math.ceil(uniqueSensors.length / limit) : 1,
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

// New functions for the modern sensor data model

const getSensorDevices = async (req, res) => {
    try {
        const experimentId = req.query.experimentId;
        const dataPath = path.join(__dirname, '../../data/sensors-devices.json');
        const rawData = await fs.readFile(dataPath, 'utf8');
        const sensors = JSON.parse(rawData);

        let filteredSensors = sensors;
        if (experimentId) {
            filteredSensors = sensors.filter(sensor => sensor.experiment_id === experimentId);
        }

        res.json({
            success: true,
            count: filteredSensors.length,
            data: filteredSensors
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to retrieve sensor devices",
            message: error.message
        });
    }
};

const getSensorDevice = async (req, res) => {
    try {
        const sensorId = req.params.id;
        const dataPath = path.join(__dirname, '../../data/sensors-devices.json');
        const rawData = await fs.readFile(dataPath, 'utf8');
        const sensors = JSON.parse(rawData);

        const sensor = sensors.find(s => s.id === sensorId);

        if (!sensor) {
            return res.status(404).json({
                success: false,
                error: "Sensor device not found"
            });
        }

        res.json({
            success: true,
            data: sensor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to retrieve sensor device",
            message: error.message
        });
    }
};

const getSensorTypes = async (req, res) => {
    try {
        const dataPath = path.join(__dirname, '../../data/sensor-types.json');
        const rawData = await fs.readFile(dataPath, 'utf8');
        const sensorTypes = JSON.parse(rawData);

        res.json({
            success: true,
            count: sensorTypes.length,
            data: sensorTypes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to retrieve sensor types",
            message: error.message
        });
    }
};

const getSensorMeasurements = async (req, res) => {
    try {
        const { sensorId, experimentId, from, to, period, limit = null } = req.query;

        // Calculate date range based on period
        let fromDate = from ? new Date(from) : null;
        let toDate = to ? new Date(to) : null;

        if (period && !from && !to) {
            const now = new Date();
            toDate = now;

            switch (period) {
                case '24h':
                    fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case 'all':
                    fromDate = null;
                    toDate = null;
                    break;
                default:
                    fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
            }

        }

        // Load measurements
        const measurementsPath = path.join(__dirname, '../../data/sensor-measurements.json');
        const historyPath = path.join(__dirname, '../../data/sensor-measurements-history.json');

        let measurements = [];

        try {
            const rawMeasurements = await fs.readFile(measurementsPath, 'utf8');
            measurements = JSON.parse(rawMeasurements);
        } catch (err) {
            console.warn('No recent measurements file found');
        }

        try {
            const rawHistory = await fs.readFile(historyPath, 'utf8');
            const historyData = JSON.parse(rawHistory);

            // Convert history format to individual measurements
            historyData.forEach(sensorHistory => {
                sensorHistory.data.forEach(point => {
                    measurements.push({
                        id: `hist-${sensorHistory.sensor_id}-${point.timestamp}`,
                        sensor_id: sensorHistory.sensor_id,
                        sensor_type_id: sensorHistory.sensor_type_id,
                        experiment_id: sensorHistory.experiment_id,
                        timestamp: point.timestamp,
                        value: point.value,
                        quality: {
                            score: point.quality,
                            status: point.quality > 0.95 ? 'excellent' : point.quality > 0.9 ? 'good' : 'fair'
                        }
                    });
                });
            });
        } catch (err) {
            console.warn('No history measurements file found');
        }

        // Filter measurements
        let filteredMeasurements = measurements;

        if (sensorId) {
            filteredMeasurements = filteredMeasurements.filter(m => m.sensor_id === sensorId);
        }

        if (experimentId) {
            filteredMeasurements = filteredMeasurements.filter(m => m.experiment_id === experimentId);
        }

        if (fromDate) {
            filteredMeasurements = filteredMeasurements.filter(m => new Date(m.timestamp) >= fromDate);
        }

        if (toDate) {
            filteredMeasurements = filteredMeasurements.filter(m => new Date(m.timestamp) <= toDate);
        }

        // Sort by timestamp (most recent first)
        filteredMeasurements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Limit results
        const limitedMeasurements = limit ? filteredMeasurements.slice(0, parseInt(limit)) : filteredMeasurements;

        res.json({
            success: true,
            count: limitedMeasurements.length,
            total: filteredMeasurements.length,
            data: limitedMeasurements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to retrieve sensor measurements",
            message: error.message
        });
    }
};

module.exports = {
    getSensorData,
    getUniqueSensors,
    addSensorData,
    uploadCSV,
    getSensorDevices,
    getSensorDevice,
    getSensorTypes,
    getSensorMeasurements
};
