/**
 * SensorsManager
 * Manages the sensors view, filters, and sensor details display
 */
export class SensorsManager {
    /**
     * Constructor
     * @param {Object} config - Configuration object
     * @param {ApiService} config.apiService - API service instance
     * @param {DataVisualizationManager} config.dataVizManager - Data visualization manager for charts
     * @param {Object} config.protocolColors - Color mapping for protocols
     * @param {Function} config.getProtocolLabel - Function to get protocol label
     * @param {Array} config.experiments - Array of experiments
     * @param {Function} config.updateUrl - Callback to update URL
     * @param {Function} config.showView - Callback to show a view
     * @param {Function} config.showExperimentDetail - Callback to show experiment detail
     * @param {Object} config.urlParams - URL parameters
     */
    constructor(config) {
        this.apiService = config.apiService;
        this.dataVizManager = config.dataVizManager;
        this.protocolColors = config.protocolColors;
        this.getProtocolLabel = config.getProtocolLabel;
        this.experiments = config.experiments;
        this.updateUrl = config.updateUrl;
        this.showView = config.showView;
        this.showExperimentDetail = config.showExperimentDetail;
        this.urlParams = config.urlParams || {};

        // State
        this.currentSensor = null;
        this.sensorDetailChart = null;
        this.selectedExperimentForData = null;
    }

    /**
     * Load the sensors view with filters and data
     */
    async loadSensorsView() {
        await this.populateSensorsFilters();
        this.bindSensorsFilterEvents();
        this.applySensorsUrlParams(); // Apply URL parameters if any
        await this.applySensorsFilters(); // Load sensors with applied filters
    }

    /**
     * Apply URL parameters to sensor filters
     */
    applySensorsUrlParams() {
        if (!this.urlParams || Object.keys(this.urlParams).length === 0) return;

        // Map URL parameters to filter elements
        const paramMap = {
            'experiment': 'sensors-experiment-filter',
            'status': 'sensors-status-filter',
            'type': 'sensors-type-filter'
        };

        // Apply each URL parameter to corresponding filter
        Object.entries(this.urlParams).forEach(([key, value]) => {
            const elementId = paramMap[key];
            if (elementId) {
                const element = document.getElementById(elementId);
                if (element && value) {
                    element.value = decodeURIComponent(value);
                }
            }
        });

        // Update filter count and show advanced filters if needed
        this.updateSensorsFilterCount();
        const hasActiveFilters = Object.keys(this.urlParams).some(key => paramMap[key] && this.urlParams[key]);
        if (hasActiveFilters) {
            const additionalFilters = document.getElementById('sensors-additional-filters');
            const filterInput = document.getElementById('sensors-filter-input');
            if (additionalFilters && filterInput) {
                additionalFilters.style.display = 'block';
                filterInput.placeholder = 'Filtres avancés activés - ajustez les options ci-dessous';
            }
        }
    }

    /**
     * Populate sensor filters (experiments and types)
     */
    async populateSensorsFilters() {
        // Populate experiments filter
        const experimentSelect = document.getElementById('sensors-experiment-filter');
        if (experimentSelect) {
            // Clear existing options except the first one
            while (experimentSelect.children.length > 1) {
                experimentSelect.removeChild(experimentSelect.lastChild);
            }

            // Populate with experiments
            this.experiments.forEach(experiment => {
                const option = document.createElement('option');
                option.value = experiment.id;
                option.textContent = experiment.title;
                experimentSelect.appendChild(option);
            });
        }

        // Populate sensor types filter
        await this.populateSensorTypesFilter();
    }

    /**
     * Populate sensor types filter from API
     */
    async populateSensorTypesFilter() {
        try {
            const response = await fetch('/api/sensors/devices');
            const data = await response.json();

            if (data.success) {
                const typeSelect = document.getElementById('sensors-type-filter');
                if (typeSelect) {
                    // Clear existing options except the first one
                    while (typeSelect.children.length > 1) {
                        typeSelect.removeChild(typeSelect.lastChild);
                    }

                    // Get unique sensor types
                    const uniqueTypes = [...new Set(data.data.map(sensor => sensor.sensor_type_id))];

                    uniqueTypes.forEach(type => {
                        const option = document.createElement('option');
                        option.value = type;
                        option.textContent = type;
                        typeSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error populating sensor types filter:', error);
        }
    }

    /**
     * Bind event listeners to sensor filter controls
     */
    bindSensorsFilterEvents() {
        // Filter elements
        const experimentFilter = document.getElementById('sensors-experiment-filter');
        const statusFilter = document.getElementById('sensors-status-filter');
        const typeFilter = document.getElementById('sensors-type-filter');

        // Filter controls
        const clearFiltersBtn = document.getElementById('sensors-clear-filters');
        const filterSearchBox = document.getElementById('sensors-filter-search-box');

        // Modal controls
        const modalClose = document.querySelector('.sensor-modal-close');
        const modal = document.getElementById('sensor-detail-modal');

        // Auto-apply filters when changed
        [experimentFilter, statusFilter, typeFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => this.applySensorsFilters());
            }
        });

        // Clear filters button
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearSensorsFilters());
        }

        // Filter search box click to show/hide advanced filters
        if (filterSearchBox) {
            filterSearchBox.addEventListener('click', () => this.toggleSensorsAdvancedFilters());
        }

        // Modal close events
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.closeSensorModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeSensorModal();
                }
            });
        }
    }

    /**
     * Toggle advanced filters visibility
     */
    toggleSensorsAdvancedFilters() {
        const additionalFilters = document.getElementById('sensors-additional-filters');
        const filterInput = document.getElementById('sensors-filter-input');

        if (additionalFilters && filterInput) {
            const isHidden = additionalFilters.style.display === 'none';
            additionalFilters.style.display = isHidden ? 'block' : 'none';
            filterInput.placeholder = isHidden
                ? 'Filtres avancés activés - ajustez les options ci-dessous'
                : 'Rechercher ou filtrer les capteurs...';

            this.updateSensorsFilterCount();
        }
    }

    /**
     * Update the active filter count display
     */
    updateSensorsFilterCount() {
        const filterCount = document.getElementById('sensors-filter-count');
        const experimentFilter = document.getElementById('sensors-experiment-filter');
        const statusFilter = document.getElementById('sensors-status-filter');
        const typeFilter = document.getElementById('sensors-type-filter');

        let activeFilters = 0;
        if (experimentFilter?.value) activeFilters++;
        if (statusFilter?.value) activeFilters++;
        if (typeFilter?.value) activeFilters++;

        if (filterCount) {
            if (activeFilters > 0) {
                filterCount.textContent = `${activeFilters} filtre${activeFilters > 1 ? 's' : ''} actif${activeFilters > 1 ? 's' : ''}`;
                filterCount.style.display = 'inline-block';
            } else {
                filterCount.style.display = 'none';
            }
        }
    }

    /**
     * Clear all sensor filters
     */
    clearSensorsFilters() {
        const experimentFilter = document.getElementById('sensors-experiment-filter');
        const statusFilter = document.getElementById('sensors-status-filter');
        const typeFilter = document.getElementById('sensors-type-filter');

        if (experimentFilter) experimentFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (typeFilter) typeFilter.value = '';

        this.updateSensorsFilterCount();
        this.applySensorsFilters();
    }

    /**
     * Apply sensor filters and display results
     */
    async applySensorsFilters() {
        const container = document.getElementById('sensors-container');

        if (!container) return;

        try {
            // Show loading
            container.innerHTML = '<div class="loading-message">Chargement des capteurs...</div>';

            // Get filter values
            const experimentFilter = document.getElementById('sensors-experiment-filter');
            const statusFilter = document.getElementById('sensors-status-filter');
            const typeFilter = document.getElementById('sensors-type-filter');

            const experimentId = experimentFilter?.value || '';
            const statusValue = statusFilter?.value || '';
            const typeValue = typeFilter?.value || '';

            // Build query parameters for API
            const params = new URLSearchParams();
            if (experimentId) params.append('experimentId', experimentId);

            // Get sensors from API
            const response = await fetch(`/api/sensors/devices?${params}`);
            const sensorsData = await response.json();

            if (!sensorsData.success || !sensorsData.data) {
                this.showNoSensorsMessage('Erreur lors du chargement des capteurs.');
                return;
            }

            // Apply client-side filters
            let filteredSensors = sensorsData.data;

            // Filter by status
            if (statusValue) {
                filteredSensors = filteredSensors.filter(sensor => sensor.status === statusValue);
            }

            // Filter by type
            if (typeValue) {
                filteredSensors = filteredSensors.filter(sensor => sensor.type === typeValue);
            }

            // Update filter count
            this.updateSensorsFilterCount();

            // Display results
            if (filteredSensors.length === 0) {
                this.showNoSensorsMessage('Aucun capteur ne correspond aux critères de filtrage.');
                return;
            }

            // Display sensors
            this.displaySensors(filteredSensors);

        } catch (error) {
            console.error('Error loading sensors:', error);
            this.showNoSensorsMessage('Impossible de charger les capteurs. Veuillez réessayer.');
        }
    }

    /**
     * Show a "no sensors" message in the container
     * @param {string} message - Message to display
     */
    showNoSensorsMessage(message) {
        const container = document.getElementById('sensors-container');
        if (container) {
            container.innerHTML = `
                <div class="no-sensors-message">
                    <div class="icon">📡</div>
                    <h3>Aucun capteur trouvé</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    /**
     * Display sensors in the container
     * @param {Array} sensors - Array of sensor objects
     */
    async displaySensors(sensors) {
        const container = document.getElementById('sensors-container');
        if (!container) return;

        container.innerHTML = '';

        // Enrich sensors with their latest measurements
        const sensorsWithMeasurements = await Promise.all(
            sensors.map(async sensor => {
                const lastMeasurement = await this.getLastSensorMeasurement(sensor.id);
                return {
                    ...sensor,
                    lastMeasurement
                };
            })
        );

        sensorsWithMeasurements.forEach(sensor => {
            const sensorCard = this.createSensorDeviceCard(sensor);
            container.appendChild(sensorCard);
        });
    }

    /**
     * Create a sensor device card element
     * @param {Object} sensor - Sensor object with lastMeasurement
     * @returns {HTMLElement} - Card element
     */
    createSensorDeviceCard(sensor) {
        const card = document.createElement('div');

        // Determine status classes based on sensor status
        let statusClass = 'active';
        let statusText = 'Actif';
        let cardStatusClass = 'active';

        if (sensor.status === 'maintenance') {
            statusClass = 'maintenance';
            statusText = 'Maintenance';
            cardStatusClass = 'maintenance';
        } else if (sensor.status === 'offline') {
            statusClass = 'offline';
            statusText = 'Hors ligne';
            cardStatusClass = 'offline';
        }

        card.className = `sensor-device-card ${cardStatusClass}`;
        card.dataset.sensorId = sensor.id;

        // Get current value and unit from last measurement
        let currentValue = 'N/A';
        let unit = '';
        let lastUpdate = '';

        if (sensor.lastMeasurement) {
            currentValue = sensor.lastMeasurement.value;
            unit = this.getSensorUnit(sensor.sensor_type_id);
            lastUpdate = this.formatLastMeasurement(sensor.lastMeasurement.timestamp);
        }

        card.innerHTML = `
            <div class="sensor-card-header">
                <div>
                    <h4 class="sensor-card-title">${sensor.name || 'Capteur ' + sensor.id}</h4>
                    <p class="sensor-card-type">${this.formatSensorType(sensor.sensor_type_id) || 'Type inconnu'}</p>
                </div>
                <span class="sensor-card-status ${statusClass}">${statusText}</span>
            </div>
            <div class="sensor-card-body">
                <div class="sensor-card-info">
                    <strong>Valeur actuelle:</strong>
                </div>
                <div class="sensor-current-value">
                    ${currentValue} ${unit}
                </div>
                ${lastUpdate ? `<div class="sensor-last-update">🕒 ${lastUpdate}</div>` : ''}
                <div class="sensor-card-location">
                    📍 ${this.formatSensorLocation(sensor.location) || 'Emplacement non spécifié'}
                </div>
            </div>
            <div class="sensor-card-actions">
                <button class="sensor-action-btn" onclick="steamcity.showSensorDetails('${sensor.id}')">
                    🔍 Détails
                </button>
                <button class="sensor-action-btn secondary" onclick="steamcity.openDataView('${sensor.experiment_id}')">
                    📊 Données
                </button>
            </div>
        `;

        return card;
    }

    /**
     * Open the data view for a specific experiment
     * @param {string} experimentId - Experiment ID
     */
    openDataView(experimentId) {
        if (experimentId) {
            this.selectedExperimentForData = experimentId;
            this.showView('data');
        }
    }

    /**
     * Get sensor icon based on type ID
     * @param {string} typeId - Sensor type ID
     * @returns {string} - Icon emoji
     */
    getSensorIcon(typeId) {
        const iconMap = {
            'temperature': '🌡️',
            'humidity': '💧',
            'co2': '💨',
            'noise': '🔊',
            'pressure': '🔘',
            'light': '💡',
            'motion': '🚶',
            'default': '📡'
        };
        return iconMap[typeId] || iconMap.default;
    }

    /**
     * Get sensor type name in French
     * @param {string} typeId - Sensor type ID
     * @returns {string} - Type name
     */
    getSensorTypeName(typeId) {
        const nameMap = {
            'temperature': 'Température',
            'humidity': 'Humidité',
            'co2': 'CO2',
            'noise': 'Niveau sonore',
            'pressure': 'Pression',
            'light': 'Luminosité',
            'motion': 'Mouvement'
        };
        return nameMap[typeId] || typeId;
    }

    /**
     * Format a timestamp into a human-readable "time ago" format
     * @param {string} timestamp - ISO timestamp
     * @returns {string} - Formatted time string
     */
    formatLastMeasurement(timestamp) {
        if (!timestamp) return 'Jamais';

        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / 60000);

        if (diffMinutes < 1) return 'Maintenant';
        if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;

        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `Il y a ${diffHours} h`;

        const diffDays = Math.floor(diffHours / 24);
        return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }

    /**
     * Format sensor type ID into a human-readable name
     * @param {string} sensorTypeId - Sensor type ID
     * @returns {string} - Formatted sensor type name
     */
    formatSensorType(sensorTypeId) {
        if (!sensorTypeId) return 'Type inconnu';

        const typeMap = {
            'temperature': 'Capteur de température',
            'humidity': 'Capteur d\'humidité',
            'co2': 'Capteur CO2',
            'noise': 'Sonomètre',
            'pm25': 'Capteur PM2.5',
            'pm10': 'Capteur PM10',
            'light': 'Capteur de luminosité',
            'pressure': 'Capteur de pression atmosphérique',
            'uv': 'Capteur UV',
            'motion': 'Détecteur de mouvement',
            'door': 'Capteur d\'ouverture'
        };

        return typeMap[sensorTypeId] || `Capteur ${sensorTypeId}`;
    }

    /**
     * Get the unit for a sensor type
     * @param {string} sensorTypeId - Sensor type ID
     * @returns {string} - Unit string
     */
    getSensorUnit(sensorTypeId) {
        if (!sensorTypeId) return '';

        const unitMap = {
            'temperature': '°C',
            'humidity': '%',
            'co2': 'ppm',
            'noise': 'dB',
            'pm25': 'μg/m³',
            'pm10': 'μg/m³',
            'light': 'lx',
            'pressure': 'hPa',
            'uv': 'UV',
            'motion': '',
            'door': ''
        };

        return unitMap[sensorTypeId] || '';
    }

    /**
     * Format sensor location into a human-readable string
     * @param {Object|string} location - Location object or string
     * @returns {string} - Formatted location
     */
    formatSensorLocation(location) {
        if (!location) return 'Emplacement non spécifié';

        if (typeof location === 'string') return location;

        if (typeof location === 'object') {
            if (location.building && location.room) {
                return `${location.building}, ${location.room}`;
            }

            if (location.building) {
                return location.building;
            }

            if (location.description) {
                return location.description;
            }

            if (location.latitude && location.longitude) {
                return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
            }
        }

        return 'Emplacement non spécifié';
    }

    /**
     * Get the last measurement for a sensor
     * @param {string} sensorId - Sensor ID
     * @returns {Object|null} - Last measurement or null
     */
    async getLastSensorMeasurement(sensorId) {
        try {
            const response = await fetch(`/api/sensors/measurements?sensorId=${sensorId}&limit=1`);
            const data = await response.json();

            if (data.success && data.data && data.data.length > 0) {
                return data.data[0];
            }
        } catch (error) {
            console.error('Error fetching last measurement for sensor', sensorId, error);
        }
        return null;
    }

    /**
     * Navigate to data view for a specific sensor
     * @param {string} sensorId - Sensor ID
     */
    async viewSensorData(sensorId) {
        // Navigate to data view with this sensor's experiment
        const sensor = await this.getSensorById(sensorId);
        if (sensor && sensor.experiment_id) {
            this.selectedExperimentForData = sensor.experiment_id;
            this.showView('data');
        }
    }

    /**
     * Show sensor details in a dedicated view
     * @param {string} sensorId - Sensor ID
     * @param {boolean} updateUrl - Whether to update URL (default: true)
     */
    async showSensorDetails(sensorId, updateUrl = true) {
        try {
            const sensor = await this.getSensorById(sensorId);
            if (!sensor) {
                console.error('Sensor not found:', sensorId);
                return;
            }

            // Set current sensor
            this.currentSensor = sensor;

            // Switch to sensor detail view
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.getElementById('sensor-detail-view').classList.add('active');

            // Keep sensors tab active (since this is still part of sensors section)
            document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
            document.getElementById('sensors-tab').classList.add('active');

            // Update URL if requested, preserving existing period parameter
            if (updateUrl) {
                const queryParams = {};
                if (this.urlParams?.period && this.urlParams.period !== '24h') {
                    queryParams.period = this.urlParams.period;
                }
                this.updateUrl('sensors', sensorId, queryParams);
            }

            // Update title
            const title = document.getElementById('sensor-detail-title');
            title.textContent = `${this.getSensorIcon(sensor.sensor_type_id)} ${sensor.name}`;

            // Setup back button
            const backButton = document.getElementById('back-to-sensors');
            backButton.onclick = () => this.showView('sensors');

            // Setup "Analyse détaillée" button
            const openDataBtnHeader = document.getElementById('open-sensor-in-data-view-header');
            if (openDataBtnHeader) {
                openDataBtnHeader.onclick = () => {
                    this.openSensorInDataView(sensor.experiment_id);
                };
            }

            // Setup time filter buttons for chart
            const timeFilterButtons = document.querySelectorAll('#sensor-detail-view .time-filter-btn');
            timeFilterButtons.forEach(button => {
                // Remove existing listeners to avoid duplicates
                if (button.sensorTimeFilterHandler) {
                    button.removeEventListener('click', button.sensorTimeFilterHandler);
                }

                // Create new handler for sensor detail view
                button.sensorTimeFilterHandler = async (e) => {
                    const period = e.target.dataset.period;

                    // Update active button
                    timeFilterButtons.forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');

                    // Update URL with period parameter
                    const queryParams = {};
                    if (period !== '24h') { // Only add period if it's not default
                        queryParams.period = period;
                    }
                    this.updateUrl('sensors', sensorId, queryParams);

                    // Load chart with new period
                    await this.loadSensorChart(sensorId, period);
                };

                // Add event listener
                button.addEventListener('click', button.sensorTimeFilterHandler);
            });

            // Get period from URL or use default
            const urlPeriod = this.urlParams?.period || '24h';

            // Set active button based on URL parameter
            const activeButton = document.querySelector(`#sensor-detail-view .time-filter-btn[data-period="${urlPeriod}"]`);
            if (activeButton) {
                timeFilterButtons.forEach(btn => btn.classList.remove('active'));
                activeButton.classList.add('active');
            } else {
                // Fallback to default if URL period is invalid
                const defaultButton = document.querySelector('#sensor-detail-view .time-filter-btn[data-period="24h"]');
                if (defaultButton) {
                    timeFilterButtons.forEach(btn => btn.classList.remove('active'));
                    defaultButton.classList.add('active');
                }
            }

            // Get the last measurement for this sensor
            const lastMeasurement = await this.getLastSensorMeasurement(sensorId);

            // Populate sensor information
            await this.populateSensorInfo(sensor);
            await this.populateSensorDetails(sensor, lastMeasurement);

            // Load chart with period from URL or default
            await this.loadSensorChart(sensorId, urlPeriod);

        } catch (error) {
            console.error('Error showing sensor details:', error);
        }
    }

    /**
     * Populate sensor information section
     * @param {Object} sensor - Sensor object
     */
    async populateSensorInfo(sensor) {
        const sensorInfo = document.getElementById('sensor-info');
        if (!sensorInfo) return;

        // Get status info
        let statusClass = 'status-active';
        let statusIcon = '🟢';
        let statusText = 'En ligne';

        if (sensor.status === 'maintenance') {
            statusClass = 'status-maintenance';
            statusIcon = '🟡';
            statusText = 'Maintenance';
        } else if (sensor.status === 'offline') {
            statusClass = 'status-offline';
            statusIcon = '🔴';
            statusText = 'Hors ligne';
        }

        // Get experiment information
        const experiment = this.experiments.find(exp => exp.id === sensor.experiment_id);
        const experimentLink = experiment ?
            `<div class="experiment-link-container">
                <button class="experiment-link-btn" onclick="steamcity.showExperimentDetail('${experiment.id}')">
                    🧪 Voir l'expérience: ${experiment.title}
                </button>
            </div>` : '';

        sensorInfo.innerHTML = `
            <div class="sensor-header-info">
                <div class="sensor-type">
                    ${this.formatSensorType(sensor.sensor_type_id)}
                </div>
                <div class="sensor-status ${statusClass}">
                    ${statusIcon} ${statusText}
                </div>
            </div>
            <div class="sensor-description">
                ${sensor.description || 'Aucune description disponible'}
            </div>
            ${experimentLink}
        `;
    }

    /**
     * Populate sensor details sections (specifications, status, location, calibration)
     * @param {Object} sensor - Sensor object
     * @param {Object|null} lastMeasurement - Last measurement object
     */
    async populateSensorDetails(sensor, lastMeasurement = null) {
        // Populate specifications
        const specifications = document.getElementById('sensor-specifications');
        if (specifications && sensor.metadata) {
            specifications.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Fabricant:</span>
                    <span class="detail-value">${sensor.metadata.manufacturer || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Modèle:</span>
                    <span class="detail-value">${sensor.metadata.model || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Version firmware:</span>
                    <span class="detail-value">${sensor.metadata.firmware_version || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Numéro de série:</span>
                    <span class="detail-value">${sensor.metadata.serial_number || 'N/A'}</span>
                </div>
            `;
        }

        // Populate status
        const statusInfo = document.getElementById('sensor-status-info');
        if (statusInfo) {
            let statusHtml = '';

            // Add last measurement if available
            if (lastMeasurement) {
                const unit = this.getSensorUnit(sensor.sensor_type_id);
                statusHtml += `
                    <div class="detail-item">
                        <span class="detail-label">Dernière valeur:</span>
                        <span class="detail-value measurement-value">${lastMeasurement.value} ${unit}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Dernière mesure:</span>
                        <span class="detail-value">${this.formatLastMeasurement(lastMeasurement.timestamp)}</span>
                    </div>
                `;
            } else {
                statusHtml += `
                    <div class="detail-item">
                        <span class="detail-label">Dernière valeur:</span>
                        <span class="detail-value">Aucune mesure disponible</span>
                    </div>
                `;
            }

            // Add other status info if metadata exists
            if (sensor.metadata) {
                statusHtml += `
                    <div class="detail-item">
                        <span class="detail-label">Niveau de batterie:</span>
                        <span class="detail-value">${sensor.metadata.battery_level || 'N/A'}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Force du signal:</span>
                        <span class="detail-value">${sensor.metadata.signal_strength || 'N/A'} dBm</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Qualité du signal:</span>
                        <span class="detail-value">${sensor.metadata.signal_quality || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Dernière connexion:</span>
                        <span class="detail-value">${lastMeasurement ? this.formatLastMeasurement(lastMeasurement.timestamp) : this.formatLastMeasurement(sensor.last_seen)}</span>
                    </div>
                `;
            }

            statusInfo.innerHTML = statusHtml;
        }

        // Populate location
        const locationInfo = document.getElementById('sensor-location-info');
        if (locationInfo && sensor.location) {
            const coordinates = `${sensor.location.latitude?.toFixed(4)}, ${sensor.location.longitude?.toFixed(4)}`;
            locationInfo.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Bâtiment:</span>
                    <span class="detail-value">${sensor.location.building || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Salle:</span>
                    <span class="detail-value">${sensor.location.room || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Étage:</span>
                    <span class="detail-value">${sensor.location.floor || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Coordonnées:</span>
                    <span class="detail-value">${coordinates}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Intérieur:</span>
                    <span class="detail-value">${sensor.location.indoor ? 'Oui' : 'Non'}</span>
                </div>
            `;
        }

        // Populate calibration
        const calibrationInfo = document.getElementById('sensor-calibration-info');
        if (calibrationInfo && sensor.calibration) {
            calibrationInfo.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Dernière calibration:</span>
                    <span class="detail-value">${this.formatLastMeasurement(sensor.calibration.last_calibration)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Offset de calibration:</span>
                    <span class="detail-value">${sensor.calibration.calibration_offset || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Facteur de calibration:</span>
                    <span class="detail-value">${sensor.calibration.calibration_factor || 'N/A'}</span>
                </div>
            `;
        }
    }

    /**
     * Get sensor by ID from API
     * @param {string} sensorId - Sensor ID
     * @returns {Object|null} - Sensor object or null
     */
    async getSensorById(sensorId) {
        try {
            // This would need to be implemented in your API
            const response = await fetch(`/api/sensors/devices/${sensorId}`);
            if (response.ok) {
                const data = await response.json();
                return data.success ? data.data : null;
            }
        } catch (error) {
            console.error('Error fetching sensor:', error);
        }
        return null;
    }

    /**
     * Load sensor chart with measurements
     * @param {string} sensorId - Sensor ID
     * @param {string} period - Time period ('24h', '7d', '30d', 'all')
     */
    async loadSensorChart(sensorId, period = '24h') {
        try {
            // Adjust limit based on period to get appropriate data density
            let limit = 50;
            if (period === '7d') limit = 168; // ~24 points per day for a week
            if (period === '30d') limit = 360; // ~12 points per day for a month
            if (period === 'all') limit = 1000; // For all data

            const response = await fetch(`/api/sensors/measurements?sensorId=${sensorId}&period=${period}&limit=${limit}`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                this.createSensorDetailChart(data.data, period, sensorId, data.total || data.data.length);
            } else {
                // Clear chart if no data
                const canvas = document.getElementById('sensorChart');
                if (canvas) {
                    if (this.sensorDetailChart) {
                        this.sensorDetailChart.destroy();
                        this.sensorDetailChart = null;
                    }
                    Chart.getChart(canvas)?.destroy();
                }
            }
        } catch (error) {
            console.error('Error loading sensor chart:', error);
        }
    }

    /**
     * Create a Chart.js chart for sensor measurements
     * @param {Array} measurements - Array of measurement objects
     * @param {string} period - Time period
     * @param {string} sensorId - Sensor ID
     * @param {number} totalPoints - Total number of data points
     */
    createSensorDetailChart(measurements, period = '24h', sensorId = null, totalPoints = null) {
        const canvas = document.getElementById('sensorChart');
        if (!canvas) return;

        // Destroy existing chart
        if (this.sensorDetailChart) {
            this.sensorDetailChart.destroy();
            this.sensorDetailChart = null;
        }

        // Also check for existing charts on this canvas and destroy them
        Chart.getChart(canvas)?.destroy();

        const ctx = canvas.getContext('2d');
        const chartData = measurements.map(m => ({
            x: new Date(m.timestamp),
            y: m.value
        })).sort((a, b) => a.x - b.x);

        // Configure time display format based on period
        let timeDisplayFormats = {};
        let timeUnit = 'hour';

        switch (period) {
            case '24h':
                timeDisplayFormats = { hour: 'HH:mm' };
                timeUnit = 'hour';
                break;
            case '7d':
                timeDisplayFormats = {
                    day: 'dd/MM',
                    hour: 'dd/MM HH:mm'
                };
                timeUnit = 'day';
                break;
            case '30d':
                timeDisplayFormats = {
                    day: 'dd/MM',
                    week: 'dd/MM'
                };
                timeUnit = 'day';
                break;
        }

        // Get sensor info for title and label
        const sensor = this.currentSensor;
        const sensorName = sensor ? sensor.name : sensorId;
        const sensorUnit = sensor ? this.getSensorUnit(sensor.sensor_type_id) : '';

        this.sensorDetailChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: `${sensorName} (${sensorUnit})`,
                    data: chartData,
                    borderColor: '#4a90e2',
                    backgroundColor: 'rgba(74, 144, 226, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointStyle: 'circle',
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: timeUnit,
                            displayFormats: timeDisplayFormats
                        },
                        title: {
                            display: true,
                            text: 'Temps'
                        }
                    },
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: `Valeur${sensorUnit ? ' (' + sensorUnit + ')' : ''}`
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${sensorName} - ${this.getPeriodLabel(period)}${totalPoints ? ' (' + totalPoints + ' points)' : ''}`
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.datasetIndex;
                            const chart = legend.chart;
                            const meta = chart.getDatasetMeta(index);

                            // Toggle visibility
                            meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : !meta.hidden;

                            // Update chart
                            chart.update();
                        },
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    /**
     * Get human-readable label for a time period
     * @param {string} period - Period code
     * @returns {string} - Formatted period label
     */
    getPeriodLabel(period) {
        switch (period) {
            case '24h':
                return 'Dernières 24h';
            case '7d':
                return 'Derniers 7 jours';
            case '30d':
                return 'Derniers 30 jours';
            case 'all':
                return 'Toutes les données';
            default:
                return 'Période inconnue';
        }
    }

    /**
     * Open sensor in data view for detailed analysis
     * @param {string} experimentId - Experiment ID
     */
    openSensorInDataView(experimentId) {
        // Store the experiment ID for when we switch to data view
        this.selectedExperimentForData = experimentId;

        // Switch to data view with URL update disabled, then update URL manually with experiment ID
        this.showView('data', false);
        this.updateUrl('data', experimentId, {}); // Empty query params when coming from sensor detail
    }

    /**
     * Close sensor detail modal
     */
    closeSensorModal() {
        const modal = document.getElementById('sensor-detail-modal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Destroy chart when closing modal
        if (this.sensorDetailChart) {
            this.sensorDetailChart.destroy();
            this.sensorDetailChart = null;
        }
    }
}