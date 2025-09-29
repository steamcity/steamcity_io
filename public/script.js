class SteamCityPlatform {
    constructor() {
        this.currentView = "map";
        this.map = null;
        this.chart = null;
        this.markers = [];
        this.isAuthenticated = false;
        this.protocolColors = {
            governance: "#e74c3c",
            environmental: "#27ae60",
            mobility: "#3498db",
            energy: "#f39c12",
            technology: "#9b59b6",
            other: "#95a5a6"
        };
        this.experiments = [];
        this.sensors = [];
        this.currentExperiment = null;
        this.activeProtocolFilter = null; // Track active legend filter
        this.activeExperimentFilter = null; // Track active experiment filter

        this.init();
    }

    async init() {
        this.checkAuthenticationState();
        this.bindEvents();
        await this.showHomepage();
    }

    checkAuthenticationState() {
        // Simple auth check - you can expand this
        this.isAuthenticated = localStorage.getItem('steamcity_authenticated') === 'true';
    }

    async showHomepage() {
        if (!this.isAuthenticated) {
            document.getElementById('homepage').classList.remove('hidden');
            document.getElementById('main-app').classList.add('hidden');
        } else {
            await this.showMainApp();
        }
    }

    async showMainApp() {
        document.getElementById('homepage').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        await this.loadInitialData();
        await this.initializeMap();
        this.initializeRouting();
    }

    bindEvents() {
        // Homepage events
        const exploreBtn = document.getElementById('explore-btn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => this.showLoginModal());
        }

        // Login modal events
        const loginModal = document.getElementById('login-modal');
        const closeBtn = loginModal?.querySelector('.close');
        const loginForm = document.getElementById('login-form');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideLoginModal());
        }

        if (loginModal) {
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) this.hideLoginModal();
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Navigation events
        document.getElementById('map-tab')?.addEventListener('click', () => this.showView('map'));
        document.getElementById('experiments-tab')?.addEventListener('click', () => this.showView('experiments'));
        document.getElementById('sensors-tab')?.addEventListener('click', () => this.showView('sensors'));
        document.getElementById('data-tab')?.addEventListener('click', () => this.showView('data'));

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());

        // Protocol filters
        document.getElementById('protocol-filter')?.addEventListener('change', (e) => this.filterByProtocol(e.target.value));

        // Center map button
        document.getElementById('center-map-btn')?.addEventListener('click', () => this.centerMapOnVisibleMarkers());

        // Back to experiments list
        document.getElementById('back-to-map')?.addEventListener('click', () => this.showView('experiments'));

        // Chart controls (sensor type only, experiment selection is handled in bindDataFilterEvents)
        document.getElementById('sensor-type-select')?.addEventListener('change', (e) => this.updateChartSensorType(e.target.value));
    }

    showLoginModal() {
        document.getElementById('login-modal').classList.remove('hidden');
    }

    hideLoginModal() {
        document.getElementById('login-modal').classList.add('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Simple authentication - you can expand this
        if (username && password) {
            localStorage.setItem('steamcity_authenticated', 'true');
            this.isAuthenticated = true;
            this.hideLoginModal();
            await this.showMainApp();
        }
    }

    handleLogout() {
        localStorage.removeItem('steamcity_authenticated');
        this.isAuthenticated = false;
        location.reload();
    }

    showView(viewName, updateUrl = true) {
        console.log('Switching to view:', viewName);

        // Update navigation
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        const tabButton = document.getElementById(viewName + '-tab');
        if (tabButton) {
            tabButton.classList.add('active');
        }

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
            console.log('Hiding view:', view.id);
        });
        const viewElement = document.getElementById(viewName + '-view');
        if (viewElement) {
            viewElement.classList.add('active');
            console.log('Showing view:', viewElement.id);
        }

        this.currentView = viewName;

        // Update URL if requested
        if (updateUrl) {
            this.updateUrl(viewName);
        }

        // Initialize specific view logic
        if (viewName === 'map') {
            if (!this.map) {
                this.initializeMap();
            } else {
                // Refresh map if it already exists and recenter on markers
                setTimeout(() => {
                    this.map.invalidateSize();
                    this.centerMapOnVisibleMarkers();
                }, 50);
            }
        } else if (viewName === 'experiments') {
            this.loadExperimentsList();
        } else if (viewName === 'sensors') {
            // Load sensors view immediately
            this.loadSensorsView();
        } else if (viewName === 'data') {
            this.loadChartData(this.selectedExperimentForData);
            this.bindDataFilterEvents();
        }
    }

    async loadInitialData() {
        try {
            const [experimentsRes, sensorsRes] = await Promise.all([
                fetch('/api/experiments'),
                fetch('/api/sensors')
            ]);

            const experimentsData = await experimentsRes.json();
            const sensorsData = await sensorsRes.json();

            // Transform experiments data to match expected format
            this.experiments = experimentsData.data.map(exp => ({
                id: exp.id,
                title: exp.title,
                protocol: exp.protocol_category,
                protocol_name: exp.protocol_name,
                school: exp.school,
                city: exp.city,
                description: exp.description,
                methodology: exp.methodology,
                hypotheses: exp.hypotheses,
                conclusions: exp.conclusions,
                date: exp.start_date,
                status: exp.status,
                location: {
                    coordinates: [exp.location.longitude, exp.location.latitude]
                }
            }));

            this.sensors = sensorsData.data;

            console.log('Loaded data:', {
                experiments: this.experiments.length,
                sensors: this.sensors.length
            });
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async initializeMap() {
        if (this.map) return;

        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Initialize Leaflet map
        this.map = L.map('map').setView([46.2276, 2.2137], 6); // Centered on France

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Load experiments and add markers
        await this.loadMapMarkers();
        this.createMapLegend();
    }

    async loadMapMarkers() {
        // Ensure data is loaded before creating markers
        if (!this.experiments.length) {
            await this.loadInitialData();
        }

        this.clearMarkers();
        const bounds = [];

        this.experiments.forEach(experiment => {
            if (experiment.location && experiment.location.coordinates) {
                const [lng, lat] = experiment.location.coordinates;
                const color = this.protocolColors[experiment.protocol] || this.protocolColors.other;

                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(this.map);

                // Create popup content
                const popupContent = `
                    <div class="map-popup">
                        <h4>${experiment.title}</h4>
                        <p><strong>Ville:</strong> ${experiment.city}</p>
                        <p><strong>École:</strong> ${experiment.school}</p>
                        <p><strong>Protocole:</strong> ${experiment.protocol_name}</p>
                        <p><strong>Cluster:</strong> <span class="protocol-badge ${experiment.protocol}">${this.getProtocolLabel(experiment.protocol)}</span></p>
                        <p>${experiment.description}</p>
                        <button onclick="platform.showExperimentDetail('${experiment.id}')" class="popup-button">
                            Voir les détails
                        </button>
                    </div>
                `;

                marker.bindPopup(popupContent);
                this.markers.push({ marker, experiment });
                bounds.push([lat, lng]);
            }
        });

        // Adjust map view to fit all markers
        if (bounds.length > 0) {
            const group = new L.featureGroup(this.markers.map(m => m.marker));
            this.map.fitBounds(group.getBounds(), {
                padding: [20, 20],
                maxZoom: 10
            });
        }
    }

    clearMarkers() {
        this.markers.forEach(({ marker }) => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }

    centerMapOnVisibleMarkers() {
        if (!this.map || this.markers.length === 0) {
            return;
        }

        // If only one marker, center on it with a reasonable zoom
        if (this.markers.length === 1) {
            const marker = this.markers[0].marker;
            this.map.setView(marker.getLatLng(), 10);
            return;
        }

        // For multiple markers, fit bounds
        const group = new L.featureGroup(this.markers.map(m => m.marker));
        this.map.fitBounds(group.getBounds(), {
            padding: [20, 20],
            maxZoom: 10
        });
    }

    filterByProtocol(protocol) {
        this.clearMarkers();
        const bounds = [];

        const filteredExperiments = protocol ?
            this.experiments.filter(exp => exp.protocol === protocol) :
            this.experiments;

        filteredExperiments.forEach(experiment => {
            if (experiment.location && experiment.location.coordinates) {
                const [lng, lat] = experiment.location.coordinates;
                const color = this.protocolColors[experiment.protocol] || this.protocolColors.other;

                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(this.map);

                const popupContent = `
                    <div class="map-popup">
                        <h4>${experiment.title}</h4>
                        <p><strong>Ville:</strong> ${experiment.city}</p>
                        <p><strong>École:</strong> ${experiment.school}</p>
                        <p><strong>Protocole:</strong> ${experiment.protocol_name}</p>
                        <p><strong>Cluster:</strong> <span class="protocol-badge ${experiment.protocol}">${this.getProtocolLabel(experiment.protocol)}</span></p>
                        <p>${experiment.description}</p>
                        <button onclick="platform.showExperimentDetail('${experiment.id}')" class="popup-button">
                            Voir les détails
                        </button>
                    </div>
                `;

                marker.bindPopup(popupContent);
                this.markers.push({ marker, experiment });
                bounds.push([lat, lng]);
            }
        });

        // Adjust map view to fit all filtered markers
        if (bounds.length > 0) {
            const group = new L.featureGroup(this.markers.map(m => m.marker));
            this.map.fitBounds(group.getBounds(), {
                padding: [20, 20],
                maxZoom: 10
            });
        }
    }

    filterByLegend(protocolKey) {
        // Update active filter
        this.activeProtocolFilter = protocolKey;

        // Clear current markers
        this.clearMarkers();

        // Filter experiments
        const filteredExperiments = protocolKey ?
            this.experiments.filter(exp => exp.protocol === protocolKey) :
            this.experiments;

        // Add filtered markers to map
        filteredExperiments.forEach(experiment => {
            if (experiment.location && experiment.location.coordinates) {
                const [lng, lat] = experiment.location.coordinates;
                const color = this.protocolColors[experiment.protocol] || this.protocolColors.other;

                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(this.map);

                const popupContent = `
                    <div class="map-popup">
                        <h4>${experiment.title}</h4>
                        <p><strong>Ville:</strong> ${experiment.city}</p>
                        <p><strong>École:</strong> ${experiment.school}</p>
                        <p><strong>Protocole:</strong> ${experiment.protocol_name}</p>
                        <p><strong>Cluster:</strong> <span class="protocol-badge ${experiment.protocol}">${this.getProtocolLabel(experiment.protocol)}</span></p>
                        <p>${experiment.description}</p>
                        <button onclick="platform.showExperimentDetail('${experiment.id}')" class="popup-button">
                            Voir les détails
                        </button>
                    </div>
                `;

                marker.bindPopup(popupContent);
                this.markers.push({ marker, experiment });
            }
        });

        // Update legend visual state
        this.updateLegendState();

        // Update dropdown filter to match
        const protocolFilter = document.getElementById('protocol-filter');
        if (protocolFilter) {
            protocolFilter.value = protocolKey || '';
        }
    }

    updateLegendState() {
        const legend = document.getElementById('map-legend');
        if (!legend) return;

        // Update active states
        legend.querySelectorAll('.legend-item.clickable').forEach(item => {
            const protocolKey = item.getAttribute('data-protocol');
            const isActive = (protocolKey === '' && this.activeProtocolFilter === null) ||
                           (protocolKey === this.activeProtocolFilter);

            if (isActive) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    createMapLegend() {
        const legend = document.getElementById('map-legend');
        if (!legend) return;

        const protocols = [
            { key: 'environmental', label: `🌱 ${this.getProtocolLabel('environmental')}` },
            { key: 'energy', label: `⚡ ${this.getProtocolLabel('energy')}` },
            { key: 'mobility', label: `🚗 ${this.getProtocolLabel('mobility')}` },
            { key: 'governance', label: `🏛️ ${this.getProtocolLabel('governance')}` },
            { key: 'technology', label: `💻 ${this.getProtocolLabel('technology')}` }
        ];

        // Add "All" option at the beginning
        const legendHTML = `
            <div class="legend-item clickable ${this.activeProtocolFilter === null ? 'active' : ''}" data-protocol="">
                <div class="legend-color all-colors"></div>
                <span>Tous les clusters</span>
            </div>
            ${protocols.map(protocol => `
                <div class="legend-item clickable ${this.activeProtocolFilter === protocol.key ? 'active' : ''}" data-protocol="${protocol.key}">
                    <div class="legend-color" style="background-color: ${this.protocolColors[protocol.key]}"></div>
                    <span>${protocol.label}</span>
                </div>
            `).join('')}
        `;

        legend.innerHTML = legendHTML;

        // Add click event listeners to legend items
        legend.querySelectorAll('.legend-item.clickable').forEach(item => {
            item.addEventListener('click', (e) => {
                const protocolKey = e.currentTarget.getAttribute('data-protocol');
                this.filterByLegend(protocolKey || null);
            });
        });
    }

    showExperimentDetail(experimentId, updateUrl = true) {
        const experiment = this.experiments.find(exp => exp.id === experimentId);
        if (!experiment) return;

        this.currentExperiment = experiment;

        // Show experiment detail view
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('experiment-detail-view').classList.add('active');

        // Keep experiments tab active (since this is still part of experiments section)
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        document.getElementById('experiments-tab').classList.add('active');

        // Update URL if requested, preserving existing period parameter
        if (updateUrl) {
            const queryParams = {};
            if (this.urlParams?.period && this.urlParams.period !== '24h') {
                queryParams.period = this.urlParams.period;
            }
            this.updateUrl('experiments', experimentId, queryParams);
        }

        this.loadExperimentDetails(experiment);
    }

    async loadExperimentDetails(experiment) {
        const titleElement = document.getElementById('experiment-detail-title');
        const infoContainer = document.getElementById('experiment-info');
        const sensorsContainer = document.getElementById('experiment-sensors');
        const chartsContainer = document.getElementById('experiment-charts');
        const methodologyContainer = document.getElementById('experiment-methodology');
        const hypothesesContainer = document.getElementById('experiment-hypotheses');
        const conclusionsContainer = document.getElementById('experiment-conclusions');

        // Get cluster color
        const clusterColor = this.protocolColors[experiment.protocol] || this.protocolColors.other;

        // Update page title
        if (titleElement) {
            titleElement.textContent = experiment.title;
        }

        // Apply cluster color to section borders
        this.applyClusterColorToSections(clusterColor);

        // Load basic experiment info
        infoContainer.innerHTML = `
            <div class="experiment-meta">
                <p><strong>📍 Lieu:</strong> ${experiment.city}</p>
                <p><strong>🏫 École:</strong> ${experiment.school}</p>
                <p><strong>📋 Protocole:</strong> <span class="protocol-name">${experiment.protocol_name}</span></p>
                <p><strong>📅 Date:</strong> ${new Date(experiment.date).toLocaleDateString()}</p>
                <p><strong>📊 Statut:</strong> <span class="status-badge status-${experiment.status}">${this.getStatusLabel(experiment.status)}</span></p>
            </div>

            <div class="experiment-section">
                <h4>📝 Description</h4>
                <p>${experiment.description}</p>
            </div>

            <div class="experiment-section">
                <p><span class="protocol-badge ${experiment.protocol}">${this.getProtocolLabel(experiment.protocol)}</span></p>
            </div>
        `;

        // Load methodology
        if (methodologyContainer) {
            methodologyContainer.innerHTML = experiment.methodology || 'Aucune méthodologie spécifiée pour cette expérience.';
        }

        // Load hypotheses
        if (hypothesesContainer) {
            hypothesesContainer.innerHTML = experiment.hypotheses || 'Aucune hypothèse spécifiée pour cette expérience.';
        }

        // Load conclusions
        if (conclusionsContainer) {
            conclusionsContainer.innerHTML = experiment.conclusions || 'Aucune conclusion disponible pour cette expérience.';
        }

        // Load related sensors using new API
        try {
            const [devicesResponse, typesResponse] = await Promise.all([
                fetch(`/api/sensors/devices?experimentId=${experiment.id}`),
                fetch('/api/sensors/types')
            ]);

            const devicesData = await devicesResponse.json();
            const typesData = await typesResponse.json();

            // Create lookup for sensor types
            const sensorTypes = {};
            typesData.data.forEach(type => {
                sensorTypes[type.id] = type;
            });

            sensorsContainer.innerHTML = '';

            if (devicesData.data && devicesData.data.length > 0) {
                // Get latest measurements for each sensor
                for (const device of devicesData.data.slice(0, 6)) {
                    try {
                        const measurementResponse = await fetch(`/api/sensors/measurements?sensorId=${device.id}&limit=1`);
                        const measurementData = await measurementResponse.json();

                        const sensorType = sensorTypes[device.sensor_type_id];
                        const latestMeasurement = measurementData.data && measurementData.data.length > 0 ? measurementData.data[0] : null;

                        const sensorCard = document.createElement('div');
                        sensorCard.className = 'sensor-card clickable';

                        const status = device.status === 'online' ? 'en ligne' : device.status === 'offline' ? 'hors ligne' : device.status;
                        const statusClass = device.status === 'online' ? 'status-online' : device.status === 'offline' ? 'status-offline' : 'status-warning';

                        sensorCard.innerHTML = `
                            <h4>${sensorType ? sensorType.icon + ' ' + sensorType.name : device.name}</h4>
                            <div class="sensor-value">
                                ${latestMeasurement ?
                                    `${latestMeasurement.value} <span class="sensor-unit">${sensorType?.unit_symbol || ''}</span>` :
                                    'Aucune donnée'
                                }
                            </div>
                            <div class="sensor-metadata">
                                <div class="sensor-status ${statusClass}">• ${status}</div>
                                <div class="sensor-battery">🔋 ${device.metadata.battery_level}%</div>
                                <small>Maj: ${latestMeasurement ?
                                    new Date(latestMeasurement.timestamp).toLocaleString() :
                                    'N/A'
                                }</small>
                            </div>
                            <div class="click-hint">🔍 Cliquez pour voir les détails</div>
                        `;

                        // Add click handler to navigate to sensor details
                        sensorCard.addEventListener('click', () => {
                            this.showSensorDetails(device.id);
                        });

                        sensorsContainer.appendChild(sensorCard);
                    } catch (error) {
                        console.warn('Error loading measurements for sensor:', device.id, error);
                    }
                }

                // Create charts with measurement data
                this.createExperimentChart(experiment.id, chartsContainer);

                // Setup time filter controls
                this.setupTimeFilterControls(experiment.id, chartsContainer);

            } else {
                sensorsContainer.innerHTML = '<p>Aucun capteur configuré pour cette expérience</p>';
            }

        } catch (error) {
            console.error('Error loading experiment sensors:', error);
            sensorsContainer.innerHTML = '<p>Erreur lors du chargement des capteurs</p>';
        }
    }

    getTimeUnit(period) {
        switch (period) {
            case '24h':
                return 'hour';
            case '7d':
                return 'day';
            case '30d':
                return 'day';
            case 'all':
                return 'day';
            default:
                return 'hour';
        }
    }

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

    setupTimeFilterControls(experimentId, chartsContainer) {
        // Wait a bit for DOM to be ready
        setTimeout(() => {
            const timeFilterButtons = document.querySelectorAll('.time-filter-btn');
            console.log('Setting up time filter controls, found buttons:', timeFilterButtons.length);

            // Get period from URL or use default
            const urlPeriod = this.urlParams?.period || '24h';

            timeFilterButtons.forEach(button => {
                // Remove existing listeners to avoid duplicates
                button.removeEventListener('click', button.timeFilterHandler);

                // Create new handler
                button.timeFilterHandler = async (e) => {
                    console.log('Time filter clicked:', e.target.dataset.period);

                    // Remove active class from all buttons
                    timeFilterButtons.forEach(btn => btn.classList.remove('active'));

                    // Add active class to clicked button
                    e.target.classList.add('active');

                    // Get selected period
                    const period = e.target.dataset.period;

                    // Update URL with period parameter
                    const queryParams = {};
                    if (period !== '24h') { // Only add period if it's not default
                        queryParams.period = period;
                    }
                    this.updateUrl('experiments', experimentId, queryParams);

                    // Update chart with new period
                    await this.createExperimentChart(experimentId, chartsContainer, period);
                };

                button.addEventListener('click', button.timeFilterHandler);
            });

            // Set active button based on URL parameter
            const activeButton = document.querySelector(`.time-filter-btn[data-period="${urlPeriod}"]`);
            if (activeButton) {
                timeFilterButtons.forEach(btn => btn.classList.remove('active'));
                activeButton.classList.add('active');
            } else {
                // Fallback to default if URL period is invalid
                const defaultButton = document.querySelector('.time-filter-btn[data-period="24h"]');
                if (defaultButton) {
                    timeFilterButtons.forEach(btn => btn.classList.remove('active'));
                    defaultButton.classList.add('active');
                }
            }

            // Update chart with period from URL if it's not the default
            if (urlPeriod !== '24h') {
                this.createExperimentChart(experimentId, chartsContainer, urlPeriod);
            }

            // Setup "Vue détaillée" button
            const openDataBtn = document.getElementById('open-in-data-view');
            if (openDataBtn) {
                openDataBtn.addEventListener('click', () => {
                    this.openInDataView(experimentId);
                });
            }
        }, 100);
    }

    async createExperimentChart(experimentId, container, period = '24h') {
        console.log(`Creating chart for experiment ${experimentId} with period ${period}`);

        const canvas = document.createElement('canvas');
        canvas.id = 'experiment-mini-chart';
        container.innerHTML = '';
        container.appendChild(canvas);

        try {
            // Get measurements for this experiment with time period
            const apiUrl = `/api/sensors/measurements?experimentId=${experimentId}&period=${period}&limit=200`;
            console.log(`Fetching data from: ${apiUrl}`);
            const measurementsResponse = await fetch(apiUrl);
            const measurementsData = await measurementsResponse.json();

            console.log(`Received ${measurementsData.data ? measurementsData.data.length : 0} measurements (total: ${measurementsData.total || 'unknown'})`);

            if (!measurementsData.data || measurementsData.data.length === 0) {
                container.innerHTML = '<p>Aucune donnée de mesure disponible</p>';
                return;
            }

            // Get sensor types for labels
            const typesResponse = await fetch('/api/sensors/types');
            const typesData = await typesResponse.json();
            const sensorTypes = {};
            typesData.data.forEach(type => {
                sensorTypes[type.id] = type;
            });

            // Group measurements by sensor type
            const groupedData = {};
            measurementsData.data.forEach(measurement => {
                if (!groupedData[measurement.sensor_type_id]) {
                    groupedData[measurement.sensor_type_id] = [];
                }
                groupedData[measurement.sensor_type_id].push(measurement);
            });

            // Create datasets
            const colors = ['#667eea', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6', '#34495e'];
            const datasets = Object.keys(groupedData).slice(0, 3).map((typeId, index) => {
                const sensorType = sensorTypes[typeId];
                const measurements = groupedData[typeId].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                return {
                    label: sensorType ? `${sensorType.icon} ${sensorType.name}` : typeId,
                    data: measurements.map(m => ({
                        x: new Date(m.timestamp),
                        y: parseFloat(m.value)
                    })),
                    borderColor: colors[index],
                    backgroundColor: colors[index] + '20',
                    fill: false,
                    tension: 0.4
                };
            });

            new Chart(canvas, {
                type: 'line',
                data: { datasets },
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
                                unit: this.getTimeUnit(period),
                                displayFormats: {
                                    'minute': 'HH:mm',
                                    'hour': 'HH:mm',
                                    'day': 'dd/MM'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Temps'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Valeur'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `Évolution des mesures (${this.getPeriodLabel(period)} - ${measurementsData.total} points)`
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
                                padding: 15,
                                generateLabels: (chart) => {
                                    return chart.data.datasets.map((dataset, index) => {
                                        const meta = chart.getDatasetMeta(index);
                                        const isHidden = meta && meta.hidden;

                                        return {
                                            text: dataset.label,
                                            fillStyle: isHidden ? dataset.borderColor + '40' : dataset.borderColor,
                                            strokeStyle: isHidden ? dataset.borderColor + '40' : dataset.borderColor,
                                            fontColor: isHidden ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.8)',
                                            lineWidth: isHidden ? 1 : 2,
                                            pointStyle: 'circle',
                                            hidden: false,
                                            datasetIndex: index
                                        };
                                    });
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error creating experiment chart:', error);
            container.innerHTML = '<p>Erreur lors du chargement des graphiques</p>';
        }
    }

    createCustomLegend(chart, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        // Remove existing legend
        const existingLegend = container.querySelector('.custom-chart-legend');
        if (existingLegend) {
            existingLegend.remove();
        }

        // Create legend container
        const legendContainer = document.createElement('div');
        legendContainer.className = 'custom-chart-legend';
        legendContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            margin-top: 0.5rem;
        `;

        // Create legend items
        chart.data.datasets.forEach((dataset, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'custom-legend-item';
            legendItem.style.cssText = `
                display: flex;
                align-items: center;
                padding: 0.5rem 1rem;
                border-radius: calc(var(--border-radius) / 2);
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: var(--glass-blur);
                border: 1px solid rgba(0, 0, 0, 0.1);
                cursor: pointer;
                transition: var(--transition);
                font-size: 0.9rem;
                font-weight: 500;
                margin: 0.25rem;
                user-select: none;
            `;

            // Color indicator
            const colorBox = document.createElement('span');
            colorBox.style.cssText = `
                display: inline-block;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background-color: ${dataset.borderColor};
                margin-right: 0.5rem;
                flex-shrink: 0;
            `;

            // Label text
            const labelText = document.createElement('span');
            labelText.textContent = dataset.label;

            legendItem.appendChild(colorBox);
            legendItem.appendChild(labelText);

            // Click handler
            legendItem.addEventListener('click', () => {
                const meta = chart.getDatasetMeta(index);
                meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : !meta.hidden;
                chart.update();
                this.updateCustomLegendStyles(chart, legendContainer);
            });

            // Hover effects
            legendItem.addEventListener('mouseenter', () => {
                if (!chart.getDatasetMeta(index).hidden) {
                    legendItem.style.background = '#f8f9fa';
                    legendItem.style.transform = 'translateY(-1px)';
                    legendItem.style.border = '1px solid rgba(102, 126, 234, 0.3)';
                    legendItem.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }
            });

            legendItem.addEventListener('mouseleave', () => {
                if (!chart.getDatasetMeta(index).hidden) {
                    legendItem.style.background = 'rgba(255, 255, 255, 0.9)';
                    legendItem.style.transform = 'none';
                    legendItem.style.border = '1px solid rgba(0, 0, 0, 0.1)';
                    legendItem.style.boxShadow = 'none';
                }
            });

            legendContainer.appendChild(legendItem);
        });

        // Insert legend before the canvas
        const canvas = container.querySelector('canvas');
        if (canvas) {
            container.insertBefore(legendContainer, canvas);
        } else {
            container.appendChild(legendContainer);
        }

        // Initial update of legend styles
        this.updateCustomLegendStyles(chart, legendContainer);
    }

    updateCustomLegendStyles(chart, legendContainer) {
        const legendItems = legendContainer.querySelectorAll('.custom-legend-item');
        legendItems.forEach((item, index) => {
            const meta = chart.getDatasetMeta(index);
            const isHidden = meta && meta.hidden;

            if (isHidden) {
                item.style.opacity = '0.4';
                item.style.background = 'rgba(255, 255, 255, 0.5)';
                item.style.transform = 'none';
                item.style.boxShadow = 'none';
            } else {
                item.style.opacity = '1';
                item.style.background = 'rgba(255, 255, 255, 0.9)';
            }
        });
    }

    async loadExperimentsList() {
        const container = document.getElementById('experiments-list');
        if (!container) return;

        // Load data if not already loaded
        if (this.experiments.length === 0) {
            await this.loadInitialData();
        }

        this.createExperimentsLegend();
        this.populateFilterDropdowns();
        this.bindFilterEvents();
        this.bindToggleEvents();
        this.bindExperimentsFilterSearch();

        // Apply URL parameters to filters if they exist
        this.applyUrlParamsToExperimentsFilters();

        container.innerHTML = '';

        // Check which experiments have sensor data
        const experimentsWithSensors = await this.getExperimentsWithSensors();

        this.experiments.forEach(experiment => {
            const card = document.createElement('div');
            const hasSensors = experimentsWithSensors.includes(experiment.id);
            card.className = `experiment-card ${experiment.protocol} ${hasSensors ? 'has-sensors' : ''}`;

            const sensorIndicator = hasSensors ? '<span class="sensor-indicator" title="Données de capteurs disponibles">📊</span>' : '';

            card.innerHTML = `
                <h3>${experiment.title} ${sensorIndicator}</h3>
                <p>${experiment.description}</p>
                <div class="experiment-meta">
                    <span class="experiment-location">📍 ${experiment.city}</span>
                    <span class="protocol-badge ${experiment.protocol}" title="${this.getProtocolLabel(experiment.protocol)}">${this.getProtocolIcon(experiment.protocol)}</span>
                </div>
            `;

            card.addEventListener('click', () => this.showExperimentDetail(experiment.id));
            container.appendChild(card);
        });
    }

    async filterExperiments(protocol) {
        const container = document.getElementById('experiments-list');
        const filteredExperiments = protocol ?
            this.experiments.filter(exp => exp.protocol === protocol) :
            this.experiments;

        container.innerHTML = '';

        // Check which experiments have sensor data
        const experimentsWithSensors = await this.getExperimentsWithSensors();

        filteredExperiments.forEach(experiment => {
            const card = document.createElement('div');
            const hasSensors = experimentsWithSensors.includes(experiment.id);
            card.className = `experiment-card ${experiment.protocol} ${hasSensors ? 'has-sensors' : ''}`;

            const sensorIndicator = hasSensors ? '<span class="sensor-indicator" title="Données de capteurs disponibles">📊</span>' : '';

            card.innerHTML = `
                <h3>${experiment.title} ${sensorIndicator}</h3>
                <p>${experiment.description}</p>
                <div class="experiment-meta">
                    <span class="experiment-location">📍 ${experiment.city}</span>
                    <span class="protocol-badge ${experiment.protocol}" title="${this.getProtocolLabel(experiment.protocol)}">${this.getProtocolIcon(experiment.protocol)}</span>
                </div>
            `;

            card.addEventListener('click', () => this.showExperimentDetail(experiment.id));
            container.appendChild(card);
        });
    }

    async getExperimentsWithSensors() {
        try {
            const response = await fetch('/api/sensors/measurements?limit=1000');
            const data = await response.json();

            if (data.success && data.data) {
                // Get unique experiment IDs that have measurements
                const experimentIds = [...new Set(data.data.map(m => m.experiment_id))];
                return experimentIds;
            }
            return [];
        } catch (error) {
            console.error('Error checking experiments with sensors:', error);
            return [];
        }
    }

    async loadChartData(preselectedExperimentId = null) {
        const experimentSelect = document.getElementById('experiment-select');
        if (!experimentSelect) return;

        // Load data if not already loaded
        if (this.experiments.length === 0) {
            await this.loadInitialData();
        }

        // Get experiments that have sensor data
        const experimentsWithSensors = await this.getExperimentsWithSensors();

        // Filter experiments to only show those with sensors
        const filteredExperiments = this.experiments.filter(exp =>
            experimentsWithSensors.includes(exp.id)
        );

        // Populate experiment select with only experiments that have sensors
        experimentSelect.innerHTML = '<option value="">Choisir une expérience</option>';
        filteredExperiments.forEach(exp => {
            const option = document.createElement('option');
            option.value = exp.id;
            option.textContent = exp.title;
            experimentSelect.appendChild(option);
        });

        // Apply URL parameters to filters if they exist
        this.applyUrlParamsToFilters();

        // If a specific experiment is preselected, select it and load its chart
        if (preselectedExperimentId) {
            experimentSelect.value = preselectedExperimentId;
            await this.updateDataSensorTypes(); // Update sensor types for selected experiment
            await this.loadExperimentChart(preselectedExperimentId);

            // If there were URL params with filters, apply them now
            // But skip if we have a pending sensor value that will trigger applyDataFilters() later
            const hasFilters = document.getElementById('data-start-date')?.value ||
                              document.getElementById('data-end-date')?.value ||
                              document.getElementById('sensor-type-select')?.value ||
                              document.getElementById('data-period-select')?.value !== 'all' ||
                              document.getElementById('data-min-quality')?.value ||
                              (document.getElementById('data-limit')?.value && document.getElementById('data-limit')?.value.trim() !== '');

            if (hasFilters && !this.pendingSensorTypeValue) {
                this.applyDataFilters();
            }
        } else {
            // Clear any existing chart and statistics when no experiment is selected
            this.clearDataDisplay();
        }
    }

    applyUrlParamsToFilters() {
        if (!this.urlParams || Object.keys(this.urlParams).length === 0) return;

        // Map URL parameters to filter elements
        const paramMap = {
            'from': 'data-start-date',
            'to': 'data-end-date',
            'limit': 'data-limit',
            'period': 'data-period-select',
            'sensor': 'sensor-type-select',
            'quality': 'data-min-quality'
        };

        // Apply each parameter to the corresponding filter
        Object.entries(paramMap).forEach(([urlParam, elementId]) => {
            const value = this.urlParams[urlParam];
            const element = document.getElementById(elementId);

            if (value && element) {
                // For sensor selector, store the value to apply later if it has no options yet
                if (elementId === 'sensor-type-select' && element.options.length <= 1) {
                    this.pendingSensorTypeValue = value;
                } else {
                    element.value = value;
                }
            }
        });

        // Only clear URL params for non-sensor parameters
        // Sensor parameter will be cleared after being applied in loadExperimentChart
        const newUrlParams = {};
        if (this.urlParams.sensor && this.pendingSensorTypeValue) {
            newUrlParams.sensor = this.urlParams.sensor;
        }
        this.urlParams = Object.keys(newUrlParams).length > 0 ? newUrlParams : null;
    }

    clearDataDisplay() {
        // Clear the chart
        const chartContainer = document.getElementById('main-chart');
        if (chartContainer) {
            chartContainer.innerHTML = '<p style="text-align: center; margin-top: 2rem; color: #666;">Sélectionnez une expérience pour voir les données</p>';
        }

        // Clear the statistics panel
        const statsPanel = document.getElementById('data-stats-panel');
        if (statsPanel) {
            statsPanel.style.display = 'none';
        }

        // Clear sensor type options
        const sensorTypeSelect = document.getElementById('sensor-type-select');
        if (sensorTypeSelect) {
            sensorTypeSelect.innerHTML = '<option value="">Choisir un type de capteur</option>';
        }

        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    async loadExperimentChart(experimentId) {
        if (!experimentId) return;

        const sensorTypeSelect = document.getElementById('sensor-type-select');
        const chartContainer = document.getElementById('main-chart');

        try {
            // Get measurements for this experiment
            const measurementsResponse = await fetch(`/api/sensors/measurements?experimentId=${experimentId}&period=all&limit=1000`);
            const measurementsData = await measurementsResponse.json();

            if (!measurementsData.success || !measurementsData.data || measurementsData.data.length === 0) {
                if (chartContainer) {
                    chartContainer.innerHTML = '<p>Aucune donnée de mesure disponible pour cette expérience</p>';
                }
                return;
            }

            // Get sensor types for labels
            const typesResponse = await fetch('/api/sensors/types');
            const typesData = await typesResponse.json();
            const sensorTypes = {};
            typesData.data.forEach(type => {
                sensorTypes[type.id] = type;
            });

            // Populate sensor type select with unique types from measurements
            const uniqueTypeIds = [...new Set(measurementsData.data.map(m => m.sensor_type_id))];
            sensorTypeSelect.innerHTML = '<option value="">Tous les types de capteurs</option>';
            uniqueTypeIds.forEach(typeId => {
                const type = sensorTypes[typeId];
                if (type) {
                    const option = document.createElement('option');
                    option.value = typeId;
                    option.textContent = `${type.icon} ${type.name}`;
                    sensorTypeSelect.appendChild(option);
                }
            });

            // Apply pending sensor type value if it exists
            if (this.pendingSensorTypeValue) {
                sensorTypeSelect.value = this.pendingSensorTypeValue;
                this.pendingSensorTypeValue = null;
                this.urlParams = null; // Clear URL params after applying the sensor filter

                // Apply filters to update data and URL after sensor value is set
                setTimeout(() => {
                    this.applyDataFiltersPreservingUrl();
                }, 50);
            }

            // Create chart with all measurements
            this.createMainChart(measurementsData.data, sensorTypes);

            // Calculate and display statistics with a small delay to ensure DOM is ready
            setTimeout(() => {
                this.calculateAndDisplayStats(measurementsData.data);
            }, 100);

        } catch (error) {
            console.error('Error loading experiment chart:', error);
            const chartContainer = document.getElementById('main-chart');
            if (chartContainer) {
                chartContainer.innerHTML = '<p>Erreur lors du chargement des données</p>';
            }
        }
    }

    updateChartSensorType(sensorType) {
        const experimentId = document.getElementById('experiment-select').value;
        if (!experimentId) return;

        this.loadExperimentChart(experimentId);
    }

    createMainChart(measurements, sensorTypes) {
        const canvas = document.getElementById('dataChart');
        if (!canvas) return;

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        if (measurements.length === 0) {
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        // Group measurements by sensor type
        const groupedData = {};
        measurements.forEach(measurement => {
            if (!groupedData[measurement.sensor_type_id]) {
                groupedData[measurement.sensor_type_id] = [];
            }
            groupedData[measurement.sensor_type_id].push(measurement);
        });

        // Create datasets
        const colors = ['#667eea', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6', '#34495e'];
        const datasets = Object.keys(groupedData).map((typeId, index) => {
            const sensorType = sensorTypes[typeId];
            const typeMeasurements = groupedData[typeId].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            return {
                label: sensorType ? `${sensorType.icon} ${sensorType.name}` : typeId,
                data: typeMeasurements.map(m => ({
                    x: new Date(m.timestamp),
                    y: parseFloat(m.value)
                })),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                fill: false,
                tension: 0.4
            };
        });

        this.chart = new Chart(canvas, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Valeur'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Évolution des données de capteurs'
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Create custom legend for data view
        setTimeout(() => {
            if (this.chart && this.chart.data.datasets.length > 0) {
                this.createCustomLegend(this.chart, 'chart-container');
            }
        }, 100);
    }

    createExperimentsLegend() {
        const legend = document.getElementById('experiments-legend');
        if (!legend) return;

        const protocols = [
            { key: 'environmental', label: `🌱 ${this.getProtocolLabel('environmental')}` },
            { key: 'energy', label: `⚡ ${this.getProtocolLabel('energy')}` },
            { key: 'mobility', label: `🚗 ${this.getProtocolLabel('mobility')}` },
            { key: 'governance', label: `🏛️ ${this.getProtocolLabel('governance')}` },
            { key: 'technology', label: `💻 ${this.getProtocolLabel('technology')}` }
        ];

        // Add "All" option at the beginning
        const legendHTML = `
            <div class="legend-item clickable ${this.activeExperimentFilter === null ? 'active' : ''}" data-protocol="">
                <div class="legend-color all-colors"></div>
                <span>Tous les clusters</span>
            </div>
            ${protocols.map(protocol => `
                <div class="legend-item clickable ${this.activeExperimentFilter === protocol.key ? 'active' : ''}" data-protocol="${protocol.key}">
                    <div class="legend-color" style="background-color: ${this.protocolColors[protocol.key]}"></div>
                    <span>${protocol.label}</span>
                </div>
            `).join('')}
        `;

        legend.innerHTML = legendHTML;

        // Add click listeners
        legend.querySelectorAll('.legend-item.clickable').forEach(item => {
            item.addEventListener('click', (e) => {
                const protocolKey = item.getAttribute('data-protocol');
                this.filterExperimentsByLegend(protocolKey);
            });
        });
    }

    filterExperimentsByLegend(protocolKey) {
        // Update active filter
        this.activeExperimentFilter = protocolKey;

        // Apply all filters (including the new protocol filter)
        this.applyFilters();

        // Update legend visual state
        this.updateExperimentsLegendState();
    }

    updateExperimentsLegendState() {
        const legend = document.getElementById('experiments-legend');
        if (!legend) return;

        // Update active states
        legend.querySelectorAll('.legend-item.clickable').forEach(item => {
            const protocolKey = item.getAttribute('data-protocol');
            const isActive = (protocolKey === '' && this.activeExperimentFilter === null) ||
                           (protocolKey === this.activeExperimentFilter);

            item.classList.toggle('active', isActive);
        });
    }

    getProtocolLabel(protocol) {
        const labels = {
            environmental: 'Qualité environnementale, climat et bien-être',
            energy: 'Économies d\'énergie',
            mobility: 'Mobilité',
            governance: 'Gouvernance et citoyenneté',
            technology: 'IA et technologies'
        };
        return labels[protocol] || protocol;
    }

    populateFilterDropdowns() {
        // Extract country from city data (simplified - assume format is "City, Country" or just use countries list)
        const countries = [...new Set(this.experiments.map(exp => this.getCountryFromCity(exp.city)))].sort();
        const cities = [...new Set(this.experiments.map(exp => exp.city))].sort();
        const schools = [...new Set(this.experiments.map(exp => exp.school))].sort();
        const statuses = [...new Set(this.experiments.map(exp => exp.status))].filter(status => status).sort();
        const protocols = [...new Set(this.experiments.map(exp => exp.protocol_name))].filter(protocol => protocol).sort();


        // Populate country filter
        const countryFilter = document.getElementById('country-filter');
        if (countryFilter) {
            countryFilter.innerHTML = '<option value="">Tous les pays</option>';
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countryFilter.appendChild(option);
            });
        }

        // Populate city filter
        const cityFilter = document.getElementById('city-filter');
        if (cityFilter) {
            cityFilter.innerHTML = '<option value="">Toutes les villes</option>';
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                cityFilter.appendChild(option);
            });
        }

        // Populate school filter
        const schoolFilter = document.getElementById('school-filter');
        if (schoolFilter) {
            schoolFilter.innerHTML = '<option value="">Toutes les écoles</option>';
            schools.forEach(school => {
                const option = document.createElement('option');
                option.value = school;
                option.textContent = school;
                schoolFilter.appendChild(option);
            });
        }

        // Populate status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.innerHTML = '<option value="">Tous les statuts</option>';
            statuses.forEach(status => {
                const option = document.createElement('option');
                option.value = status;
                option.textContent = this.getStatusLabel(status);
                statusFilter.appendChild(option);
            });
        }

        // Populate protocol filter
        const protocolFilter = document.getElementById('experiment-protocol-filter');
        if (protocolFilter) {
            protocolFilter.innerHTML = '<option value="">Tous les protocoles</option>';
            protocols.forEach(protocol => {
                const option = document.createElement('option');
                option.value = protocol;
                option.textContent = protocol;
                protocolFilter.appendChild(option);
            });
        }
    }

    getCountryFromCity(city) {
        // Simple mapping for European cities - you can extend this
        const cityToCountry = {
            'Aix-en-Provence': 'France',
            'Marseille': 'France',
            'Lyon': 'France',
            'Paris': 'France',
            'Nice': 'France',
            'Toulouse': 'France',
            'Bordeaux': 'France',
            'Brussels': 'Belgique',
            'Bruxelles': 'Belgique',
            'Antwerp': 'Belgique',
            'Anvers': 'Belgique',
            'Sofia': 'Bulgarie',
            'Plovdiv': 'Bulgarie',
            'Rome': 'Italie',
            'Milan': 'Italie',
            'Naples': 'Italie',
            'Florence': 'Italie'
        };
        return cityToCountry[city] || 'Autre';
    }

    getStatusLabel(status) {
        const statusLabels = {
            'active': 'Actif',
            'planned': 'Planifié',
            'ongoing': 'En cours',
            'finished': 'Terminé',
            'archived': 'Archivée',
            'pending': 'En attente',
            'cancelled': 'Annulé'
        };
        return statusLabels[status] || status;
    }

    bindFilterEvents() {
        const countryFilter = document.getElementById('country-filter');
        const cityFilter = document.getElementById('city-filter');
        const schoolFilter = document.getElementById('school-filter');
        const statusFilter = document.getElementById('status-filter');
        const protocolFilter = document.getElementById('experiment-protocol-filter');
        const startDateFilter = document.getElementById('start-date-filter');
        const endDateFilter = document.getElementById('end-date-filter');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        const sensorFilterBtn = document.getElementById('sensor-filter-btn');

        [countryFilter, cityFilter, schoolFilter, statusFilter, protocolFilter, startDateFilter, endDateFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => this.applyFilters());
            }
        });

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }

        if (sensorFilterBtn) {
            sensorFilterBtn.addEventListener('click', () => this.toggleSensorFilter());
        }
    }

    bindToggleEvents() {
        const toggles = document.querySelectorAll('.filter-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const targetId = toggle.getAttribute('data-target');
                const targetContent = document.getElementById(targetId);
                const icon = toggle.querySelector('.toggle-icon');

                if (targetContent) {
                    const isVisible = targetContent.style.display !== 'none';
                    targetContent.style.display = isVisible ? 'none' : 'block';
                    icon.classList.toggle('rotated', !isVisible);
                }
            });
        });
    }

    bindExperimentsFilterSearch() {
        const filterSearchBox = document.getElementById('experiments-filter-search-box');

        if (filterSearchBox) {
            filterSearchBox.addEventListener('click', () => {
                const basicFilters = document.getElementById('experiments-basic-filters');
                const additionalFilters = document.getElementById('additional-filters');

                if (basicFilters && additionalFilters) {
                    const isVisible = additionalFilters.style.display !== 'none';
                    basicFilters.style.display = isVisible ? 'none' : 'block';
                    additionalFilters.style.display = isVisible ? 'none' : 'block';

                    // Update search box appearance
                    this.updateExperimentsFilterSearchBox();
                }
            });
        }
    }

    updateExperimentsFilterSearchBox() {
        const filterInput = document.getElementById('experiments-filter-input');
        const filterCount = document.getElementById('experiments-filter-count');

        if (!filterInput || !filterCount) return;

        // Count active filters
        let activeFilters = 0;
        const filterDescriptions = [];

        // Check cluster filters
        const activeClusters = this.getActiveClusters();
        if (activeClusters.length > 0 && activeClusters.length < Object.keys(this.protocolColors).length - 1) {
            activeFilters++;
            filterDescriptions.push(`${activeClusters.length} cluster${activeClusters.length > 1 ? 's' : ''}`);
        }

        // Check sensor filter
        const sensorFilterBtn = document.getElementById('sensor-filter-btn');
        if (sensorFilterBtn && sensorFilterBtn.getAttribute('data-active') === 'true') {
            activeFilters++;
            filterDescriptions.push('Avec capteurs');
        }

        // Check location filters
        const countryFilter = document.getElementById('country-filter');
        const cityFilter = document.getElementById('city-filter');
        const schoolFilter = document.getElementById('school-filter');
        const statusFilter = document.getElementById('status-filter');
        const protocolFilter = document.getElementById('experiment-protocol-filter');

        if (countryFilter?.value && countryFilter.value.trim() !== '') {
            activeFilters++;
            filterDescriptions.push(countryFilter.options[countryFilter.selectedIndex].text);
        }
        if (cityFilter?.value && cityFilter.value.trim() !== '') {
            activeFilters++;
            filterDescriptions.push(cityFilter.options[cityFilter.selectedIndex].text);
        }
        if (schoolFilter?.value && schoolFilter.value.trim() !== '') {
            activeFilters++;
            filterDescriptions.push(schoolFilter.options[schoolFilter.selectedIndex].text);
        }
        if (statusFilter?.value && statusFilter.value.trim() !== '') {
            activeFilters++;
            filterDescriptions.push(statusFilter.options[statusFilter.selectedIndex].text);
        }
        if (protocolFilter?.value && protocolFilter.value.trim() !== '') {
            activeFilters++;
            filterDescriptions.push(protocolFilter.options[protocolFilter.selectedIndex].text);
        }

        // Check date filters
        const startDateFilter = document.getElementById('start-date-filter');
        const endDateFilter = document.getElementById('end-date-filter');

        if (startDateFilter?.value) {
            activeFilters++;
            filterDescriptions.push(`Depuis ${startDateFilter.value}`);
        }
        if (endDateFilter?.value) {
            activeFilters++;
            filterDescriptions.push(`Jusqu'à ${endDateFilter.value}`);
        }

        // Update filter count and input placeholder
        if (activeFilters > 0) {
            filterCount.style.display = 'block';
            filterCount.textContent = `${activeFilters} filtre${activeFilters > 1 ? 's' : ''} actif${activeFilters > 1 ? 's' : ''}`;
            filterInput.placeholder = filterDescriptions.slice(0, 2).join(', ') + (filterDescriptions.length > 2 ? '...' : '');
        } else {
            filterCount.style.display = 'none';
            filterInput.placeholder = 'Rechercher ou filtrer les expériences...';
        }
    }

    getActiveClusters() {
        const legendItems = document.querySelectorAll('.legend-item');
        const activeClusters = [];

        legendItems.forEach(item => {
            if (!item.classList.contains('inactive')) {
                const protocolName = item.getAttribute('data-protocol');
                if (protocolName) {
                    activeClusters.push(protocolName);
                }
            }
        });

        return activeClusters;
    }

    applyFilters() {
        const countryFilter = document.getElementById('country-filter');
        const cityFilter = document.getElementById('city-filter');
        const schoolFilter = document.getElementById('school-filter');
        const statusFilter = document.getElementById('status-filter');
        const protocolFilter = document.getElementById('experiment-protocol-filter');
        const startDateFilter = document.getElementById('start-date-filter');
        const endDateFilter = document.getElementById('end-date-filter');

        const selectedCountry = countryFilter ? countryFilter.value : '';
        const selectedCity = cityFilter ? cityFilter.value : '';
        const selectedSchool = schoolFilter ? schoolFilter.value : '';
        const selectedStatus = statusFilter ? statusFilter.value : '';
        const selectedProtocolName = protocolFilter ? protocolFilter.value : '';
        const selectedStartDate = startDateFilter ? startDateFilter.value : '';
        const selectedEndDate = endDateFilter ? endDateFilter.value : '';
        const selectedProtocolCategory = this.activeExperimentFilter;

        let filteredExperiments = this.experiments;

        // Apply country filter
        if (selectedCountry) {
            filteredExperiments = filteredExperiments.filter(exp =>
                this.getCountryFromCity(exp.city) === selectedCountry
            );
        }

        // Apply city filter
        if (selectedCity) {
            filteredExperiments = filteredExperiments.filter(exp => exp.city === selectedCity);
        }

        // Apply school filter
        if (selectedSchool) {
            filteredExperiments = filteredExperiments.filter(exp => exp.school === selectedSchool);
        }

        // Apply status filter
        if (selectedStatus) {
            filteredExperiments = filteredExperiments.filter(exp => exp.status === selectedStatus);
        }

        // Apply protocol name filter
        if (selectedProtocolName) {
            filteredExperiments = filteredExperiments.filter(exp => exp.protocol_name === selectedProtocolName);
        }

        // Apply protocol category filter (from legend)
        if (selectedProtocolCategory) {
            filteredExperiments = filteredExperiments.filter(exp => exp.protocol === selectedProtocolCategory);
        }

        // Apply date filters
        if (selectedStartDate) {
            filteredExperiments = filteredExperiments.filter(exp =>
                new Date(exp.start_date) >= new Date(selectedStartDate)
            );
        }

        if (selectedEndDate) {
            filteredExperiments = filteredExperiments.filter(exp =>
                new Date(exp.end_date) <= new Date(selectedEndDate)
            );
        }

        // Apply sensor filter
        const sensorFilterBtn = document.getElementById('sensor-filter-btn');
        const sensorFilterActive = sensorFilterBtn && sensorFilterBtn.getAttribute('data-active') === 'true';

        if (sensorFilterActive) {
            // Get experiments with sensors and filter accordingly
            this.displayFilteredExperiments(filteredExperiments, true);
        } else {
            this.displayFilteredExperiments(filteredExperiments, false);
        }

        // Update search box display
        this.updateExperimentsFilterSearchBox();

        // Build query parameters object for URL
        const queryParams = {};
        if (selectedCountry && selectedCountry.trim() !== '') queryParams.country = selectedCountry;
        if (selectedCity && selectedCity.trim() !== '') queryParams.city = selectedCity;
        if (selectedSchool && selectedSchool.trim() !== '') queryParams.school = selectedSchool;
        if (selectedStatus && selectedStatus.trim() !== '') queryParams.status = selectedStatus;
        if (selectedProtocolName && selectedProtocolName.trim() !== '') queryParams.protocol = selectedProtocolName;
        if (selectedStartDate) queryParams.start = selectedStartDate;
        if (selectedEndDate) queryParams.end = selectedEndDate;
        if (selectedProtocolCategory && selectedProtocolCategory.trim() !== '') queryParams.cluster = selectedProtocolCategory;
        if (sensorFilterActive) queryParams.sensors = 'true';

        // Update URL with current filters
        this.updateUrl('experiments', null, queryParams);
    }

    async displayFilteredExperiments(experiments, sensorFilterActive = false) {
        const container = document.getElementById('experiments-list');
        if (!container) return;

        container.innerHTML = '';

        // Get experiments with sensors to show indicators and apply filter
        const experimentsWithSensors = await this.getExperimentsWithSensors();

        experiments.forEach(experiment => {
            // If sensor filter is active, only show experiments with sensors
            if (sensorFilterActive && !experimentsWithSensors.includes(experiment.id)) {
                return;
            }

            const card = document.createElement('div');
            const hasSensors = experimentsWithSensors.includes(experiment.id);
            card.className = `experiment-card ${experiment.protocol} ${hasSensors ? 'has-sensors' : ''}`;

            const sensorIndicator = hasSensors ? '<span class="sensor-indicator" title="Données de capteurs disponibles">📊</span>' : '';

            card.innerHTML = `
                <h3>${experiment.title} ${sensorIndicator}</h3>
                <p>${experiment.description}</p>
                <div class="experiment-meta">
                    <span class="experiment-location">📍 ${experiment.city}</span>
                    <span class="experiment-school">🏫 ${experiment.school}</span>
                    <span class="protocol-badge ${experiment.protocol}" title="${this.getProtocolLabel(experiment.protocol)}">${this.getProtocolIcon(experiment.protocol)}</span>
                </div>
            `;
            card.addEventListener('click', () => this.showExperimentDetail(experiment.id));
            container.appendChild(card);
        });

        // Update the count display
        const header = document.querySelector('#experiments-view .view-header h2');
        if (header) {
            const total = this.experiments.length;
            const filtered = experiments.length;
            header.textContent = filtered === total ?
                `Toutes les expériences (${total})` :
                `Expériences filtrées (${filtered}/${total})`;
        }
    }

    clearAllFilters() {
        const countryFilter = document.getElementById('country-filter');
        const cityFilter = document.getElementById('city-filter');
        const schoolFilter = document.getElementById('school-filter');
        const statusFilter = document.getElementById('status-filter');
        const protocolFilter = document.getElementById('experiment-protocol-filter');
        const startDateFilter = document.getElementById('start-date-filter');
        const endDateFilter = document.getElementById('end-date-filter');

        [countryFilter, cityFilter, schoolFilter, statusFilter, protocolFilter, startDateFilter, endDateFilter].forEach(filter => {
            if (filter) filter.value = '';
        });

        // Reset sensor filter
        const sensorFilterBtn = document.getElementById('sensor-filter-btn');
        if (sensorFilterBtn) {
            sensorFilterBtn.setAttribute('data-active', 'false');
        }

        this.activeExperimentFilter = null;
        this.updateExperimentsLegendState();
        this.applyFilters();
    }

    toggleSensorFilter() {
        const sensorFilterBtn = document.getElementById('sensor-filter-btn');
        if (!sensorFilterBtn) return;

        const isActive = sensorFilterBtn.getAttribute('data-active') === 'true';
        sensorFilterBtn.setAttribute('data-active', !isActive);

        this.applyFilters();
    }

    getProtocolIcon(protocol) {
        const icons = {
            environmental: '🌱',
            energy: '⚡',
            mobility: '🚗',
            governance: '🏛️',
            technology: '💻'
        };
        return icons[protocol] || '📋';
    }

    applyClusterColorToSections(clusterColor) {
        // Apply the cluster color to section borders
        const titleHeader = document.querySelector('.title-header');
        const sensorsSection = document.querySelector('.sensors-section h3');
        const chartsSection = document.querySelector('.charts-section h3');

        if (titleHeader) {
            titleHeader.style.borderBottomColor = clusterColor;
        }
        if (sensorsSection) {
            sensorsSection.style.borderBottomColor = clusterColor;
        }
        if (chartsSection) {
            chartsSection.style.borderBottomColor = clusterColor;
        }
    }

    openInDataView(experimentId) {
        // Store the experiment ID for when we switch to data view
        this.selectedExperimentForData = experimentId;

        // Switch to data view with URL update disabled, then update URL manually with experiment ID
        this.showView('data', false);
        this.updateUrl('data', experimentId, {}); // Empty query params when coming from experiment detail
    }

    openSensorInDataView(experimentId) {
        // Store the experiment ID for when we switch to data view
        this.selectedExperimentForData = experimentId;

        // Switch to data view with URL update disabled, then update URL manually with experiment ID
        this.showView('data', false);
        this.updateUrl('data', experimentId, {}); // Empty query params when coming from sensor detail
    }

    applyUrlParamsToExperimentsFilters() {
        if (!this.urlParams || Object.keys(this.urlParams).length === 0) return;

        // Map URL parameters to filter elements
        const paramMap = {
            'country': 'country-filter',
            'city': 'city-filter',
            'school': 'school-filter',
            'status': 'status-filter',
            'protocol': 'experiment-protocol-filter',
            'sensors': 'sensor-filter-btn'
        };

        // Apply each parameter to the corresponding filter
        Object.entries(paramMap).forEach(([urlParam, elementId]) => {
            const value = this.urlParams[urlParam];
            const element = document.getElementById(elementId);

            if (value && element) {
                if (elementId === 'sensor-filter-btn') {
                    // Handle sensor filter button (boolean)
                    if (value === 'true') {
                        element.setAttribute('data-active', 'true');
                        element.classList.add('active');
                        element.textContent = '📊 Avec capteurs uniquement';
                    }
                } else {
                    // Handle dropdown filters
                    element.value = value;
                }
            }
        });

        // Handle cluster filter (special case using activeExperimentFilter)
        const clusterValue = this.urlParams['cluster'];
        if (clusterValue && clusterValue.trim() !== '') {
            this.activeExperimentFilter = clusterValue;
        }

        // Apply filters after setting values
        setTimeout(() => {
            this.applyFilters();
            // Update legend visual state for cluster filter
            this.updateExperimentsLegendState();
        }, 100);

        // Clear URL params after applying them
        this.urlParams = null;
    }

    // Data Filter Methods
    bindDataFilterEvents() {
        // Basic filters
        const experimentSelect = document.getElementById('experiment-select');
        const sensorTypeSelect = document.getElementById('sensor-type-select');

        // Advanced filters
        const periodSelect = document.getElementById('data-period-select');
        const startDateInput = document.getElementById('data-start-date');
        const endDateInput = document.getElementById('data-end-date');
        const minQualitySelect = document.getElementById('data-min-quality');
        const limitSelect = document.getElementById('data-limit');

        // Buttons
        const applyFiltersBtn = document.getElementById('data-apply-filters-btn');
        const clearFiltersBtn = document.getElementById('data-clear-filters-btn');
        const filterSearchBox = document.getElementById('data-filter-search-box');

        // Auto-apply basic filters
        if (sensorTypeSelect) {
            sensorTypeSelect.addEventListener('change', () => this.applyDataFilters());
        }

        // Special handling for experiment select to update sensor types
        if (experimentSelect) {
            experimentSelect.addEventListener('change', () => {
                this.updateDataSensorTypes();
                this.applyDataFilters();
            });
        }

        // View experiment details button
        const viewDetailsBtn = document.getElementById('view-experiment-details');
        if (viewDetailsBtn && experimentSelect) {
            // Enable/disable button based on experiment selection
            const updateDetailsButton = () => {
                viewDetailsBtn.disabled = !experimentSelect.value;
            };

            experimentSelect.addEventListener('change', updateDetailsButton);
            updateDetailsButton(); // Initial state

            // Handle button click
            viewDetailsBtn.addEventListener('click', () => {
                const experimentId = experimentSelect.value;
                if (experimentId) {
                    this.showExperimentDetail(experimentId);
                }
            });
        }

        // Manual apply for advanced filters
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyDataFilters());
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearDataFilters());
        }

        // Filter search box toggle
        if (filterSearchBox) {
            filterSearchBox.addEventListener('click', () => {
                const additionalFilters = document.getElementById('data-additional-filters');

                if (additionalFilters) {
                    const isVisible = additionalFilters.style.display !== 'none';
                    additionalFilters.style.display = isVisible ? 'none' : 'block';

                    // Update search box appearance
                    this.updateFilterSearchBox();
                }
            });
        }

        // Collapsible sections
        const toggles = document.querySelectorAll('#data-view .filter-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const targetId = toggle.getAttribute('data-target');
                const targetContent = document.getElementById(targetId);
                const icon = toggle.querySelector('.toggle-icon');

                if (targetContent) {
                    const isVisible = targetContent.style.display !== 'none';
                    targetContent.style.display = isVisible ? 'none' : 'block';
                    icon.classList.toggle('rotated', !isVisible);
                }
            });
        });
    }

    applyDataFilters() {
        const experimentId = document.getElementById('experiment-select')?.value;
        const sensorTypeId = document.getElementById('sensor-type-select')?.value;
        const period = document.getElementById('data-period-select')?.value || 'all';
        const startDate = document.getElementById('data-start-date')?.value;
        const endDate = document.getElementById('data-end-date')?.value;
        const minQuality = document.getElementById('data-min-quality')?.value;
        const limit = document.getElementById('data-limit')?.value || '';

        // Update selectedExperimentForData and URL when experiment changes
        if (experimentId && experimentId !== this.selectedExperimentForData) {
            this.selectedExperimentForData = experimentId;
        } else if (!experimentId && this.selectedExperimentForData) {
            this.selectedExperimentForData = null;
        }

        // Build query parameters object for URL
        const queryParams = {};
        if (sensorTypeId && sensorTypeId.trim() !== '') queryParams.sensor = sensorTypeId;
        if (period && period !== 'all') queryParams.period = period;
        if (startDate) queryParams.from = startDate;
        if (endDate) queryParams.to = endDate;
        if (minQuality && minQuality.trim() !== '') queryParams.quality = minQuality;
        if (limit && limit.trim() !== '') queryParams.limit = limit;

        // Update URL with current filters
        this.updateUrl('data', this.selectedExperimentForData, queryParams);

        // Update search box appearance
        this.updateFilterSearchBox();

        this.loadFilteredChartData(experimentId, sensorTypeId, period, startDate, endDate, minQuality, limit);
    }

    applyDataFiltersPreservingUrl() {
        // Get current URL parameters to preserve them from hash
        const hash = window.location.hash;
        const [, queryString] = hash.split('?');
        const currentParams = new URLSearchParams(queryString || '');

        const experimentId = document.getElementById('experiment-select')?.value;
        const sensorTypeId = document.getElementById('sensor-type-select')?.value;
        const period = document.getElementById('data-period-select')?.value || 'all';
        const startDate = document.getElementById('data-start-date')?.value;
        const endDate = document.getElementById('data-end-date')?.value;
        const minQuality = document.getElementById('data-min-quality')?.value;

        // For limit, use the current URL value if it exists, otherwise use DOM value
        const limit = currentParams.get('limit') ||
                     document.getElementById('data-limit')?.value || '';

        // Update selectedExperimentForData when experiment changes
        if (experimentId && experimentId !== this.selectedExperimentForData) {
            this.selectedExperimentForData = experimentId;
        } else if (!experimentId && this.selectedExperimentForData) {
            this.selectedExperimentForData = null;
        }

        // Build query parameters object for URL, preserving existing values where appropriate
        const queryParams = {};
        if (sensorTypeId && sensorTypeId.trim() !== '') queryParams.sensor = sensorTypeId;
        if (period && period !== 'all') queryParams.period = period;
        if (startDate) queryParams.from = startDate;
        if (endDate) queryParams.to = endDate;
        if (minQuality && minQuality.trim() !== '') queryParams.quality = minQuality;

        // Preserve the limit from URL if it existed, otherwise only add if specified
        if (currentParams.get('limit')) {
            queryParams.limit = currentParams.get('limit');
        } else if (limit && limit.trim() !== '') {
            queryParams.limit = limit;
        }

        // Update URL with current filters
        this.updateUrl('data', this.selectedExperimentForData, queryParams);

        // Update search box appearance
        this.updateFilterSearchBox();

        this.loadFilteredChartData(experimentId, sensorTypeId, period, startDate, endDate, minQuality, limit);
    }

    clearDataFilters() {
        // Clear all filter inputs
        const filters = [
            'experiment-select', 'sensor-type-select', 'data-period-select',
            'data-start-date', 'data-end-date', 'data-min-quality'
        ];

        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.value = '';
            }
        });

        // Reset limit to default (no limit)
        const limitSelect = document.getElementById('data-limit');
        if (limitSelect) {
            limitSelect.value = '';
        }

        // Update search box appearance
        this.updateFilterSearchBox();

        // Apply filters (will show all data)
        this.applyDataFilters();
    }

    async updateDataSensorTypes() {
        const experimentSelect = document.getElementById('experiment-select');
        const sensorTypeSelect = document.getElementById('sensor-type-select');

        if (!experimentSelect || !sensorTypeSelect) return;

        const selectedExperiment = experimentSelect.value;

        // Clear existing sensor type options except the first one (default option)
        while (sensorTypeSelect.children.length > 1) {
            sensorTypeSelect.removeChild(sensorTypeSelect.lastChild);
        }

        if (!selectedExperiment) return;

        try {
            // Fetch sensor data for this experiment to get available sensor types
            const response = await fetch(`/api/sensors?experimentId=${selectedExperiment}&limit=1000`);
            const data = await response.json();

            if (data.success && data.data) {
                // Get unique sensor types from measurements
                const uniqueTypes = [...new Set(data.data.map(measurement => {
                    // Try to get sensor type from measurement data
                    return measurement.sensorType || measurement.sensor_type_id;
                }).filter(Boolean))];

                // If we have sensor types, populate the select
                if (uniqueTypes.length > 0) {
                    uniqueTypes.sort().forEach(type => {
                        const option = document.createElement('option');
                        option.value = type;
                        option.textContent = type;
                        sensorTypeSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error updating sensor types:', error);
        }
    }

    updateFilterSearchBox() {
        const filterInput = document.getElementById('data-filter-input');
        const filterCount = document.getElementById('data-filter-count');

        if (!filterInput || !filterCount) return;

        // Count active filters
        let activeFilters = 0;
        const filterDescriptions = [];

        const experimentSelect = document.getElementById('experiment-select');
        const sensorTypeSelect = document.getElementById('sensor-type-select');
        const periodSelect = document.getElementById('data-period-select');
        const startDateInput = document.getElementById('data-start-date');
        const endDateInput = document.getElementById('data-end-date');
        const minQualitySelect = document.getElementById('data-min-quality');

        if (experimentSelect?.value && experimentSelect.value.trim() !== '') {
            activeFilters++;
            filterDescriptions.push(experimentSelect.options[experimentSelect.selectedIndex].text);
        }
        if (sensorTypeSelect?.value && sensorTypeSelect.value.trim() !== '') {
            activeFilters++;
            filterDescriptions.push(sensorTypeSelect.options[sensorTypeSelect.selectedIndex].text);
        }
        if (periodSelect?.value && periodSelect.value !== 'all') {
            activeFilters++;
            filterDescriptions.push(periodSelect.options[periodSelect.selectedIndex].text);
        }
        if (startDateInput?.value) {
            activeFilters++;
            filterDescriptions.push(`Depuis ${startDateInput.value}`);
        }
        if (endDateInput?.value) {
            activeFilters++;
            filterDescriptions.push(`Jusqu'à ${endDateInput.value}`);
        }
        if (minQualitySelect?.value && minQualitySelect.value.trim() !== '') {
            activeFilters++;
            filterDescriptions.push(minQualitySelect.options[minQualitySelect.selectedIndex].text);
        }

        // Update filter count and input placeholder
        if (activeFilters > 0) {
            filterCount.style.display = 'block';
            filterCount.textContent = `${activeFilters} filtre${activeFilters > 1 ? 's' : ''} actif${activeFilters > 1 ? 's' : ''}`;
            filterInput.placeholder = filterDescriptions.slice(0, 2).join(', ') + (filterDescriptions.length > 2 ? '...' : '');
        } else {
            filterCount.style.display = 'none';
            filterInput.placeholder = 'Rechercher ou filtrer les données...';
        }
    }

    async loadFilteredChartData(experimentId, sensorTypeId, period, startDate, endDate, minQuality, limit) {
        const chartContainer = document.getElementById('chart-container');

        try {
            // Build API URL with filters
            let apiUrl = `/api/sensors/measurements?`;
            const params = new URLSearchParams();

            if (experimentId) params.append('experimentId', experimentId);
            if (period && period !== 'all') params.append('period', period);
            if (startDate) params.append('from', startDate);
            if (endDate) params.append('to', endDate);
            if (limit && limit.trim() !== '') params.append('limit', limit);

            apiUrl += params.toString();
            console.log('Loading filtered data from:', apiUrl);

            const measurementsResponse = await fetch(apiUrl);
            const measurementsData = await measurementsResponse.json();

            if (!measurementsData.success || !measurementsData.data || measurementsData.data.length === 0) {
                const canvas = document.getElementById('dataChart');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    chartContainer.innerHTML = '<div id="chart-container"><canvas id="dataChart"></canvas></div><p style="text-align: center; margin-top: 2rem;">Aucune donnée trouvée avec les filtres appliqués</p>';
                }
                return;
            }

            // Get sensor types
            const typesResponse = await fetch('/api/sensors/types');
            const typesData = await typesResponse.json();
            const sensorTypes = {};
            typesData.data.forEach(type => {
                sensorTypes[type.id] = type;
            });

            // Apply additional filters
            let filteredMeasurements = measurementsData.data;

            // Filter by sensor type
            if (sensorTypeId) {
                filteredMeasurements = filteredMeasurements.filter(m => m.sensor_type_id === sensorTypeId);
            }

            // Filter by quality
            if (minQuality) {
                const qualityThreshold = parseFloat(minQuality);
                filteredMeasurements = filteredMeasurements.filter(m => {
                    const quality = m.quality?.score || m.quality || 1;
                    return quality >= qualityThreshold;
                });
            }

            console.log(`Filtered to ${filteredMeasurements.length} measurements`);

            // Recreate chart container to ensure clean canvas
            chartContainer.innerHTML = '<canvas id="dataChart"></canvas>';

            // Create filtered chart
            this.createMainChart(filteredMeasurements, sensorTypes);

            // Calculate and display statistics
            this.calculateAndDisplayStats(filteredMeasurements);

        } catch (error) {
            console.error('Error loading filtered chart data:', error);
            chartContainer.innerHTML = '<p style="text-align: center; margin-top: 2rem;">Erreur lors du chargement des données filtrées</p>';
        }
    }

    calculateAndDisplayStats(measurements) {
        const statsPanel = document.getElementById('data-stats-panel');
        const statsBySensorContainer = document.getElementById('stats-by-sensor');

        if (!statsPanel || !statsBySensorContainer) {
            console.error('Required DOM elements not found:', { statsPanel, statsBySensorContainer });
            return;
        }

        if (!measurements || measurements.length === 0) {
            statsPanel.style.display = 'none';
            return;
        }

        // Show stats panel
        statsPanel.style.display = 'block';

        // Group measurements by sensor type
        const measurementsBySensor = {};
        measurements.forEach(measurement => {
            const sensorTypeId = measurement.sensor_type_id;
            if (!measurementsBySensor[sensorTypeId]) {
                measurementsBySensor[sensorTypeId] = [];
            }
            measurementsBySensor[sensorTypeId].push(measurement);
        });

        // Clear existing sensor stats
        statsBySensorContainer.innerHTML = '';

        // Create stats for each sensor type
        const sensorColors = this.getSensorColors();
        let sensorIndex = 0;

        for (const [sensorTypeId, sensorMeasurements] of Object.entries(measurementsBySensor)) {
            const sensorType = this.getSensorTypeInfo(sensorTypeId);
            const color = sensorColors[sensorIndex % sensorColors.length];

            this.createSensorStatsSection(
                statsBySensorContainer,
                sensorType,
                sensorMeasurements,
                color
            );
            sensorIndex++;
        }

        // Calculate global statistics
        this.calculateGlobalStats(measurements, Object.keys(measurementsBySensor).length);
    }

    getSensorColors() {
        // Return the same colors used in charts
        return [
            '#4a90e2', '#e74c3c', '#f39c12', '#27ae60', '#9b59b6',
            '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#16a085'
        ];
    }

    getSensorTypeInfo(sensorTypeId) {
        // This should match the sensor type data - for now using a simple mapping
        const sensorTypeMap = {
            'temperature': {
                name: 'Température',
                unit: '°C',
                icon: '🌡️',
                description: 'Mesure de la température ambiante'
            },
            'temp': {
                name: 'Température',
                unit: '°C',
                icon: '🌡️',
                description: 'Mesure de la température ambiante'
            },
            'co2': {
                name: 'CO2',
                unit: 'ppm',
                icon: '💨',
                description: 'Concentration en dioxyde de carbone'
            },
            'humidity': {
                name: 'Humidité',
                unit: '%',
                icon: '💧',
                description: 'Taux d\'humidité relative de l\'air'
            },
            'pressure': {
                name: 'Pression atmosphérique',
                unit: 'hPa',
                icon: '🔘',
                description: 'Pression barométrique'
            },
            'noise': {
                name: 'Niveau sonore',
                unit: 'dB',
                icon: '🔊',
                description: 'Intensité du bruit ambiant'
            },
            'pm25': {
                name: 'Particules fines PM2.5',
                unit: 'µg/m³',
                icon: '🌫️',
                description: 'Particules de diamètre ≤ 2.5 µm'
            },
            'pm10': {
                name: 'Particules PM10',
                unit: 'µg/m³',
                icon: '🌪️',
                description: 'Particules de diamètre ≤ 10 µm'
            }
        };

        return sensorTypeMap[sensorTypeId] || {
            name: sensorTypeId.toUpperCase(),
            unit: '',
            icon: '📊',
            description: 'Capteur de données'
        };
    }

    createSensorStatsSection(container, sensorType, measurements, color) {
        const values = measurements.map(m => parseFloat(m.value)).filter(v => !isNaN(v));

        if (values.length === 0) return;

        const sortedValues = [...values].sort((a, b) => a - b);

        const stats = {
            dataPoints: values.length,
            average: values.reduce((sum, v) => sum + v, 0) / values.length,
            minimum: Math.min(...values),
            maximum: Math.max(...values),
            median: this.calculateMedian(sortedValues),
            stdDev: this.calculateStandardDeviation(values)
        };

        const sectionHtml = `
            <div class="sensor-stats-section">
                <div class="sensor-stats-header">
                    <div class="sensor-color-indicator" style="background-color: ${color}"></div>
                    <div class="sensor-header-content">
                        <h4 class="sensor-stats-title">${sensorType.icon} ${sensorType.name}</h4>
                        <p class="sensor-description">${sensorType.description}</p>
                    </div>
                    <span class="sensor-unit">${sensorType.unit}</span>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <div class="stat-label">Points</div>
                            <div class="stat-value">${stats.dataPoints.toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-label">Moyenne</div>
                            <div class="stat-value">${this.formatValue(stats.average)} ${sensorType.unit}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📉</div>
                        <div class="stat-content">
                            <div class="stat-label">Minimum</div>
                            <div class="stat-value">${this.formatValue(stats.minimum)} ${sensorType.unit}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <div class="stat-label">Maximum</div>
                            <div class="stat-value">${this.formatValue(stats.maximum)} ${sensorType.unit}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-content">
                            <div class="stat-label">Médiane</div>
                            <div class="stat-value">${this.formatValue(stats.median)} ${sensorType.unit}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-content">
                            <div class="stat-label">Écart-type</div>
                            <div class="stat-value">${this.formatValue(stats.stdDev)} ${sensorType.unit}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', sectionHtml);
    }

    calculateGlobalStats(measurements, sensorTypeCount) {
        const qualities = measurements
            .map(m => m.quality?.score || m.quality || 1)
            .filter(q => !isNaN(q));

        const totalPoints = measurements.length;
        const avgQuality = qualities.length > 0 ? qualities.reduce((sum, q) => sum + q, 0) / qualities.length : null;
        const timeRange = this.calculateTimeRange(measurements);

        // Update global stats
        this.updateStatElement('stat-total-points', totalPoints.toLocaleString());
        this.updateStatElement('stat-time-range', timeRange);
        this.updateStatElement('stat-avg-quality', avgQuality ? `${(avgQuality * 100).toFixed(1)}%` : 'N/A');
        this.updateStatElement('stat-sensor-types', sensorTypeCount.toString());
    }

    calculateMedian(sortedValues) {
        const mid = Math.floor(sortedValues.length / 2);
        return sortedValues.length % 2 === 0
            ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
            : sortedValues[mid];
    }

    calculateStandardDeviation(values) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }

    calculateTimeRange(measurements) {
        if (measurements.length === 0) return 'N/A';

        const timestamps = measurements.map(m => new Date(m.timestamp)).sort((a, b) => a - b);
        const oldest = timestamps[0];
        const newest = timestamps[timestamps.length - 1];

        const diffMs = newest - oldest;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (diffDays > 0) {
            return `${diffDays}j ${diffHours}h`;
        } else if (diffHours > 0) {
            return `${diffHours}h`;
        } else {
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return `${diffMinutes}min`;
        }
    }

    formatValue(value) {
        if (value === null || value === undefined || isNaN(value)) return 'N/A';
        return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    // URL Routing Methods
    initializeRouting() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            this.handleRoute(false);
        });

        // Handle initial route on page load
        this.handleRoute(false);

        // Hide loading screen after routing is complete
        this.hideLoadingScreen();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }

    updateUrl(view, experimentId = null, queryParams = null) {
        let url = '#/' + view;
        if (experimentId) {
            url += '/' + experimentId;
        }
        if (queryParams && Object.keys(queryParams).length > 0) {
            const params = new URLSearchParams();
            Object.entries(queryParams).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.set(key, value);
                }
            });
            if (params.toString()) {
                url += '?' + params.toString();
            }
        }
        history.pushState({ view, experimentId, queryParams }, '', url);
    }

    parseUrlParams(hash) {
        const [path, queryString] = hash.split('?');
        const parts = path.split('/').filter(p => p);
        const params = {};

        if (queryString) {
            const urlParams = new URLSearchParams(queryString);
            for (const [key, value] of urlParams) {
                params[key] = value;
            }
        }

        return { parts, params };
    }

    handleRoute(updateUrl = true) {
        const hash = window.location.hash.slice(1); // Remove #
        const { parts, params } = this.parseUrlParams(hash);

        if (parts.length === 0) {
            // Default route
            this.showView('map', updateUrl);
        } else if (parts[0] === 'map') {
            this.showView('map', updateUrl);
        } else if (parts[0] === 'experiments') {
            if (parts.length > 1) {
                // Experiment detail route: #/experiments/experiment-id
                const experimentId = parts[1];
                this.urlParams = params; // Store URL params for later use
                this.showExperimentDetail(experimentId, updateUrl);
            } else {
                // Experiments list route: #/experiments
                this.urlParams = params; // Store URL params for later use
                this.showView('experiments', updateUrl);
            }
        } else if (parts[0] === 'sensors') {
            if (parts.length > 1) {
                // Sensor detail route: #/sensors/sensor-id
                const sensorId = parts[1];
                this.urlParams = params; // Store URL params for later use
                this.showSensorDetails(sensorId, updateUrl);
            } else {
                // Sensors view route: #/sensors
                this.urlParams = params; // Store URL params for later use
                this.showView('sensors', updateUrl);
            }
        } else if (parts[0] === 'data') {
            if (parts.length > 1) {
                // Data view with experiment route: #/data/experiment-id
                const experimentId = parts[1];
                this.selectedExperimentForData = experimentId;
                this.urlParams = params; // Store URL params for later use
                this.showView('data', updateUrl);
            } else {
                // Data view route: #/data
                this.selectedExperimentForData = null;
                this.urlParams = params; // Store URL params for later use
                this.showView('data', updateUrl);
            }
        } else {
            // Invalid route, redirect to map
            this.showView('map', updateUrl);
        }
    }

    // Sensors View Methods
    async loadSensorsView() {
        await this.populateSensorsFilters();
        this.bindSensorsFilterEvents();
        this.applySensorsUrlParams(); // Apply URL parameters if any
        await this.applySensorsFilters(); // Load sensors with applied filters
    }

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
                    const uniqueTypes = [...new Set(data.data.map(sensor => sensor.type))];

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

    openDataView(experimentId) {
        if (experimentId) {
            this.selectedExperimentForData = experimentId;
            this.showView('data');
        }
    }

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

    async viewSensorData(sensorId) {
        // Navigate to data view with this sensor's experiment
        const sensor = await this.getSensorById(sensorId);
        if (sensor && sensor.experiment_id) {
            this.selectedExperimentForData = sensor.experiment_id;
            this.showView('data');
        }
    }

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
        `;
    }

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

// Initialize the platform
const platform = new SteamCityPlatform();

// Make it globally available for inline event handlers
window.platform = platform;
window.steamcity = platform;