const fs = require('fs').promises;
const path = require('path');
const { clusterSchema, protocolSchema } = require('../models/clusterModel');

const CLUSTERS_FILE = path.join(__dirname, '../../data/clusters.json');
const PROTOCOLS_FILE = path.join(__dirname, '../../data/protocols.json');

const loadClusters = async () => {
  try {
    const data = await fs.readFile(CLUSTERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const loadProtocols = async () => {
  try {
    const data = await fs.readFile(PROTOCOLS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const getAllClusters = async (req, res) => {
  try {
    const clusters = await loadClusters();
    res.json({
      success: true,
      data: clusters,
      count: clusters.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading clusters',
      error: error.message
    });
  }
};

const getClusterById = async (req, res) => {
  try {
    const { id } = req.params;
    const clusters = await loadClusters();
    const cluster = clusters.find(c => c.id === parseInt(id));

    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Cluster not found'
      });
    }

    res.json({
      success: true,
      data: cluster
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading cluster',
      error: error.message
    });
  }
};

const getClusterProtocols = async (req, res) => {
  try {
    const { id } = req.params;
    const clusters = await loadClusters();
    const protocols = await loadProtocols();

    const cluster = clusters.find(c => c.id === parseInt(id));
    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Cluster not found'
      });
    }

    const clusterProtocols = protocols.filter(p =>
      p.primaryCluster === parseInt(id) || p.secondaryClusters.includes(parseInt(id))
    );

    res.json({
      success: true,
      data: {
        cluster: {
          id: cluster.id,
          name: cluster.name,
          title: cluster.title
        },
        protocols: clusterProtocols
      },
      count: clusterProtocols.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading cluster protocols',
      error: error.message
    });
  }
};

const getAllProtocols = async (req, res) => {
  try {
    const { cluster, difficulty, search } = req.query;
    let protocols = await loadProtocols();

    if (cluster) {
      const clusterId = parseInt(cluster);
      protocols = protocols.filter(p =>
        p.primaryCluster === clusterId || p.secondaryClusters.includes(clusterId)
      );
    }

    if (difficulty) {
      protocols = protocols.filter(p => p.difficulty === difficulty);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      protocols = protocols.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.keywords.some(k => k.toLowerCase().includes(searchLower))
      );
    }

    res.json({
      success: true,
      data: protocols,
      count: protocols.length,
      filters: {
        cluster: cluster || null,
        difficulty: difficulty || null,
        search: search || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading protocols',
      error: error.message
    });
  }
};

const getProtocolById = async (req, res) => {
  try {
    const { id } = req.params;
    const protocols = await loadProtocols();
    const clusters = await loadClusters();

    const protocol = protocols.find(p => p.id === id);
    if (!protocol) {
      return res.status(404).json({
        success: false,
        message: 'Protocol not found'
      });
    }

    const primaryCluster = clusters.find(c => c.id === protocol.primaryCluster);
    const secondaryClusters = clusters.filter(c =>
      protocol.secondaryClusters.includes(c.id)
    );

    const enrichedProtocol = {
      ...protocol,
      primaryClusterData: primaryCluster ? {
        id: primaryCluster.id,
        name: primaryCluster.name,
        title: primaryCluster.title
      } : null,
      secondaryClustersData: secondaryClusters.map(c => ({
        id: c.id,
        name: c.name,
        title: c.title
      }))
    };

    res.json({
      success: true,
      data: enrichedProtocol
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading protocol',
      error: error.message
    });
  }
};

const searchProtocols = async (req, res) => {
  try {
    const { q, cluster, difficulty } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter "q" is required'
      });
    }

    const protocols = await loadProtocols();
    const clusters = await loadClusters();
    const searchLower = q.toLowerCase();

    let filteredProtocols = protocols.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower) ||
      p.keywords.some(k => k.toLowerCase().includes(searchLower))
    );

    if (cluster) {
      const clusterId = parseInt(cluster);
      filteredProtocols = filteredProtocols.filter(p =>
        p.primaryCluster === clusterId || p.secondaryClusters.includes(clusterId)
      );
    }

    if (difficulty) {
      filteredProtocols = filteredProtocols.filter(p => p.difficulty === difficulty);
    }

    const enrichedProtocols = filteredProtocols.map(protocol => {
      const primaryCluster = clusters.find(c => c.id === protocol.primaryCluster);
      return {
        ...protocol,
        primaryClusterData: primaryCluster ? {
          id: primaryCluster.id,
          name: primaryCluster.name,
          title: primaryCluster.title
        } : null
      };
    });

    res.json({
      success: true,
      data: enrichedProtocols,
      count: enrichedProtocols.length,
      query: {
        search: q,
        cluster: cluster || null,
        difficulty: difficulty || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching protocols',
      error: error.message
    });
  }
};

module.exports = {
  getAllClusters,
  getClusterById,
  getClusterProtocols,
  getAllProtocols,
  getProtocolById,
  searchProtocols
};