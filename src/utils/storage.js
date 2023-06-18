const fs = require('fs').promises;
const path = require('path');

class DataStorage {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.sensorsFile = path.join(this.dataDir, 'sensors.json');
    this.experimentsFile = path.join(this.dataDir, 'experiments.json');
  }

  async ensureDataDir() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  async readFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async writeFile(filePath, data) {
    await this.ensureDataDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async getSensorData(filters = {}) {
    const data = await this.readFile(this.sensorsFile);
    
    if (!Object.keys(filters).length) {
      return data;
    }

    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (key === 'startDate' && item.timestamp) {
          return new Date(item.timestamp) >= new Date(value);
        }
        if (key === 'endDate' && item.timestamp) {
          return new Date(item.timestamp) <= new Date(value);
        }
        if (key === 'hasLocation') {
          const hasValidLocation = item.location &&
            item.location.latitude !== undefined &&
            item.location.longitude !== undefined;
          return value ? hasValidLocation : !hasValidLocation;
        }
        if (key === 'boundingBox' && item.location) {
          // Parse les coordonnées de la bounding box
          const [neLat, neLng] = value.northEast.split(',').map(Number);
          const [swLat, swLng] = value.southWest.split(',').map(Number);

          const lat = item.location.latitude;
          const lng = item.location.longitude;

          // Vérifier que le point est dans la bounding box
          return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
        }
        // Recherche textuelle dans plusieurs champs
        if (key === 'search') {
          const searchTerm = value.toLowerCase();
          return (
            (item.studentName && item.studentName.toLowerCase().includes(searchTerm)) ||
            (item.studentGroup && item.studentGroup.toLowerCase().includes(searchTerm)) ||
            (item.sensorType && item.sensorType.toLowerCase().includes(searchTerm)) ||
            (item.notes && item.notes.toLowerCase().includes(searchTerm)) ||
            (item.location && item.location.description &&
             item.location.description.toLowerCase().includes(searchTerm))
          );
        }
        // Filtrage par ville (extrait du champ school)
        if (key === 'city' && item.school) {
          return item.school.toLowerCase().includes(value.toLowerCase());
        }
        // Filtrage par école (recherche partielle dans le nom de l'école)
        if (key === 'school' && item.school) {
          return item.school.toLowerCase().includes(value.toLowerCase());
        }
        // Filtrage partiel pour le nom d'étudiant
        if (key === 'studentName' && item.studentName) {
          return item.studentName.toLowerCase().includes(value.toLowerCase());
        }
        // Filtrage partiel pour le groupe
        if (key === 'studentGroup' && item.studentGroup) {
          return item.studentGroup.toLowerCase().includes(value.toLowerCase());
        }
        // Filtrage exact pour les autres champs
        return item[key] === value;
      });
    });
  }

  async addSensorData(data) {
    const existing = await this.readFile(this.sensorsFile);
    const newData = Array.isArray(data) ? data : [data];
    const updated = [...existing, ...newData];
    await this.writeFile(this.sensorsFile, updated);
    return newData;
  }

  async getExperiments(filters = {}) {
    const data = await this.readFile(this.experimentsFile);

    if (!Object.keys(filters).length) {
      return data.filter(exp => exp.isPublic !== false);
    }

    return data.filter(item => {
      if (item.isPublic === false && !filters.includePrivate) {
        return false;
      }

      return Object.entries(filters).every(([key, value]) => {
        if (key === 'includePrivate') return true;

        // Filtrage par dates
        if (key === 'startDate' && item.createdAt) {
          return new Date(item.createdAt) >= new Date(value);
        }
        if (key === 'endDate' && item.createdAt) {
          return new Date(item.createdAt) <= new Date(value);
        }

        // Recherche textuelle dans plusieurs champs
        if (key === 'search') {
          const searchTerm = value.toLowerCase();
          return (
            (item.title && item.title.toLowerCase().includes(searchTerm)) ||
            (item.description && item.description.toLowerCase().includes(searchTerm)) ||
            (item.studentName && item.studentName.toLowerCase().includes(searchTerm)) ||
            (item.studentGroup && item.studentGroup.toLowerCase().includes(searchTerm)) ||
            (item.school && item.school.toLowerCase().includes(searchTerm)) ||
            (item.objectives && item.objectives.toLowerCase().includes(searchTerm)) ||
            (item.location && item.location.description &&
             item.location.description.toLowerCase().includes(searchTerm))
          );
        }

        // Filtrage par ville (champ city direct ou extrait du champ school ou location.city)
        if (key === 'city') {
          const cityDirect = item.city ? item.city.toLowerCase() === value.toLowerCase() : false;
          const cityFromSchool = item.school ? item.school.toLowerCase().includes(value.toLowerCase()) : false;
          const cityFromLocation = item.location && item.location.city ?
            item.location.city.toLowerCase().includes(value.toLowerCase()) : false;
          return cityDirect || cityFromSchool || cityFromLocation;
        }

        // Filtrage partiel pour le nom d'école
        if (key === 'school' && item.school) {
          return item.school.toLowerCase().includes(value.toLowerCase());
        }

        // Filtrage partiel pour le nom d'étudiant
        if (key === 'studentName' && item.studentName) {
          return item.studentName.toLowerCase().includes(value.toLowerCase());
        }

        // Filtrage partiel pour le groupe
        if (key === 'studentGroup' && item.studentGroup) {
          return item.studentGroup.toLowerCase().includes(value.toLowerCase());
        }

        // Filtrage exact pour les autres champs
        return item[key] === value;
      });
    });
  }

  async addExperiment(experiment) {
    const existing = await this.readFile(this.experimentsFile);
    const updated = [...existing, experiment];
    await this.writeFile(this.experimentsFile, updated);
    return experiment;
  }

  async getExperimentById(id) {
    const experiments = await this.readFile(this.experimentsFile);
    return experiments.find(exp => exp.id === id);
  }

  async getSensorDataByExperiment(experimentId) {
    return await this.getSensorData({ experimentId });
  }
}

module.exports = new DataStorage();