const Experiment = require('../models/Experiment');
const storage = require('../utils/storage');

const getExperiments = async (req, res) => {
  try {
    const {
      studentName,
      studentGroup,
      school,
      city,
      language,
      status,
      protocolId,
      search,
      startDate,
      endDate,
      includePrivate
    } = req.query;

    const filters = {};
    if (studentName) filters.studentName = studentName;
    if (studentGroup) filters.studentGroup = studentGroup;
    if (school) filters.school = school;
    if (city) filters.city = city;
    if (language) filters.language = language;
    if (status) filters.status = status;
    if (protocolId) filters.protocol = protocolId;
    if (search) filters.search = search;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (includePrivate === 'true') filters.includePrivate = true;

    const experiments = await storage.getExperiments(filters);
    
    res.json({
      success: true,
      count: experiments.length,
      data: experiments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve experiments',
      message: error.message
    });
  }
};

const createExperiment = async (req, res) => {
  try {
    const experiment = new Experiment(req.body);
    const saved = await storage.addExperiment(experiment.toJSON());
    
    res.status(201).json({
      success: true,
      message: 'Experiment created successfully',
      data: saved
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to create experiment',
      message: error.message
    });
  }
};

const getExperimentById = async (req, res) => {
  try {
    const { id } = req.params;
    const experiment = await storage.getExperimentById(id);
    
    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    if (experiment.isPublic === false) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to private experiment'
      });
    }
    
    res.json({
      success: true,
      data: experiment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve experiment',
      message: error.message
    });
  }
};

const getExperimentData = async (req, res) => {
  try {
    const { id } = req.params;
    const experiment = await storage.getExperimentById(id);
    
    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    if (experiment.isPublic === false) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to private experiment'
      });
    }

    const sensorData = await storage.getSensorDataByExperiment(id);
    
    res.json({
      success: true,
      experiment: experiment,
      sensorData: {
        count: sensorData.length,
        data: sensorData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve experiment data',
      message: error.message
    });
  }
};

module.exports = {
  getExperiments,
  createExperiment,
  getExperimentById,
  getExperimentData
};