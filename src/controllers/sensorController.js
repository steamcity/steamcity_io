const SensorData = require('../models/SensorData');
const storage = require('../utils/storage');

const getSensorData = async (req, res) => {
  try {
    const {
      experimentId,
      sensorType,
      studentName,
      studentGroup,
      school,
      city,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 1000,
      hasLocation = null,
      northEast = null,
      southWest = null
    } = req.query;

    const filters = {};
    if (experimentId) filters.experimentId = experimentId;
    if (sensorType) filters.sensorType = sensorType;
    if (studentName) filters.studentName = studentName;
    if (studentGroup) filters.studentGroup = studentGroup;
    if (school) filters.school = school;
    if (city) filters.city = city;
    if (search) filters.search = search;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (hasLocation !== null) filters.hasLocation = hasLocation === 'true';
    if (northEast && southWest) {
      filters.boundingBox = { northEast, southWest };
    }

    const allData = await storage.getSensorData(filters);

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedData = allData.slice(startIndex, endIndex);

    // Métadonnées de pagination
    const totalCount = allData.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.json({
      success: true,
      count: paginatedData.length,
      totalCount: totalCount,
      totalPages: totalPages,
      currentPage: pageNum,
      hasNext: hasNext,
      hasPrev: hasPrev,
      data: paginatedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sensor data',
      message: error.message
    });
  }
};

const addSensorData = async (req, res) => {
  try {
    const isArray = Array.isArray(req.body);
    
    if (isArray) {
      const { error } = SensorData.validateBulk(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid bulk sensor data',
          details: error.details
        });
      }
      
      const sensorDataObjects = req.body.map(item => new SensorData(item));
      const saved = await storage.addSensorData(sensorDataObjects.map(obj => obj.toJSON()));
      
      res.status(201).json({
        success: true,
        message: `${saved.length} sensor data entries added`,
        count: saved.length,
        data: saved
      });
    } else {
      const sensorData = new SensorData(req.body);
      const saved = await storage.addSensorData(sensorData.toJSON());
      
      res.status(201).json({
        success: true,
        message: 'Sensor data added successfully',
        data: saved[0]
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to add sensor data',
      message: error.message
    });
  }
};

const getSensorTypes = async (req, res) => {
  try {
    const data = await storage.getSensorData();
    const types = [...new Set(data.map(item => item.sensorType))];
    
    res.json({
      success: true,
      sensorTypes: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sensor types',
      message: error.message
    });
  }
};

const getDataStats = async (req, res) => {
  try {
    const data = await storage.getSensorData();
    
    const stats = {
      totalEntries: data.length,
      sensorTypes: [...new Set(data.map(item => item.sensorType))],
      students: [...new Set(data.map(item => item.studentName))],
      experiments: [...new Set(data.map(item => item.experimentId))],
      dateRange: {
        earliest: data.length > 0 ? new Date(Math.min(...data.map(d => new Date(d.timestamp)))) : null,
        latest: data.length > 0 ? new Date(Math.max(...data.map(d => new Date(d.timestamp)))) : null
      }
    };
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      message: error.message
    });
  }
};

const getDiverseSensorData = async (req, res) => {
  try {
    const { limit = 200 } = req.query;
    const limitNum = parseInt(limit);

    // Récupérer tous les capteurs avec localisation
    const allData = await storage.getSensorData({ hasLocation: true });

    // Grouper par localisation unique (latitude, longitude)
    const locationGroups = new Map();

    allData.forEach(sensor => {
      const locationKey = `${sensor.location.latitude.toFixed(3)},${sensor.location.longitude.toFixed(3)}`;
      if (!locationGroups.has(locationKey)) {
        locationGroups.set(locationKey, []);
      }
      locationGroups.get(locationKey).push(sensor);
    });

    // Prendre un échantillon de chaque localisation
    const diverseSensors = [];
    const locationsArray = Array.from(locationGroups.entries());

    // Mélanger les localisations pour avoir une distribution aléatoire
    for (let i = locationsArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [locationsArray[i], locationsArray[j]] = [locationsArray[j], locationsArray[i]];
    }

    // Prendre quelques capteurs de chaque localisation jusqu'à atteindre la limite
    const sensorsPerLocation = Math.max(1, Math.floor(limitNum / locationGroups.size));

    for (const [locationKey, sensors] of locationsArray) {
      const sampleCount = Math.min(sensorsPerLocation, sensors.length);
      for (let i = 0; i < sampleCount && diverseSensors.length < limitNum; i++) {
        diverseSensors.push(sensors[i]);
      }
      if (diverseSensors.length >= limitNum) break;
    }

    res.json({
      success: true,
      count: diverseSensors.length,
      totalCount: allData.length,
      locationsCount: locationGroups.size,
      data: diverseSensors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve diverse sensor data',
      message: error.message
    });
  }
};

const getSensorTypesByExperiment = async (req, res) => {
  try {
    const { experimentId } = req.query;

    if (!experimentId) {
      return res.status(400).json({
        success: false,
        error: 'experimentId parameter is required'
      });
    }

    // Récupérer tous les capteurs pour cette expérience
    const sensorData = await storage.getSensorData({ experimentId });

    // Extraire les types uniques de capteurs
    const sensorTypes = [...new Set(sensorData.map(sensor => sensor.sensorType))];

    res.json({
      success: true,
      experimentId: experimentId,
      count: sensorTypes.length,
      data: sensorTypes.sort()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sensor types',
      message: error.message
    });
  }
};

const getUniqueSensors = async (req, res) => {
  try {
    const {
      experimentId,
      sensorType,
      studentName,
      studentGroup,
      school,
      city,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    // Récupérer toutes les mesures avec les filtres
    const filters = {};
    if (experimentId) filters.experimentId = experimentId;
    if (sensorType) filters.sensorType = sensorType;
    if (studentName) filters.studentName = studentName;
    if (studentGroup) filters.studentGroup = studentGroup;
    if (school) filters.school = school;
    if (city) filters.city = city;
    if (search) filters.search = search;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const allMeasurements = await storage.getSensorData(filters);

    // Aggreger les mesures en capteurs uniques
    const sensorMap = {};

    allMeasurements.forEach(measurement => {
      const key = `${measurement.experimentId}_${measurement.sensorType}`;

      if (!sensorMap[key]) {
        sensorMap[key] = {
          id: key,
          experimentId: measurement.experimentId,
          studentName: measurement.studentName,
          studentGroup: measurement.studentGroup,
          school: measurement.school,
          city: measurement.city,
          sensorType: measurement.sensorType,
          unit: measurement.unit,
          measurementCount: 0,
          firstMeasurement: measurement.timestamp,
          lastMeasurement: measurement.timestamp,
          minValue: measurement.value,
          maxValue: measurement.value,
          totalValue: 0,
          deviceIds: new Set()
        };
      }

      const sensor = sensorMap[key];
      sensor.measurementCount++;
      sensor.totalValue += measurement.value;

      // Mettre à jour les statistiques
      if (new Date(measurement.timestamp) < new Date(sensor.firstMeasurement)) {
        sensor.firstMeasurement = measurement.timestamp;
      }
      if (new Date(measurement.timestamp) > new Date(sensor.lastMeasurement)) {
        sensor.lastMeasurement = measurement.timestamp;
        sensor.lastValue = measurement.value;
      }

      sensor.minValue = Math.min(sensor.minValue, measurement.value);
      sensor.maxValue = Math.max(sensor.maxValue, measurement.value);

      // Ajouter l'ID du device s'il existe
      if (measurement.metadata?.deviceId) {
        sensor.deviceIds.add(measurement.metadata.deviceId);
      }
    });

    // Convertir en array et calculer les moyennes
    const uniqueSensors = Object.values(sensorMap).map(sensor => ({
      ...sensor,
      avgValue: Math.round((sensor.totalValue / sensor.measurementCount) * 100) / 100,
      deviceIds: Array.from(sensor.deviceIds)
    }));

    // Supprimer totalValue qui n'est plus nécessaire
    uniqueSensors.forEach(sensor => delete sensor.totalValue);

    // Pagination sur les capteurs uniques
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedSensors = uniqueSensors.slice(startIndex, endIndex);

    // Métadonnées de pagination
    const totalCount = uniqueSensors.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.json({
      success: true,
      count: paginatedSensors.length,
      totalCount: totalCount,
      totalPages: totalPages,
      currentPage: pageNum,
      hasNext: hasNext,
      hasPrev: hasPrev,
      totalMeasurements: allMeasurements.length, // Nombre total de mesures
      data: paginatedSensors
    });
  } catch (error) {
    console.error('Error getting unique sensors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve unique sensors',
      message: error.message
    });
  }
};

module.exports = {
  getSensorData,
  addSensorData,
  getSensorTypes,
  getDataStats,
  getDiverseSensorData,
  getSensorTypesByExperiment,
  getUniqueSensors
};