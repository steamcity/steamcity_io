class SteamCityAPI {
    constructor() {
        this.baseURL = '';
        this.map = null;
        this.sensorMarkers = [];
        this.chart = null;
        this.hasUserInteracted = false;
        this.currentRoute = null;
        this.chartUpdateInProgress = false;
        this.chartUpdateTimeouts = [];
        this.mapClusterFilter = null; // Filtre actuel sur la carte par cluster
        // Couleurs pour différentes catégories de protocoles (clusters SteamCity)
        this.protocolColors = {
            governance: '#e74c3c',      // Rouge - Cluster 1: Governance and citizenship
            environmental: '#27ae60',   // Vert - Cluster 2: Environmental quality, climate and well-being
            mobility: '#3498db',        // Bleu - Cluster 3: Mobility
            energy: '#f39c12',          // Orange - Cluster 4: Energy savings
            technology: '#9b59b6',      // Violet - Cluster 5: AI and technologies
            other: '#95a5a6'            // Gris - Autre
        };

        // Couleurs pour différents types de capteurs (pour les graphiques)
        this.sensorColors = {
            temperature: '#e74c3c',     // Rouge
            humidity: '#3498db',        // Bleu
            pressure: '#9b59b6',        // Violet
            noise: '#f39c12',           // Orange
            air_quality: '#27ae60',     // Vert
            light: '#f1c40f',          // Jaune
            co2: '#e67e22',            // Orange foncé
            pm25: '#8e44ad',           // Violet foncé
            pm10: '#2c3e50',           // Bleu foncé
            other: '#95a5a6'           // Gris
        };

        // Cache des protocoles pour éviter les appels répétés
        this.protocolsCache = new Map();

        // État d'authentification
        this.isAuthenticated = false;

        this.init();
    }

    async init() {
        this.checkAuthenticationState();
        this.setupEventListeners();

        if (this.isAuthenticated) {
            await this.checkAPIStatus();
            this.loadSensors();
            this.loadExperiments();
            this.loadProtocols();

            // Charger les données pour les filtres
            this.loadExperimentsFilterOptions();
            this.loadExperimentFilterOptions();

            // Initialiser le routage
            this.initializeRouting();

            // Charger la route actuelle ou initialiser la carte par défaut
            this.handleRoute();
        }
    }

    checkAuthenticationState() {
        // Vérifier si l'utilisateur est déjà connecté
        const isLoggedIn = localStorage.getItem('steamcity_authenticated') === 'true';
        this.isAuthenticated = isLoggedIn;

        // Afficher la bonne page selon l'état d'authentification
        if (this.isAuthenticated) {
            this.showMainPlatform();
        } else {
            this.showLoginPage();
        }
    }

    showLoginPage() {
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('main-platform').style.display = 'none';
    }

    showMainPlatform() {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('main-platform').style.display = 'block';
    }

    handleLogin(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');

        // Authentification simple avec login/password fixe
        if (username === 'iot' && password === 'steamcity') {
            // Connexion réussie
            localStorage.setItem('steamcity_authenticated', 'true');
            this.isAuthenticated = true;
            errorElement.style.display = 'none';

            this.showMainPlatform();

            // Initialiser la plateforme après connexion
            this.checkAPIStatus();
            this.loadSensors();
            this.loadExperiments();
            this.loadProtocols();
            this.loadExperimentsFilterOptions();
            this.loadExperimentFilterOptions();
            this.initializeRouting();
            this.handleRoute();
        } else {
            // Afficher l'erreur
            errorElement.style.display = 'block';
        }
    }

    handleLogout() {
        // Supprimer l'état d'authentification
        localStorage.removeItem('steamcity_authenticated');
        this.isAuthenticated = false;

        // Réinitialiser les champs du formulaire
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';

        // Afficher la page de connexion
        this.showLoginPage();
    }

    setupEventListeners() {
        // Gestionnaires d'authentification
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Gestion des onglets avec routage
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.navigateTo(`/${tab}`);
            });
        });

        // Boutons d'actualisation
        document.getElementById('refresh-sensors').addEventListener('click', () => this.loadSensors());
        document.getElementById('refresh-experiments').addEventListener('click', () => this.loadExperiments());

        // Boutons d'ajout
        document.getElementById('add-sensor').addEventListener('click', () => this.showSensorForm());
        document.getElementById('add-experiment').addEventListener('click', () => this.showExperimentForm());

        // Boutons d'annulation
        document.getElementById('cancel-sensor').addEventListener('click', () => this.hideSensorForm());
        document.getElementById('cancel-experiment').addEventListener('click', () => this.hideExperimentForm());

        // Formulaires
        document.getElementById('add-sensor-form').addEventListener('submit', (e) => this.handleSensorSubmit(e));
        document.getElementById('add-experiment-form').addEventListener('submit', (e) => this.handleExperimentSubmit(e));
        document.getElementById('upload-form').addEventListener('submit', (e) => this.handleUploadSubmit(e));

        // Contrôles de la carte
        document.getElementById('refresh-map').addEventListener('click', () => this.refreshMap());
        document.getElementById('center-map').addEventListener('click', () => this.centerMap());
        document.getElementById('map-filter').addEventListener('change', (e) => this.filterMapByCluster(e.target.value));

        // Contrôles des graphiques
        document.getElementById('update-chart').addEventListener('click', () => this.updateChart());

        // Mettre à jour les types de capteurs quand l'expérience change
        document.getElementById('chart-experiment').addEventListener('change', (e) => {
            this.updateAvailableSensorTypes(e.target.value);
        });

        // Contrôles des filtres de recherche
        document.getElementById('toggle-filters').addEventListener('click', () => this.toggleFilters());
        document.getElementById('apply-filters').addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());

        // Contrôles des filtres d'expériences
        const toggleExperimentFiltersBtn = document.getElementById('toggle-experiments-filters');
        const applyExperimentFiltersBtn = document.getElementById('apply-experiments-filters');
        const clearExperimentFiltersBtn = document.getElementById('clear-experiments-filters');

        if (toggleExperimentFiltersBtn) {
            toggleExperimentFiltersBtn.addEventListener('click', () => this.toggleExperimentFilters());
        }
        if (applyExperimentFiltersBtn) {
            console.log('✅ Attaching event listener to apply experiment filters button');
            applyExperimentFiltersBtn.addEventListener('click', () => this.applyExperimentFilters());
        } else {
            console.log('❌ Apply experiment filters button not found');
        }
        if (clearExperimentFiltersBtn) {
            clearExperimentFiltersBtn.addEventListener('click', () => this.clearExperimentFilters());
        }

        // Gestionnaires pour les boutons de graphiques avec délégation d'événements
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('chart-btn')) {
                const experimentId = e.target.dataset.experiment || '';
                const sensorType = e.target.dataset.sensorType || '';
                if (experimentId && sensorType) {
                    this.navigateTo(`/charts/experiment/${experimentId}/sensor/${sensorType}`);
                } else if (experimentId) {
                    this.navigateTo(`/charts/experiment/${experimentId}`);
                } else {
                    this.navigateTo('/charts');
                }
            }

            // Gestionnaire pour les liens d'expérience
            if (e.target.classList.contains('experiment-link')) {
                e.preventDefault();
                const experimentId = e.target.dataset.experimentId;
                this.navigateTo(`/experiments/${experimentId}`);
            }

            // Gestionnaire pour les boutons "Voir Capteurs"
            if (e.target.classList.contains('sensors-btn')) {
                const experimentId = e.target.dataset.experimentId;
                this.navigateTo(`/sensors/experiment/${experimentId}`);
            }

            // Gestionnaire pour les boutons "Voir Expérience" dans les popups de carte
            if (e.target.classList.contains('experiment-btn')) {
                const experimentId = e.target.dataset.experimentId;
                this.navigateTo(`/experiments/${experimentId}`);
            }

            // Les clics sur la légende sont maintenant gérés directement dans createMapLegend()
        });
    }

    switchTab(tabName) {
        // Désactiver tous les onglets
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Activer l'onglet sélectionné
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        // Initialiser la carte si on sélectionne l'onglet carte
        if (tabName === 'map') {
            setTimeout(() => this.initializeMap(), 100);
        }

        // Initialiser les graphiques si on sélectionne l'onglet graphiques
        if (tabName === 'charts') {
            setTimeout(() => this.initializeCharts(), 100);
        }
    }

    initializeRouting() {
        // Écouter les changements d'URL
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('popstate', () => this.handleRoute());
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || '/'; // Supprimer le #
        const [path, ...params] = hash.split('/').filter(Boolean);

        console.log('🔄 Route:', hash, 'Path:', path, 'Params:', params);

        switch (path) {
            case '':
            case 'map':
                // Gérer les paramètres de filtre pour la carte : #/map/cluster/technology
                const mapFilter = params[0] === 'cluster' && params[1] ? params[1] : '';
                this.navigateToMap(mapFilter);
                break;
            case 'experiments':
                if (params[0]) {
                    this.navigateToExperiment(params[0]);
                } else {
                    this.navigateToExperiments();
                }
                break;
            case 'sensors':
                if (params[0] === 'experiment' && params[1]) {
                    this.navigateToSensorsForExperiment(params[1]);
                } else {
                    this.navigateToSensors();
                }
                break;
            case 'charts':
                if (params[0] === 'experiment' && params[1]) {
                    const sensorType = params[3] === 'sensor' && params[4] ? params[4] : '';
                    this.navigateToChartsForExperiment(params[1], sensorType);
                } else {
                    this.navigateToCharts();
                }
                break;
            default:
                // Route inconnue, rediriger vers la carte
                this.navigateTo('/map');
        }
    }

    navigateTo(route) {
        if (window.location.hash !== `#${route}`) {
            window.location.hash = route;
        } else {
            this.handleRoute(); // Forcer le traitement si on est déjà sur la route
        }
    }

    navigateToMap(clusterFilter = '') {
        this.switchTab('map');
        setTimeout(() => {
            this.initializeMap();
            // Appliquer le filtre après que la carte soit initialisée
            if (clusterFilter) {
                console.log('🔍 Application du filtre depuis l\'URL:', clusterFilter);
                setTimeout(() => this.filterMapByCluster(clusterFilter), 500);
            }
        }, 100);
    }

    navigateToExperiments() {
        this.switchTab('experiments');
        this.loadExperiments();
    }

    navigateToExperiment(experimentId) {
        this.switchTab('experiments');
        this.showExperimentDetails(experimentId);
    }

    navigateToSensors() {
        this.switchTab('sensors');
        this.loadSensors();
    }

    navigateToSensorsForExperiment(experimentId) {
        this.switchTab('sensors');
        this.loadSensors({ experimentId: experimentId });
    }

    navigateToCharts() {
        this.switchTab('charts');
    }

    navigateToChartsForExperiment(experimentId, sensorType = '') {
        this.switchTab('charts');
        this.openChartsWithFilter(experimentId, sensorType);
    }

    async checkAPIStatus() {
        const statusElement = document.getElementById('api-status');
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                statusElement.textContent = 'API ✅';
                statusElement.className = 'status-badge online';
            } else {
                throw new Error('API non accessible');
            }
        } catch (error) {
            statusElement.textContent = 'API ❌';
            statusElement.className = 'status-badge offline';
        }
    }

    async loadSensors(filters = {}) {
        const container = document.getElementById('sensors-list');
        container.innerHTML = '<div class="loading">Chargement des données...</div>';

        try {
            // Construire l'URL avec les filtres
            const params = new URLSearchParams({
                limit: '50',
                page: '1'
            });

            // Ajouter les filtres à l'URL
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value.toString().trim() !== '') {
                    // Mapper les clés du frontend vers les paramètres API
                    const apiKey = this.mapFilterToApiParam(key);
                    params.append(apiKey, value);
                }
            });

            const response = await fetch(`/api/sensors/unique?${params.toString()}`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                // Les données sont déjà des capteurs uniques depuis l'API
                const uniqueSensors = data.data;
                const groupedSensors = this.groupSensorsByExperiment(uniqueSensors);
                const groupedHtml = await this.renderGroupedSensors(groupedSensors);

                const uniqueCount = uniqueSensors.length;
                const paginationInfo = `
                    <div class="pagination-info">
                        <p>Affichage de ${uniqueCount} capteur${uniqueCount > 1 ? 's' : ''} unique${uniqueCount > 1 ? 's' : ''} (${data.totalMeasurements} mesures analysées)</p>
                        ${data.totalCount > data.count ? '<button id="load-more-sensors" class="btn btn-primary">Charger plus de capteurs</button>' : ''}
                    </div>
                `;
                container.innerHTML = groupedHtml + paginationInfo;

                // Ajouter gestionnaire pour "Charger plus"
                if (data.totalCount > data.count) {
                    const loadMoreBtn = document.getElementById('load-more-sensors');
                    if (loadMoreBtn) {
                        let currentPage = 1;
                        loadMoreBtn.addEventListener('click', async () => {
                            currentPage++;
                            await this.loadMoreSensorsData(currentPage, filters);
                        });
                    }
                }
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>Aucune donnée de capteur</h3>
                        <p>Commencez par ajouter des données de capteur ou téléverser un fichier CSV</p>
                    </div>
                `;
            }
        } catch (error) {
            container.innerHTML = `
                <div class="result-message error">
                    Erreur lors du chargement des capteurs: ${error.message}
                </div>
            `;
        }
    }

    async loadMoreSensors(page) {
        try {
            const response = await fetch(`/api/sensors?limit=50&page=${page}`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                const container = document.getElementById('sensors-list');
                const paginationDiv = container.querySelector('.pagination-info');
                const sensorsHtml = data.data.map(sensor => this.renderSensor(sensor)).join('');

                // Insérer les nouveaux capteurs avant l'info de pagination
                paginationDiv.insertAdjacentHTML('beforebegin', sensorsHtml);

                // Mettre à jour l'info de pagination
                const currentTotal = container.querySelectorAll('.data-item').length;
                const infoText = paginationDiv.querySelector('p');
                infoText.textContent = `Affichage de ${currentTotal} capteurs sur ${data.totalCount} total`;

                // Masquer le bouton si toutes les données sont chargées
                if (!data.hasNext) {
                    const loadMoreBtn = document.getElementById('load-more-sensors');
                    if (loadMoreBtn) {
                        loadMoreBtn.remove();
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement de plus de capteurs:', error);
        }
    }

    async loadMoreSensorsData(page, filters = {}) {
        try {
            const container = document.getElementById('sensors-list');
            const paginationDiv = container.querySelector('.pagination-info');
            const loadMoreBtn = document.getElementById('load-more-sensors');

            // Désactiver le bouton pendant le chargement
            if (loadMoreBtn) {
                loadMoreBtn.disabled = true;
                loadMoreBtn.textContent = 'Chargement...';
            }

            // Utiliser la vraie pagination
            const params = new URLSearchParams({
                limit: '50',
                page: page.toString()
            });

            // Ajouter les filtres à l'URL
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value.toString().trim() !== '') {
                    const apiKey = this.mapFilterToApiParam(key);
                    params.append(apiKey, value);
                }
            });

            const response = await fetch(`/api/sensors/unique?${params.toString()}`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                // Les données sont déjà des capteurs uniques depuis l'API
                const uniqueSensors = data.data;
                const groupedSensors = this.groupSensorsByExperiment(uniqueSensors);
                const groupedHtml = await this.renderGroupedSensors(groupedSensors);

                const uniqueCount = uniqueSensors.length;
                const paginationInfo = `
                    <div class="pagination-info">
                        <p>Affichage de ${uniqueCount} capteur${uniqueCount > 1 ? 's' : ''} unique${uniqueCount > 1 ? 's' : ''} (${data.totalMeasurements} mesures analysées)</p>
                        ${data.totalCount > data.count ? '<button id="load-more-sensors" class="btn btn-primary">Charger plus de capteurs</button>' : ''}
                    </div>
                `;

                // Insérer les nouveaux capteurs avant la pagination
                const existingPagination = container.querySelector('.pagination-info');
                existingPagination.insertAdjacentHTML('beforebegin', groupedHtml);

                // Mettre à jour le compteur de capteurs
                const totalDisplayed = container.querySelectorAll('.data-item').length;
                existingPagination.querySelector('p').textContent =
                    `Affichage de ${totalDisplayed} capteurs uniques (${data.totalMeasurements} mesures analysées)`;

                // Réattacher l'event listener si nécessaire
                if (data.totalCount > data.count) {
                    const newLoadMoreBtn = document.getElementById('load-more-sensors');
                    if (newLoadMoreBtn) {
                        newLoadMoreBtn.disabled = false;
                        newLoadMoreBtn.textContent = 'Charger plus de capteurs';
                        newLoadMoreBtn.addEventListener('click', async () => {
                            await this.loadMoreSensorsData(page + 1, filters);
                        });
                    }
                } else {
                    // Plus rien à charger
                    const loadMoreBtn = document.getElementById('load-more-sensors');
                    if (loadMoreBtn) {
                        loadMoreBtn.remove();
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement de plus de capteurs:', error);
            this.showMessage('Erreur lors du chargement des données supplémentaires', 'error');
        }
    }

    async loadExperiments(filters = {}) {
        const container = document.getElementById('experiments-list');
        container.innerHTML = '<div class="loading">Chargement des expériences...</div>';

        try {
            // Construire l'URL avec les filtres
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const url = `/api/experiments${params.toString() ? '?' + params.toString() : ''}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                container.innerHTML = data.data.map(exp => this.renderExperiment(exp)).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>Aucune expérience</h3>
                        <p>Créez votre première expérience pour organiser vos données</p>
                    </div>
                `;
            }
        } catch (error) {
            container.innerHTML = `
                <div class="result-message error">
                    Erreur lors du chargement des expériences: ${error.message}
                </div>
            `;
        }
    }

    async loadProtocols() {
        try {
            const response = await fetch('/api/protocols');
            const data = await response.json();

            if (data.success) {
                const select = document.getElementById('exp-protocol');
                select.innerHTML = '<option value="">Sélectionner un protocole...</option>';

                const filterSelect = document.getElementById('exp-filter-protocol');
                filterSelect.innerHTML = '<option value="">Tous les protocoles</option>';

                data.data.forEach(protocol => {
                    const option = document.createElement('option');
                    option.value = protocol.id;
                    option.textContent = protocol.name;
                    select.appendChild(option);

                    const filterOption = document.createElement('option');
                    filterOption.value = protocol.id;
                    filterOption.textContent = protocol.name;
                    filterSelect.appendChild(filterOption);
                });
            }
        } catch (error) {
            console.error('Erreur lors du chargement des protocoles:', error);
        }
    }

    renderSensor(sensor) {
        const firstDate = new Date(sensor.firstMeasurement).toLocaleString('fr-FR');
        const lastDate = new Date(sensor.lastMeasurement).toLocaleString('fr-FR');
        const period = this.calculatePeriod(sensor.firstMeasurement, sensor.lastMeasurement);

        return `
            <div class="data-item">
                <h4>📊 Capteur ${sensor.sensorType}</h4>
                <div class="meta">
                    <span><strong>Type:</strong> ${sensor.sensorType}</span>
                    <span><strong>Unité:</strong> ${sensor.unit}</span>
                    <span><strong>Mesures:</strong> ${sensor.measurementCount}</span>
                    <span><strong>Période:</strong> ${period}</span>
                    <span><strong>Dernière valeur:</strong> ${sensor.lastValue} ${sensor.unit}</span>
                    <span><strong>Min/Max:</strong> ${sensor.minValue} - ${sensor.maxValue} ${sensor.unit}</span>
                    <span><strong>Moyenne:</strong> ${sensor.avgValue} ${sensor.unit}</span>
                    <span><strong>Première mesure:</strong> ${firstDate}</span>
                    <span><strong>Dernière mesure:</strong> ${lastDate}</span>
                    ${sensor.deviceIds.length > 0 ? `<span><strong>Devices:</strong> ${sensor.deviceIds.join(', ')}</span>` : ''}
                    <span><strong>Expérience:</strong> <a href="#" class="experiment-link" data-experiment-id="${sensor.experimentId}">${sensor.experimentId}</a></span>
                </div>
                <div class="data-actions">
                    <button class="btn btn-sm btn-primary chart-btn" data-experiment="${sensor.experimentId}" data-sensor-type="${sensor.sensorType}">📈 Voir ${sensor.measurementCount} mesures</button>
                </div>
            </div>
        `;
    }

    calculatePeriod(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffMs = endDate - startDate;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `${diffHours} heure${diffHours > 1 ? 's' : ''}`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
        } else {
            return 'moins d\'1 minute';
        }
    }

    aggregateSensorData(measurements) {
        const sensorMap = {};

        // Grouper les mesures par capteur unique (experimentId + sensorType)
        measurements.forEach(measurement => {
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
                    measurements: [],
                    firstMeasurement: measurement.timestamp,
                    lastMeasurement: measurement.timestamp,
                    minValue: measurement.value,
                    maxValue: measurement.value,
                    avgValue: measurement.value,
                    deviceIds: new Set([measurement.metadata?.deviceId].filter(Boolean))
                };
            }

            const sensor = sensorMap[key];
            sensor.measurements.push(measurement);

            // Mettre à jour les statistiques
            if (new Date(measurement.timestamp) < new Date(sensor.firstMeasurement)) {
                sensor.firstMeasurement = measurement.timestamp;
            }
            if (new Date(measurement.timestamp) > new Date(sensor.lastMeasurement)) {
                sensor.lastMeasurement = measurement.timestamp;
                sensor.lastValue = measurement.value; // Dernière valeur mesurée
            }

            sensor.minValue = Math.min(sensor.minValue, measurement.value);
            sensor.maxValue = Math.max(sensor.maxValue, measurement.value);

            // Recalculer la moyenne
            const sum = sensor.measurements.reduce((acc, m) => acc + m.value, 0);
            sensor.avgValue = Math.round((sum / sensor.measurements.length) * 100) / 100;

            // Ajouter l'ID du device
            if (measurement.metadata?.deviceId) {
                sensor.deviceIds.add(measurement.metadata.deviceId);
            }
        });

        // Convertir en array et nettoyer
        return Object.values(sensorMap).map(sensor => ({
            ...sensor,
            deviceIds: Array.from(sensor.deviceIds),
            measurementCount: sensor.measurements.length
        }));
    }

    groupSensorsByExperiment(sensors) {
        const grouped = {};
        sensors.forEach(sensor => {
            const expId = sensor.experimentId;
            if (!grouped[expId]) {
                grouped[expId] = [];
            }
            grouped[expId].push(sensor);
        });
        return grouped;
    }

    async renderGroupedSensors(groupedSensors) {
        let html = '';

        // Récupérer les informations des expériences pour les en-têtes
        const experimentIds = Object.keys(groupedSensors);
        const experimentsData = {};

        // Charger les informations d'expériences en parallèle
        const experimentPromises = experimentIds.map(async (expId) => {
            try {
                const response = await fetch(`/api/experiments?experimentId=${expId}`);
                const result = await response.json();
                if (result.success && result.data.length > 0) {
                    experimentsData[expId] = result.data[0];
                }
            } catch (error) {
                console.warn(`Erreur lors du chargement de l'expérience ${expId}:`, error);
            }
        });

        await Promise.all(experimentPromises);

        // Générer le HTML groupé
        Object.entries(groupedSensors).forEach(([experimentId, sensors]) => {
            const experiment = experimentsData[experimentId];
            const sensorCount = sensors.length;

            // En-tête de groupe d'expérience
            html += `
                <div class="experiment-group" style="border: 1px solid #e1e8ed; border-radius: 8px; margin-bottom: 20px; background-color: #f8f9fa;">
                    <div class="experiment-header" style="background-color: #3498db; color: white; padding: 15px; border-radius: 8px 8px 0 0; margin-bottom: 0;">
                        <h3 style="margin: 0; display: flex; align-items: center; justify-content: space-between;">
                            <span>🔬 ${experiment ? experiment.title : `Expérience ${experimentId}`}</span>
                            <span style="font-size: 0.8em; background-color: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px;">
                                ${sensorCount} capteur${sensorCount > 1 ? 's' : ''}
                            </span>
                        </h3>
                        ${experiment ? `
                            <div style="font-size: 0.9em; margin-top: 8px; opacity: 0.9;">
                                <span><strong>Étudiant:</strong> ${experiment.studentName}</span>
                                ${experiment.school ? ` • <strong>École:</strong> ${experiment.school}` : ''}
                                ${experiment.protocol ? ` • <strong>Protocole:</strong> ${experiment.protocol}` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="experiment-sensors" style="padding: 15px;">
            `;

            // Capteurs de cette expérience
            sensors.forEach(sensor => {
                html += this.renderSensor(sensor);
            });

            html += `
                    </div>
                </div>
            `;
        });

        return html;
    }

    renderExperiment(experiment) {
        const date = new Date(experiment.createdAt).toLocaleString('fr-FR');
        return `
            <div class="data-item">
                <h4>🔬 ${experiment.title}</h4>
                <p>${experiment.description}</p>
                <div class="meta">
                    <span><strong>ID:</strong> ${experiment.id}</span>
                    <span><strong>Étudiant:</strong> ${experiment.studentName}</span>
                    ${experiment.studentGroup ? `<span><strong>Groupe:</strong> ${experiment.studentGroup}</span>` : ''}
                    ${experiment.school ? `<span><strong>École:</strong> ${experiment.school}</span>` : ''}
                    ${experiment.protocol ? `<span><strong>Protocole:</strong> ${experiment.protocol}</span>` : ''}
                    <span><strong>Statut:</strong> ${experiment.status}</span>
                    <span><strong>Créé le:</strong> ${date}</span>
                    ${experiment.hypothesis ? `<span><strong>Hypothèse:</strong> ${experiment.hypothesis}</span>` : ''}
                    ${experiment.methodology ? `<span><strong>Méthodologie:</strong> ${experiment.methodology}</span>` : ''}
                </div>
                <div class="data-actions">
                    <button class="btn btn-sm btn-primary chart-btn" data-experiment="${experiment.id}" data-sensor-type="">📈 Voir Données</button>
                    <button class="btn btn-sm btn-secondary sensors-btn" data-experiment-id="${experiment.id}">📊 Voir Capteurs</button>
                </div>
            </div>
        `;
    }

    async showExperimentDetails(experimentId) {
        try {
            // Charger les expériences avec un filtre sur l'ID spécifique
            const response = await fetch(`/api/experiments?experimentId=${experimentId}`);
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                const experiment = result.data[0];
                const container = document.getElementById('experiments-list');

                // Afficher uniquement cette expérience avec un style mis en évidence
                container.innerHTML = `
                    <div class="highlighted-experiment" style="border: 2px solid #3498db; background-color: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px;">
                        ${this.renderExperiment(experiment)}
                        <p style="color: #3498db; font-weight: bold; margin-top: 10px;">📍 Expérience ${experimentId}</p>
                    </div>
                `;

                // Scroll vers l'expérience
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                this.showMessage('Expérience non trouvée', 'error');
            }
        } catch (error) {
            console.error('Erreur lors du chargement de l\'expérience:', error);
            this.showMessage('Erreur lors du chargement de l\'expérience', 'error');
        }
    }

    async showExperimentSensors(experimentId) {
        try {
            // Appliquer le filtre d'expérience
            const filters = { experimentId: experimentId };

            // Charger les capteurs avec le filtre
            await this.loadSensors(filters);

            // Optionnel : scroll vers le haut de la liste
            const container = document.getElementById('sensors-list');
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Afficher un message pour indiquer le filtrage
            this.showMessage(`Affichage des capteurs pour l'expérience ${experimentId}`, 'success');

        } catch (error) {
            console.error('Erreur lors de l\'affichage des capteurs:', error);
            this.showMessage('Erreur lors du chargement des capteurs', 'error');
        }
    }

    showSensorForm() {
        document.getElementById('sensor-form').style.display = 'block';
        document.getElementById('experiment-id-sensor').focus();
    }

    hideSensorForm() {
        document.getElementById('sensor-form').style.display = 'none';
        document.getElementById('add-sensor-form').reset();
    }

    showExperimentForm() {
        document.getElementById('experiment-form').style.display = 'block';
        document.getElementById('exp-title').focus();
    }

    hideExperimentForm() {
        document.getElementById('experiment-form').style.display = 'none';
        document.getElementById('add-experiment-form').reset();
    }

    async handleSensorSubmit(e) {
        e.preventDefault();

        const locationDesc = document.getElementById('location-desc').value;
        const formData = {
            experimentId: document.getElementById('experiment-id-sensor').value,
            studentName: document.getElementById('student-name').value,
            studentGroup: document.getElementById('student-group').value || undefined,
            sensorType: document.getElementById('sensor-type').value,
            value: parseFloat(document.getElementById('sensor-value').value),
            unit: document.getElementById('sensor-unit').value,
            location: locationDesc ? { description: locationDesc } : undefined,
            notes: document.getElementById('sensor-notes').value || undefined,
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/sensors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('Données de capteur ajoutées avec succès!', 'success');
                this.hideSensorForm();
                await this.loadSensors();
            } else {
                throw new Error(result.message || 'Erreur lors de l\'ajout');
            }
        } catch (error) {
            this.showMessage(`Erreur: ${error.message}`, 'error');
        }
    }

    async handleExperimentSubmit(e) {
        e.preventDefault();

        const formData = {
            title: document.getElementById('exp-title').value,
            description: document.getElementById('exp-description').value,
            protocol: document.getElementById('exp-protocol').value || undefined,
            studentName: document.getElementById('exp-student-name').value,
            studentGroup: document.getElementById('exp-student-group').value || undefined,
            school: document.getElementById('exp-school').value || undefined,
            hypothesis: document.getElementById('exp-hypothesis').value || undefined,
            methodology: document.getElementById('exp-methodology').value || undefined
        };

        try {
            const response = await fetch('/api/experiments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('Expérience créée avec succès!', 'success');
                this.hideExperimentForm();
                await this.loadExperiments();
            } else {
                throw new Error(result.message || 'Erreur lors de la création');
            }
        } catch (error) {
            this.showMessage(`Erreur: ${error.message}`, 'error');
        }
    }

    async handleUploadSubmit(e) {
        e.preventDefault();

        const fileInput = document.getElementById('csv-file');
        const experimentId = document.getElementById('experiment-id').value;

        if (!fileInput.files[0]) {
            this.showUploadMessage('Veuillez sélectionner un fichier CSV', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('csvFile', fileInput.files[0]);
        if (experimentId) {
            formData.append('experimentId', experimentId);
        }

        try {
            this.showUploadMessage('Téléversement en cours...', 'info');

            const response = await fetch('/api/sensors/upload-csv', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showUploadMessage(`Fichier téléversé avec succès! ${result.count} enregistrements ajoutés.`, 'success');
                document.getElementById('upload-form').reset();
                await this.loadSensors();
            } else {
                throw new Error(result.message || 'Erreur lors du téléversement');
            }
        } catch (error) {
            this.showUploadMessage(`Erreur: ${error.message}`, 'error');
        }
    }

    initializeMap() {
        console.log('Initializing map...');

        if (!window.L) {
            console.error('Leaflet library not loaded!');
            document.getElementById('sensor-map').innerHTML = '<div style="padding: 20px; text-align: center; color: red;">Erreur: Bibliothèque de carte non chargée</div>';
            return;
        }

        if (!this.map) {
            try {
                console.log('Creating Leaflet map...');
                // Centrer sur l'Europe pour voir tous les capteurs
                this.map = L.map('sensor-map').setView([46.0, 2.0], 5);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap contributors'
                }).addTo(this.map);

                console.log('Map created successfully');

                // Créer la légende
                this.createMapLegend();

                // Charger les marqueurs des expériences
                this.loadMapMarkers();
            } catch (error) {
                console.error('Error creating map:', error);
                document.getElementById('sensor-map').innerHTML = `<div style="padding: 20px; text-align: center; color: red;">Erreur de carte: ${error.message}</div>`;
            }
        } else {
            console.log('Map already exists, invalidating size...');
            // Si la carte existe déjà, on force le redimensionnement
            this.map.invalidateSize();
        }
    }

    async loadMapMarkers() {
        try {
            // Charger les expériences ET les protocoles
            const [experimentsResponse, protocolsResponse] = await Promise.all([
                fetch('/api/experiments'),
                fetch('/api/protocols')
            ]);

            const experimentsData = await experimentsResponse.json();
            const protocolsData = await protocolsResponse.json();

            if (experimentsData.success && protocolsData.success) {
                // Créer le cache des protocoles
                this.protocolsCache.clear();
                protocolsData.data.forEach(protocol => {
                    this.protocolsCache.set(protocol.id, protocol);
                });

                this.clearMapMarkers();

                // Filtrer les expériences avec localisation
                const experimentsWithLocation = experimentsData.data.filter(exp =>
                    exp.location &&
                    exp.location.latitude &&
                    exp.location.longitude
                );

                // Ajouter chaque expérience individuellement (pas de clustering)
                experimentsWithLocation.forEach(experiment => {
                    this.addExperimentMarker(experiment);
                });

                console.log(`Affichage de ${experimentsWithLocation.length} expériences sur la carte`);
                this.centerMap();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des marqueurs:', error);
        }
    }


    clearMapMarkers() {
        this.sensorMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.sensorMarkers = [];
    }



    addExperimentMarker(experiment) {
        const lat = experiment.location.latitude;
        const lng = experiment.location.longitude;

        // Obtenir la couleur selon la catégorie du protocole
        const protocol = this.protocolsCache.get(experiment.protocol);
        const protocolCategory = protocol ? protocol.category : 'other';
        const color = this.protocolColors[protocolCategory] || this.protocolColors.other;

        const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        // Popup avec informations de l'expérience
        const protocolName = protocol ? protocol.name : experiment.protocol;
        const popupContent = `
            <div class="experiment-popup">
                <h4>🔬 ${experiment.title}</h4>
                <p><strong>École:</strong> ${experiment.school}</p>
                <p><strong>Étudiant:</strong> ${experiment.studentName}</p>
                ${experiment.studentGroup ? `<p><strong>Groupe:</strong> ${experiment.studentGroup}</p>` : ''}
                <p><strong>Ville:</strong> ${experiment.city}</p>
                <p><strong>Protocole:</strong> ${protocolName}</p>
                <p><strong>Catégorie:</strong> <span style="color: ${color}; font-weight: bold;">${this.translateCategory(protocolCategory)}</span></p>
                <p><strong>Lieu:</strong> ${experiment.location.description || 'Non spécifié'}</p>
                <p><strong>Période:</strong> ${new Date(experiment.startDate).toLocaleDateString('fr-FR')} - ${new Date(experiment.endDate).toLocaleDateString('fr-FR')}</p>
                ${experiment.description ? `<p><strong>Description:</strong> ${experiment.description}</p>` : ''}
                <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-primary chart-btn" data-experiment="${experiment.id}">📈 Voir Données</button>
                    <button class="btn btn-sm btn-secondary experiment-btn" data-experiment-id="${experiment.id}">🔬 Voir Expérience</button>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
        marker.addTo(this.map);
        marker.experimentData = experiment;
        this.sensorMarkers.push(marker);
    }

    translateCategory(category) {
        const translations = {
            governance: 'Gouvernance et citoyenneté',
            environmental: 'Qualité environnementale, climat et bien-être',
            mobility: 'Mobilité',
            energy: 'Économies d\'énergie',
            technology: 'IA et technologies',
            other: 'Autre'
        };
        return translations[category] || category;
    }

    refreshMap() {
        if (this.map) {
            this.loadMapMarkers();
            this.showMessage('Carte mise à jour!', 'success');
        }
    }

    centerMap() {
        if (this.map && this.sensorMarkers.length > 0) {
            const group = new L.featureGroup(this.sensorMarkers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        } else if (this.map) {
            // Centrer sur l'Europe avec un zoom adapté
            this.map.setView([47.0, 2.0], 6);
        }
    }

    filterMapByCluster(cluster) {
        console.log('🔍 Filtrage par cluster:', cluster);
        console.log('📍 Nombre de marqueurs:', this.sensorMarkers.length);
        console.log('🗄️ Cache des protocoles:', this.protocolsCache.size, 'entrées');

        // Mettre à jour l'apparence de la légende
        document.querySelectorAll('.clickable-legend').forEach(item => {
            item.style.fontWeight = 'normal';
            item.style.opacity = '0.7';
        });

        // Mettre en évidence l'élément sélectionné
        if (cluster) {
            const selectedItem = document.querySelector(`[data-cluster="${cluster}"]`);
            if (selectedItem) {
                selectedItem.style.fontWeight = 'bold';
                selectedItem.style.opacity = '1';
            }
        } else {
            // "Tout afficher" sélectionné
            const showAllItem = document.querySelector('[data-cluster=""]');
            if (showAllItem) {
                showAllItem.style.fontWeight = 'bold';
                showAllItem.style.opacity = '1';
            }
        }

        // Filtrer les marqueurs sur la carte
        let visibleCount = 0;
        let hiddenCount = 0;

        this.sensorMarkers.forEach(marker => {
            const experiment = marker.experimentData;
            const protocol = this.protocolsCache.get(experiment.protocol);
            const category = protocol ? protocol.category : 'other';

            console.log(`- Expérience ${experiment.id}: protocol="${experiment.protocol}", category="${category}"`);

            if (!cluster || category === cluster) {
                marker.addTo(this.map);
                visibleCount++;
            } else {
                this.map.removeLayer(marker);
                hiddenCount++;
            }
        });

        console.log(`✅ Marqueurs visibles: ${visibleCount}, cachés: ${hiddenCount}`);

        // Mettre à jour le filtre de la dropdown en conséquence
        const mapFilter = document.getElementById('map-filter');
        if (mapFilter) {
            mapFilter.value = cluster || '';
        }

        // Mettre à jour l'URL pour refléter le filtre actif
        const newRoute = cluster ? `/map/cluster/${cluster}` : '/map';
        if (window.location.hash !== `#${newRoute}`) {
            // Utiliser replaceState pour ne pas ajouter d'entrée dans l'historique
            window.history.replaceState(null, '', `#${newRoute}`);
            console.log('🌐 URL mise à jour:', newRoute);
        }
    }

    createMapLegend() {
        // Créer la légende des couleurs
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = `
                <h4>Clusters SteamCity <small style="font-size: 11px; font-weight: normal;">(clic pour filtrer)</small></h4>
                <div class="legend-item clickable-legend" data-cluster="governance">
                    <span class="legend-color" style="background-color: ${this.protocolColors.governance}"></span>
                    <span class="legend-text">Gouvernance</span>
                </div>
                <div class="legend-item clickable-legend" data-cluster="environmental">
                    <span class="legend-color" style="background-color: ${this.protocolColors.environmental}"></span>
                    <span class="legend-text">Environnement</span>
                </div>
                <div class="legend-item clickable-legend" data-cluster="mobility">
                    <span class="legend-color" style="background-color: ${this.protocolColors.mobility}"></span>
                    <span class="legend-text">Mobilité</span>
                </div>
                <div class="legend-item clickable-legend" data-cluster="energy">
                    <span class="legend-color" style="background-color: ${this.protocolColors.energy}"></span>
                    <span class="legend-text">Énergie</span>
                </div>
                <div class="legend-item clickable-legend" data-cluster="technology">
                    <span class="legend-color" style="background-color: ${this.protocolColors.technology}"></span>
                    <span class="legend-text">IA & Technologies</span>
                </div>
                <div class="legend-item clickable-legend reset-filter" data-cluster="" style="margin-top: 8px; border-top: 1px solid #ddd; padding-top: 5px; font-style: italic;">
                    <span class="legend-color" style="background: linear-gradient(45deg, #e74c3c, #27ae60, #3498db, #f39c12, #9b59b6); background-size: 200% 200%;"></span>
                    <span class="legend-text">Tout afficher</span>
                </div>
            `;

            // Empêcher la propagation des clics de la carte, mais permettre les clics sur les éléments interactifs
            L.DomEvent.disableClickPropagation(div);

            // Ajouter directement les gestionnaires d'événements aux éléments cliquables
            // Utiliser une fonction fléchée pour préserver le contexte 'this'
            const self = this;
            div.addEventListener('click', (e) => {
                console.log('👆 Clic détecté quelque part dans la légende:', e.target);
                if (e.target.closest('.clickable-legend')) {
                    const legendItem = e.target.closest('.clickable-legend');
                    const cluster = legendItem.dataset.cluster;
                    console.log('🖱️ Clic détecté sur la légende directement');
                    console.log('🏷️ Cluster sélectionné:', cluster);
                    self.filterMapByCluster(cluster);
                } else {
                    console.log('❌ Élément cliqué n\'a pas la classe clickable-legend');
                }
            });

            console.log('🗺️ Légende créée avec', div.querySelectorAll('.clickable-legend').length, 'éléments cliquables');

            return div;
        };

        legend.addTo(this.map);
    }

    async initializeCharts() {
        console.log('Initializing charts...');

        if (!window.Chart) {
            console.error('Chart.js library not loaded!');
            return;
        }

        // Charger les expériences pour le filtre
        await this.loadExperimentsFilter();

        // Créer le graphique initial
        this.createTimeSeriesChart();

        // Ne pas charger les données automatiquement, laisser l'utilisateur choisir
    }

    async loadExperimentsFilter() {
        try {
            const response = await fetch('/api/experiments');
            const data = await response.json();

            const select = document.getElementById('chart-experiment');
            // Vider les options existantes sauf la première
            select.innerHTML = '<option value="">Toutes les expériences</option>';

            if (data.success) {
                data.data.forEach(exp => {
                    const option = document.createElement('option');
                    option.value = exp.id;
                    option.textContent = `${exp.title} (${exp.studentName})`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading experiments for filter:', error);
        }
    }

    async updateAvailableSensorTypes(experimentId) {
        const sensorTypeSelect = document.getElementById('chart-sensor-type');

        // Réinitialiser avec toutes les options par défaut
        sensorTypeSelect.innerHTML = `
            <option value="">Tous les types</option>
            <option value="temperature">Température</option>
            <option value="humidity">Humidité</option>
            <option value="pressure">Pression</option>
            <option value="light">Luminosité</option>
            <option value="noise">Bruit</option>
            <option value="air_quality">Qualité de l'air</option>
            <option value="co2">CO2</option>
            <option value="ph">pH</option>
            <option value="conductivity">Conductivité</option>
            <option value="turbidity">Turbidité</option>
            <option value="motion">Mouvement</option>
            <option value="energy">Énergie</option>
            <option value="uv">UV</option>
            <option value="wind">Vent</option>
        `;

        if (!experimentId) {
            // Si aucune expérience sélectionnée, garder toutes les options
            return;
        }

        try {
            // Récupérer les types de capteurs disponibles pour cette expérience
            const response = await fetch(`/api/sensors/types-by-experiment?experimentId=${experimentId}`);
            const data = await response.json();

            if (data.success && data.count > 0) {
                // Remplacer avec seulement les types disponibles
                sensorTypeSelect.innerHTML = '<option value="">Tous les types</option>';

                const typeNames = {
                    'temperature': 'Température',
                    'humidity': 'Humidité',
                    'pressure': 'Pression',
                    'light': 'Luminosité',
                    'noise': 'Bruit',
                    'air_quality': 'Qualité de l\'air',
                    'co2': 'CO2',
                    'ph': 'pH',
                    'conductivity': 'Conductivité',
                    'turbidity': 'Turbidité',
                    'motion': 'Mouvement',
                    'energy': 'Énergie',
                    'uv': 'UV',
                    'wind': 'Vent'
                };

                data.data.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = typeNames[type] || type;
                    sensorTypeSelect.appendChild(option);
                });

                console.log(`Types de capteurs disponibles pour l'expérience: ${data.data.join(', ')}`);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des types de capteurs:', error);
        }
    }

    showNoDataMessage(experimentId, sensorType, period) {
        const chartContainer = document.getElementById('timeSeriesChart').parentElement;

        // Supprimer le message existant s'il y en a un
        this.clearNoDataMessage();

        // Créer le message informatif
        const messageDiv = document.createElement('div');
        messageDiv.id = 'no-data-message';
        messageDiv.className = 'alert alert-info';
        messageDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
            background: #f8f9fa;
            border: 2px dashed #007bff;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;

        let message = '📊 <strong>Aucune donnée trouvée</strong><br><br>';

        if (experimentId && sensorType) {
            message += `Aucun capteur de type "<em>${this.getSensorTypeName(sensorType)}</em>" trouvé pour cette expérience.`;
        } else if (experimentId) {
            message += 'Cette expérience ne contient aucune donnée de capteur.';
        } else if (sensorType) {
            message += `Aucun capteur de type "<em>${this.getSensorTypeName(sensorType)}</em>" trouvé.`;
        } else {
            message += 'Aucune donnée ne correspond aux filtres sélectionnés.';
        }

        if (period && period !== 'all') {
            const periodNames = {
                '24h': '24 dernières heures',
                '7d': '7 derniers jours',
                '30d': '30 derniers jours'
            };
            message += `<br><small>Période: ${periodNames[period] || period}</small>`;
        }

        message += '<br><br><small>💡 Essayez de modifier les filtres ou sélectionnez une autre expérience.</small>';

        messageDiv.innerHTML = message;

        // Rendre le conteneur relatif pour le positionnement absolu
        chartContainer.style.position = 'relative';
        chartContainer.appendChild(messageDiv);
    }

    clearNoDataMessage() {
        const existingMessage = document.getElementById('no-data-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    getSensorTypeName(sensorType) {
        const typeNames = {
            'temperature': 'Température',
            'humidity': 'Humidité',
            'pressure': 'Pression',
            'light': 'Luminosité',
            'noise': 'Bruit',
            'air_quality': 'Qualité de l\'air',
            'co2': 'CO2',
            'ph': 'pH',
            'conductivity': 'Conductivité',
            'turbidity': 'Turbidité',
            'motion': 'Mouvement',
            'energy': 'Énergie',
            'uv': 'UV',
            'wind': 'Vent'
        };
        return typeNames[sensorType] || sensorType;
    }

    // Fonctions de gestion des filtres
    toggleFilters() {
        const panel = document.getElementById('filters-panel');
        const button = document.getElementById('toggle-filters');
        const isVisible = panel.style.display !== 'none';

        if (isVisible) {
            panel.style.display = 'none';
            button.textContent = '🔍 Filtres de recherche';
        } else {
            panel.style.display = 'block';
            button.textContent = '🔍 Masquer les filtres';
        }
    }

    async loadExperimentsFilterOptions() {
        try {
            const response = await fetch('/api/experiments');
            const data = await response.json();

            const select = document.getElementById('filter-experiment');
            // Garder la première option
            const firstOption = select.firstElementChild;
            select.innerHTML = '';
            select.appendChild(firstOption);

            if (data.success) {
                data.data.forEach(exp => {
                    const option = document.createElement('option');
                    option.value = exp.id;
                    option.textContent = `${exp.title} (${exp.studentName})`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading experiments for filter:', error);
        }
    }

    async applyFilters() {
        // Récupérer tous les filtres
        const filters = this.collectFilters();

        // Appliquer les filtres visuellement
        this.applyFiltersVisual(filters);

        // Recharger les données avec les filtres
        await this.loadSensors(filters);

        // Mettre à jour l'indicateur de filtres actifs
        this.updateFiltersIndicator(filters);
    }

    collectFilters() {
        return {
            search: document.getElementById('filter-search').value.trim(),
            experiment: document.getElementById('filter-experiment').value,
            sensorType: document.getElementById('filter-sensor-type').value,
            student: document.getElementById('filter-student').value.trim(),
            group: document.getElementById('filter-group').value.trim(),
            school: document.getElementById('filter-school').value.trim(),
            city: document.getElementById('filter-city').value,
            dateFrom: document.getElementById('filter-date-from').value,
            dateTo: document.getElementById('filter-date-to').value
        };
    }

    applyFiltersVisual(filters) {
        // Marquer les champs actifs
        const fields = ['filter-search', 'filter-experiment', 'filter-sensor-type',
                       'filter-student', 'filter-group', 'filter-school', 'filter-city',
                       'filter-date-from', 'filter-date-to'];

        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const filterKey = fieldId.replace('filter-', '').replace('-', '');
            const value = filters[filterKey] || filters[fieldId.split('-').pop()];

            if (value && value.trim() !== '') {
                field.classList.add('filter-active');
            } else {
                field.classList.remove('filter-active');
            }
        });
    }

    updateFiltersIndicator(filters) {
        const button = document.getElementById('toggle-filters');
        const activeFiltersCount = this.countActiveFilters(filters);

        // Supprimer l'ancien indicateur
        const oldIndicator = button.querySelector('.filters-count');
        if (oldIndicator) {
            oldIndicator.remove();
        }

        // Ajouter le nouveau si nécessaire
        if (activeFiltersCount > 0) {
            const indicator = document.createElement('span');
            indicator.className = 'filters-count';
            indicator.textContent = activeFiltersCount;
            button.appendChild(indicator);
        }
    }

    countActiveFilters(filters) {
        let count = 0;
        Object.values(filters).forEach(value => {
            if (value && value.toString().trim() !== '') {
                count++;
            }
        });
        return count;
    }

    clearFilters() {
        // Effacer tous les champs de filtres
        document.getElementById('filter-search').value = '';
        document.getElementById('filter-experiment').value = '';
        document.getElementById('filter-sensor-type').value = '';
        document.getElementById('filter-student').value = '';
        document.getElementById('filter-group').value = '';
        document.getElementById('filter-school').value = '';
        document.getElementById('filter-city').value = '';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';

        // Supprimer les classes visuelles
        document.querySelectorAll('.filter-active').forEach(field => {
            field.classList.remove('filter-active');
        });

        // Recharger les données sans filtres
        this.loadSensors();

        // Supprimer l'indicateur
        const button = document.getElementById('toggle-filters');
        const indicator = button.querySelector('.filters-count');
        if (indicator) {
            indicator.remove();
        }
    }

    mapFilterToApiParam(key) {
        const mapping = {
            'search': 'search',
            'experiment': 'experimentId',
            'sensorType': 'sensorType',
            'student': 'studentName',
            'group': 'studentGroup',
            'school': 'school',
            'city': 'city',
            'dateFrom': 'startDate',
            'dateTo': 'endDate'
        };
        return mapping[key] || key;
    }

    createTimeSeriesChart() {
        const ctx = document.getElementById('timeSeriesChart').getContext('2d');

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Évolution des Données de Capteurs'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                minute: 'HH:mm',
                                hour: 'HH:mm',
                                day: 'dd/MM',
                                month: 'MM/yyyy'
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
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        radius: 4,
                        hoverRadius: 6,
                        hitRadius: 10,
                        borderWidth: 2
                    },
                    line: {
                        borderWidth: 2,
                        tension: 0.1
                    }
                }
            }
        });
    }

    async updateChart() {
        console.log('🔧 updateChart called');

        // Éviter les appels concurrents
        if (this.chartUpdateInProgress) {
            console.log('🔧 Chart update already in progress, skipping...');
            return;
        }

        this.chartUpdateInProgress = true;

        try {
            const experimentId = document.getElementById('chart-experiment').value;
            const sensorType = document.getElementById('chart-sensor-type').value;
            const period = document.getElementById('chart-period').value;

            console.log('🔧 Chart filters:', { experimentId, sensorType, period });
            // Construire les paramètres de requête pour filtrer côté serveur
            const params = new URLSearchParams();
            params.append('limit', '5000'); // Limiter à 5000 points pour les graphiques

            if (experimentId) {
                params.append('experimentId', experimentId);
            }
            if (sensorType) {
                params.append('sensorType', sensorType);
            }

            // Filtrer par période côté serveur
            if (period !== 'all') {
                const now = new Date();
                const cutoffDate = new Date();
                switch (period) {
                    case '24h':
                        cutoffDate.setHours(now.getHours() - 24);
                        break;
                    case '7d':
                        cutoffDate.setDate(now.getDate() - 7);
                        break;
                    case '30d':
                        cutoffDate.setDate(now.getDate() - 30);
                        break;
                }
                params.append('startDate', cutoffDate.toISOString());
            }

            const url = `/api/sensors?${params.toString()}`;
            console.log('🔧 Fetching data from:', url);

            const response = await fetch(url);
            const data = await response.json();

            console.log('🔧 API Response:', { success: data.success, count: data.count, totalCount: data.totalCount });

            if (!data.success) {
                throw new Error('Failed to fetch sensor data');
            }

            // Vérifier s'il y a des données
            if (!data.data || data.data.length === 0) {
                console.log('🔧 No data found for current filters');

                // Effacer le graphique
                if (this.chart) {
                    this.updateChartData([]);
                }

                // Afficher un message informatif
                this.showNoDataMessage(experimentId, sensorType, period);
                return;
            }

            // Échantillonnage intelligent si trop de données
            let processedData = data.data;
            if (processedData.length > 1000) {
                processedData = this.sampleData(processedData, 1000);
            }

            // Grouper par type de capteur
            const groupedData = this.groupDataBySensorType(processedData);
            console.log('🔧 Grouped data for chart:', groupedData.length, 'datasets');

            if (!this.chart) {
                console.error('🔧 ERROR: Chart not initialized!');
                return;
            }

            // Effacer le message "pas de données" s'il existe
            this.clearNoDataMessage();

            // Mettre à jour le graphique
            this.updateChartData(groupedData);
            console.log('🔧 Chart updated successfully');

            // Mettre à jour les statistiques (utiliser toutes les données pour les stats)
            this.updateChartStats(data.data);

            // Afficher info sur l'échantillonnage
            if (data.totalCount > data.count) {
                console.log(`Graphique : ${data.count} points affichés sur ${data.totalCount} disponibles`);
            }

        } catch (error) {
            console.error('Error updating chart:', error);
            this.showMessage('Erreur lors de la mise à jour du graphique', 'error');
        } finally {
            this.chartUpdateInProgress = false;
        }
    }

    sampleData(data, maxPoints) {
        if (data.length <= maxPoints) {
            return data;
        }

        // Échantillonnage uniforme
        const step = Math.floor(data.length / maxPoints);
        const sampled = [];

        for (let i = 0; i < data.length; i += step) {
            sampled.push(data[i]);
        }

        // S'assurer d'inclure le dernier point
        if (sampled[sampled.length - 1] !== data[data.length - 1]) {
            sampled.push(data[data.length - 1]);
        }

        return sampled;
    }

    groupDataBySensorType(data) {
        const grouped = {};

        data.forEach(sensor => {
            const key = `${sensor.sensorType} (${sensor.unit})`;

            if (!grouped[key]) {
                grouped[key] = {
                    label: key,
                    data: [],
                    borderColor: this.sensorColors[sensor.sensorType] || this.sensorColors.other,
                    backgroundColor: (this.sensorColors[sensor.sensorType] || this.sensorColors.other) + '20',
                    tension: 0.1,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHitRadius: 10,
                    borderWidth: 2,
                    pointBorderWidth: 2
                };
            }

            grouped[key].data.push({
                x: new Date(sensor.timestamp),
                y: sensor.value,
                sensor: sensor
            });
        });

        // Trier les données par temps
        Object.values(grouped).forEach(group => {
            group.data.sort((a, b) => a.x - b.x);
        });

        return Object.values(grouped);
    }

    updateChartData(datasets) {
        if (this.chart) {
            // Clear existing datasets completely to avoid clipping
            this.chart.data.datasets = [];
            this.chart.update('none'); // Update without animation first

            // Then set new datasets
            this.chart.data.datasets = datasets;
            this.chart.update('active'); // Update with animation
        }
    }

    updateChartStats(data) {
        const total = data.length;

        if (total === 0) {
            document.getElementById('total-measurements').textContent = '0';
            document.getElementById('average-value').textContent = '-';
            document.getElementById('min-value').textContent = '-';
            document.getElementById('max-value').textContent = '-';
            return;
        }

        const values = data.map(sensor => sensor.value);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Unité pour l'affichage (utilise la première unité trouvée)
        const unit = data[0]?.unit || '';

        document.getElementById('total-measurements').textContent = total.toString();
        document.getElementById('average-value').textContent = `${average.toFixed(2)} ${unit}`;
        document.getElementById('min-value').textContent = `${min} ${unit}`;
        document.getElementById('max-value').textContent = `${max} ${unit}`;
    }

    // Méthode pour ouvrir l'onglet graphiques avec des filtres prédéfinis
    openChartsWithFilter(experimentId = '', sensorType = '') {
        console.log('🔧 openChartsWithFilter called with:', { experimentId, sensorType });

        // Annuler tous les timeouts de chart en cours
        this.chartUpdateTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.chartUpdateTimeouts = [];

        // Changer vers l'onglet graphiques
        this.switchTab('charts');

        // Attendre que l'onglet soit initialisé
        const timeoutId = setTimeout(async () => {
            // S'assurer que les graphiques sont initialisés
            if (!this.chart) {
                await this.initializeCharts();
            }

            // Attendre un peu plus pour s'assurer que tout est prêt
            const updateTimeoutId = setTimeout(() => {
                if (experimentId) {
                    document.getElementById('chart-experiment').value = experimentId;
                    // Mettre à jour la liste des types de capteurs disponibles
                    this.updateAvailableSensorTypes(experimentId);
                }
                if (sensorType) {
                    document.getElementById('chart-sensor-type').value = sensorType;
                }
                // Seul appel à updateChart
                this.updateChart();
            }, 150);

            this.chartUpdateTimeouts.push(updateTimeoutId);
        }, 200);

        this.chartUpdateTimeouts.push(timeoutId);
    }

    showMessage(message, type) {
        // Créer un message temporaire
        const messageDiv = document.createElement('div');
        messageDiv.className = `result-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.zIndex = '1000';
        messageDiv.style.maxWidth = '300px';

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    showUploadMessage(message, type) {
        const resultDiv = document.getElementById('upload-result');
        resultDiv.className = `result-message ${type}`;
        resultDiv.textContent = message;
        resultDiv.style.display = 'block';
    }

    // Fonctions de gestion des filtres d'expériences
    toggleExperimentFilters() {
        console.log('🎛️ Toggling experiment filters...');
        const panel = document.getElementById('experiments-filters-panel');
        const button = document.getElementById('toggle-experiments-filters');
        const isVisible = panel.style.display !== 'none';

        if (isVisible) {
            panel.style.display = 'none';
            button.textContent = '🔍 Filtres de recherche';
        } else {
            panel.style.display = 'block';
            button.textContent = '🔍 Masquer les filtres';
        }
    }

    async loadExperimentFilterOptions() {
        console.log('🔧 Loading experiment filter options...');
        try {
            // Charger les protocoles
            const protocolsResponse = await fetch('/api/protocols');
            if (protocolsResponse.ok) {
                const protocolsData = await protocolsResponse.json();
                const protocolSelect = document.getElementById('exp-filter-protocol');
                if (protocolSelect && protocolsData.success) {
                    const firstOption = protocolSelect.firstElementChild;
                    protocolSelect.innerHTML = '';

                    // Re-ajouter la première option si elle existe
                    if (firstOption) {
                        protocolSelect.appendChild(firstOption);
                    }

                    protocolsData.data.forEach(protocol => {
                        const option = document.createElement('option');
                        option.value = protocol.id;
                        option.textContent = protocol.name;
                        protocolSelect.appendChild(option);
                    });
                }
            }

            // Charger les options uniques des expériences
            const response = await fetch('/api/experiments');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Extraire les valeurs uniques
                    const students = [...new Set(data.data.map(exp => exp.studentName).filter(Boolean))];
                    const groups = [...new Set(data.data.map(exp => exp.studentGroup).filter(Boolean))];
                    const schools = [...new Set(data.data.map(exp => exp.school).filter(Boolean))];
                    const cities = [...new Set(data.data.map(exp => exp.city).filter(Boolean))];
                    const languages = [...new Set(data.data.map(exp => exp.language).filter(Boolean))];

                    // Remplir les selects
                    this.fillSelectOptions('exp-filter-student', students);
                    this.fillSelectOptions('exp-filter-group', groups);
                    this.fillSelectOptions('exp-filter-school', schools);
                    this.fillSelectOptions('exp-filter-city', cities);
                    this.fillSelectOptions('exp-filter-language', languages);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des options de filtre:', error);
        }
    }

    fillSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const firstOption = select.firstElementChild;
        select.innerHTML = '';

        // Re-ajouter la première option si elle existe
        if (firstOption) {
            select.appendChild(firstOption);
        }

        options.sort().forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }

    async applyExperimentFilters() {
        console.log('🔍 Applying experiment filters...');
        const filters = this.getExperimentFilters();
        console.log('📊 Filters:', filters);
        await this.loadExperiments(filters);
        this.updateExperimentFiltersCount(filters);
    }

    getExperimentFilters() {
        const filters = {};

        const protocolElement = document.getElementById('exp-filter-protocol');
        console.log('🔍 Protocol element:', protocolElement);
        const protocolId = protocolElement?.value;
        const student = document.getElementById('exp-filter-student')?.value;
        const group = document.getElementById('exp-filter-group')?.value;
        const school = document.getElementById('exp-filter-school')?.value;
        const city = document.getElementById('exp-filter-city')?.value;
        const language = document.getElementById('exp-filter-language')?.value;
        const status = document.getElementById('exp-filter-status')?.value;
        const search = document.getElementById('exp-filter-search')?.value?.trim();
        const startDate = document.getElementById('exp-filter-start-date')?.value;
        const endDate = document.getElementById('exp-filter-end-date')?.value;

        if (protocolId) filters.protocolId = protocolId;
        if (student) filters.studentName = student;
        if (group) filters.studentGroup = group;
        if (school) filters.school = school;
        if (city) filters.city = city;
        if (language) filters.language = language;
        if (status) filters.status = status;
        if (search) filters.search = search;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        return filters;
    }

    clearExperimentFilters() {
        document.getElementById('exp-filter-protocol').value = '';
        document.getElementById('exp-filter-student').value = '';
        document.getElementById('exp-filter-group').value = '';
        document.getElementById('exp-filter-school').value = '';
        document.getElementById('exp-filter-city').value = '';
        document.getElementById('exp-filter-language').value = '';
        document.getElementById('exp-filter-status').value = '';
        document.getElementById('exp-filter-search').value = '';
        document.getElementById('exp-filter-start-date').value = '';
        document.getElementById('exp-filter-end-date').value = '';

        this.loadExperiments();
        this.updateExperimentFiltersCount({});
    }

    updateExperimentFiltersCount(filters) {
        const count = Object.keys(filters).length;
        const countElement = document.getElementById('exp-filters-count');
        if (countElement) {
            if (count > 0) {
                countElement.textContent = count;
                countElement.style.display = 'inline-block';
            } else {
                countElement.style.display = 'none';
            }
        }

        // Mettre à jour les styles des champs actifs
        Object.keys(filters).forEach(key => {
            const fieldMapping = {
                protocol: 'exp-filter-protocol',
                studentName: 'exp-filter-student',
                studentGroup: 'exp-filter-group',
                school: 'exp-filter-school',
                city: 'exp-filter-city',
                language: 'exp-filter-language',
                status: 'exp-filter-status',
                search: 'exp-filter-search',
                startDate: 'exp-filter-start-date',
                endDate: 'exp-filter-end-date'
            };

            const fieldId = fieldMapping[key];
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.add('filter-active');
            }
        });

        // Supprimer la classe des champs non actifs
        Object.values({
            protocol: 'exp-filter-protocol',
            studentName: 'exp-filter-student',
            studentGroup: 'exp-filter-group',
            school: 'exp-filter-school',
            city: 'exp-filter-city',
            language: 'exp-filter-language',
            status: 'exp-filter-status',
            search: 'exp-filter-search',
            startDate: 'exp-filter-start-date',
            endDate: 'exp-filter-end-date'
        }).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !Object.values(filters).some(value => value === field.value)) {
                field.classList.remove('filter-active');
            }
        });
    }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new SteamCityAPI();
});