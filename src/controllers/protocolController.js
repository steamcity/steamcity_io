const fs = require('fs').promises;
const path = require('path');

const getProtocols = async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    const protocolsPath = path.join(__dirname, '../../data/protocols.json');
    const data = await fs.readFile(protocolsPath, 'utf8');
    const protocols = JSON.parse(data);

    // Transforme chaque protocole pour la langue demandée
    const transformedProtocols = protocols.map(protocol => {
      const translation = protocol.translations[language] || protocol.translations['en'];

      return {
        id: protocol.id,
        name: translation.name,
        description: translation.description,
        objectives: translation.objectives,
        category: protocol.category,
        duration: protocol.duration,
        requiredSensors: protocol.requiredSensors,
        language: language
      };
    });

    res.json({
      success: true,
      count: transformedProtocols.length,
      data: transformedProtocols
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve protocols',
      message: error.message
    });
  }
};

const getProtocolById = async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'en' } = req.query;
    const protocolsPath = path.join(__dirname, '../../data/protocols.json');
    const data = await fs.readFile(protocolsPath, 'utf8');
    const protocols = JSON.parse(data);

    const protocol = protocols.find(p => p.id === id);

    if (!protocol) {
      return res.status(404).json({
        success: false,
        error: 'Protocol not found'
      });
    }

    const translation = protocol.translations[language] || protocol.translations['en'];

    const transformedProtocol = {
      id: protocol.id,
      name: translation.name,
      description: translation.description,
      objectives: translation.objectives,
      category: protocol.category,
      duration: protocol.duration,
      requiredSensors: protocol.requiredSensors,
      language: language
    };

    res.json({
      success: true,
      data: transformedProtocol
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve protocol',
      message: error.message
    });
  }
};

module.exports = {
  getProtocols,
  getProtocolById
};