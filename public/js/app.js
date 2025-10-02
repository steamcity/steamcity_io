/**
 * App - Application principale SteamCity
 *
 * Classe standalone qui coordonne tous les managers sans dépendre de script.js
 *
 * @module App
 */

import { protocolColors, getProtocolLabel, getProtocolIcon } from './config.js'
import { AuthManager } from './auth-manager.js'
import { ApiService } from './api-service.js'
import { MapManager } from './map-manager.js'
import { DataVisualizationManager } from './data-visualization-manager.js'
import { ExperimentsManager } from './experiments-manager.js'
import { SensorsManager } from './sensors-manager.js'
import { RouterManager } from './router-manager.js'
import { ViewManager } from './view-manager.js'

export class App {
    constructor() {
        // Configuration
        this.protocolColors = protocolColors

        // Data
        this.experiments = []
        this.sensors = []
        this.sensorTypes = []

        // State
        this.isAuthenticated = false
        this.map = null
        this.markers = []
        this.chart = null
        this.activeProtocolFilter = null
        this.activeExperimentFilter = null
        this.selectedExperimentForData = null
        this.urlParams = {}

        // Create managers
        this.authManager = new AuthManager()
        this.apiService = new ApiService('/api')
        this.mapManager = new MapManager({
            containerId: 'map',
            center: [46.2276, 2.2137],
            zoom: 6,
            protocolColors: this.protocolColors,
            legendId: 'map-legend'
        })
        this.dataVizManager = new DataVisualizationManager({
            apiService: this.apiService
        })
        this.experimentsManager = new ExperimentsManager({
            experiments: this.experiments,
            protocolColors: this.protocolColors,
            getProtocolLabel: (p) => getProtocolLabel(p),
            getProtocolIcon: (p) => getProtocolIcon(p),
            onExperimentClick: (id) => this.showExperimentDetail(id),
            apiService: this.apiService
        })

        // ViewManager - will be configured after SensorsManager creation
        this.viewManager = new ViewManager({
            mapManager: this.mapManager,
            experimentsManager: this.experimentsManager,
            sensorsManager: null, // Will be set after SensorsManager creation
            dataVisualizationManager: this.dataVizManager,
            onViewChange: (viewName, updateUrl) => {
                if (updateUrl) {
                    this.updateUrl(viewName)
                }
            },
            onInitializeMap: async () => {
                if (!this.map) {
                    await this.initializeMap()
                } else {
                    // Refresh map if it already exists
                    setTimeout(() => {
                        this.map.invalidateSize()
                        this.mapManager.centerOnVisibleMarkers()
                    }, 50)
                }
            },
            onInitializeExperiments: async () => {
                await this.loadExperimentsList()
            },
            onInitializeSensors: async () => {
                await this.loadSensorsView()
                this.bindToggleEvents()
            },
            onInitializeData: async (experimentId) => {
                await this.loadChartData(experimentId)
                this.bindDataFilterEvents()
                this.bindToggleEvents()
            }
        })

        // SensorsManager
        this.sensorsManager = new SensorsManager({
            apiService: this.apiService,
            dataVizManager: this.dataVizManager,
            protocolColors: this.protocolColors,
            getProtocolLabel: (p) => getProtocolLabel(p),
            experiments: this.experiments,
            updateUrl: (view, id, queryParams) => this.updateUrl(view, id, queryParams),
            showView: (view) => this.viewManager.showView(view, { updateUrl: false }),
            showExperimentDetail: (id) => this.showExperimentDetail(id),
            navigateToDataView: (experimentId) => this.routerManager.navigate('data', experimentId),
            urlParams: this.urlParams
        })

        // Update ViewManager with SensorsManager
        this.viewManager.sensorsManager = this.sensorsManager

        // RouterManager
        this.routerManager = new RouterManager({
            onViewChange: (viewName, updateUrl) => {
                this.viewManager.showView(viewName, { updateUrl })
            },
            onExperimentDetail: (experimentId, updateUrl) => {
                this.showExperimentDetail(experimentId, updateUrl)
            },
            onSensorDetail: (sensorId, updateUrl) => {
                this.showSensorDetails(sensorId, updateUrl)
            },
            onDataView: (experimentId, updateUrl) => {
                this.viewManager.setSelectedExperimentForData(experimentId)
                this.viewManager.showView('data', { updateUrl })
            }
        })

        // Setup auth event listeners
        this.setupAuthListeners()

        console.log('✅ App initialisée avec tous les managers')
    }

    /**
     * Configure les écouteurs d'événements d'authentification
     */
    setupAuthListeners() {
        window.addEventListener('auth:loginSuccess', async () => {
            this.isAuthenticated = true
            await this.showMainApp()
        })

        window.addEventListener('auth:logout', () => {
            this.isAuthenticated = false
        })
    }

    /**
     * Initialise l'application
     */
    async init() {
        this.isAuthenticated = this.authManager.getAuthState()
        this.bindEvents()
        this.routerManager.init()
        await this.showHomepage()
    }

    /**
     * Bind les événements de l'interface
     */
    bindEvents() {
        // Navigation events
        const mapTab = document.getElementById('map-tab')
        const experimentsTab = document.getElementById('experiments-tab')
        const dataTab = document.getElementById('data-tab')
        const sensorsTab = document.getElementById('sensors-tab')

        mapTab?.addEventListener('click', () => this.viewManager.showView('map'))
        experimentsTab?.addEventListener('click', () => this.viewManager.showView('experiments'))
        dataTab?.addEventListener('click', () => this.viewManager.showView('data'))
        sensorsTab?.addEventListener('click', () => this.viewManager.showView('sensors'))

        // Center map button
        document.getElementById('center-map-btn')?.addEventListener('click', () => this.mapManager.centerOnVisibleMarkers())

        // Protocol filters
        document.getElementById('protocol-filter')?.addEventListener('change', (e) => this.filterByProtocol(e.target.value))

        console.log('✅ Événements bindés')
    }

    /**
     * Affiche la page d'accueil
     */
    async showHomepage() {
        const loadingScreen = document.getElementById('loading-screen')
        const homepage = document.getElementById('homepage')
        const mainApp = document.getElementById('main-app')

        // Always hide loading screen first
        if (loadingScreen) {
            loadingScreen.classList.remove('active')
            loadingScreen.style.display = 'none'
        }

        if (!this.isAuthenticated) {
            homepage.classList.remove('hidden')
            mainApp.classList.add('hidden')
        } else {
            await this.showMainApp()
        }
    }

    /**
     * Affiche l'application principale après authentification
     */
    async showMainApp() {
        const loadingScreen = document.getElementById('loading-screen')
        const homepage = document.getElementById('homepage')
        const mainApp = document.getElementById('main-app')

        // Hide loading screen
        if (loadingScreen) {
            loadingScreen.classList.remove('active')
            loadingScreen.style.display = 'none'
        }

        homepage.classList.add('hidden')
        mainApp.classList.remove('hidden')

        // Charger les données initiales
        await this.loadInitialData()

        // Update managers with loaded data
        this.experimentsManager.setExperiments(this.experiments)
        this.sensorsManager.experiments = this.experiments

        // Handle current route
        this.routerManager.handleRoute(false)
    }

    /**
     * Charge les données initiales depuis l'API
     */
    async loadInitialData() {
        if (this.experiments.length > 0) {
            return // Already loaded
        }

        try {
            // Load experiments (API returns array directly)
            const experimentsData = await this.apiService.fetchExperiments()

            // Transform experiments data to match expected format
            this.experiments = (Array.isArray(experimentsData) ? experimentsData : []).map(exp => ({
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
            }))

            console.log(`✅ ${this.experiments.length} expériences chargées`)

            // Load sensor types for later use
            this.sensorTypes = await this.apiService.fetchSensorTypes()
            console.log(`✅ ${this.sensorTypes.length} types de capteurs chargés`)
        } catch (error) {
            console.error('❌ Erreur lors du chargement des données:', error)
        }
    }

    // ============================================
    // Map Methods
    // ============================================

    /**
     * Initialise la carte Leaflet
     */
    async initializeMap() {
        if (this.map) return

        try {
            await this.mapManager.initialize()
            this.map = this.mapManager.getMapInstance()

            // Charger les marqueurs et créer la légende
            await this.loadMapMarkers()
            this.createMapLegend()

            console.log('✅ Carte initialisée')
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de la carte:', error)
        }
    }

    /**
     * Charge les marqueurs sur la carte
     */
    async loadMapMarkers() {
        if (!this.experiments.length) {
            await this.loadInitialData()
        }

        console.log('🔍 loadMapMarkers: experiments count =', this.experiments.length)
        console.log('🔍 loadMapMarkers: first experiment =', this.experiments[0])

        this.mapManager.addMarkers(this.experiments, {
            fitBounds: true,
            getProtocolLabel: (p) => getProtocolLabel(p)
        })
        this.markers = this.mapManager.getMarkers()
    }

    /**
     * Crée la légende de la carte
     */
    createMapLegend() {
        const protocols = [
            { key: 'environmental', label: `🌱 ${getProtocolLabel('environmental')}` },
            { key: 'energy', label: `⚡ ${getProtocolLabel('energy')}` },
            { key: 'mobility', label: `🚗 ${getProtocolLabel('mobility')}` },
            { key: 'governance', label: `🏛️ ${getProtocolLabel('governance')}` },
            { key: 'technology', label: `💻 ${getProtocolLabel('technology')}` }
        ]

        this.mapManager.createLegend(protocols, (p) => getProtocolLabel(p))
        this.mapManager.bindLegendEvents((protocolKey) => {
            this.filterByLegend(protocolKey)
        })
    }

    /**
     * Filtre les expériences par protocole
     */
    filterByProtocol(protocol) {
        this.mapManager.filterByProtocol(
            protocol || null,
            this.experiments,
            { getProtocolLabel: (p) => getProtocolLabel(p) }
        )
        this.markers = this.mapManager.getMarkers()
    }

    /**
     * Filtre via la légende
     */
    filterByLegend(protocolKey) {
        this.activeProtocolFilter = protocolKey
        this.mapManager.filterByProtocol(
            protocolKey,
            this.experiments,
            { getProtocolLabel: (p) => getProtocolLabel(p) }
        )
        this.markers = this.mapManager.getMarkers()

        // Update dropdown filter to match
        const protocolFilter = document.getElementById('protocol-filter')
        if (protocolFilter) {
            protocolFilter.value = protocolKey || ''
        }
    }

    /**
     * Efface les marqueurs
     */
    clearMarkers() {
        this.mapManager.clearMarkers()
        this.markers = []
    }

    /**
     * Centre la carte sur les marqueurs visibles
     */
    centerMapOnVisibleMarkers() {
        this.mapManager.centerOnVisibleMarkers()
    }

    /**
     * Met à jour l'état de la légende
     */
    updateLegendState() {
        this.mapManager.updateLegendState()
    }

    // ============================================
    // Experiments Methods
    // ============================================

    /**
     * Charge la liste des expériences
     */
    async loadExperimentsList() {
        // Load data if not already loaded
        if (this.experiments.length === 0) {
            await this.loadInitialData()
        }

        // Update experimentsManager with latest data
        this.experimentsManager.setExperiments(this.experiments)

        // Delegate to experimentsManager
        await this.experimentsManager.loadExperimentsList({
            withLegend: true,
            checkSensors: true
        })

        // Setup additional bindings
        this.populateFilterDropdowns()
        this.bindFilterEvents()
        this.bindToggleEvents()
        this.bindExperimentsFilterSearch()
        this.applyUrlParamsToExperimentsFilters()
    }

    /**
     * Filtre les expériences
     */
    async filterExperiments(protocol) {
        this.experimentsManager.setExperiments(this.experiments)
        await this.experimentsManager.filterExperiments(protocol)
    }

    /**
     * Récupère les expériences avec capteurs
     */
    async getExperimentsWithSensors() {
        return await this.experimentsManager.getExperimentsWithSensors()
    }

    /**
     * Crée la légende des expériences
     */
    createExperimentsLegend() {
        this.experimentsManager.setExperiments(this.experiments)
        this.experimentsManager.createExperimentsLegend()
    }

    /**
     * Filtre les expériences par légende
     */
    async filterExperimentsByLegend(protocolKey) {
        this.experimentsManager.setExperiments(this.experiments)
        await this.experimentsManager.filterExperimentsByLegend(protocolKey)
        this.applyFilters()
    }

    /**
     * Met à jour l'état de la légende des expériences
     */
    updateExperimentsLegendState() {
        this.experimentsManager.updateExperimentsLegendState()
    }

    /**
     * Affiche le détail d'une expérience
     */
    async showExperimentDetail(experimentId, updateUrl = true) {
        if (updateUrl) {
            // Navigate via RouterManager pour mettre à jour l'URL
            this.routerManager.navigate('experiments', experimentId)
        } else {
            // Afficher directement sans mettre à jour l'URL
            const experiment = this.experiments.find(e => e.id === experimentId)
            if (experiment) {
                await this.viewManager.showExperimentDetail(experimentId, experiment, {
                    onChartCreate: async (experimentId, container) => {
                        await this.createExperimentChart(experimentId, container)
                        this.setupTimeFilterControls(experimentId, container)
                    },
                    applyClusterColor: (color) => {
                        this.applyClusterColorToSections(color)
                    },
                    onSensorClick: (sensorId) => {
                        this.showSensorDetails(sensorId)
                    },
                    onBackToList: () => {
                        this.routerManager.navigate('experiments')
                    }
                })
            }
        }
    }

    // ============================================
    // Sensors Methods
    // ============================================

    /**
     * Charge la vue des capteurs
     */
    async loadSensorsView() {
        this.sensorsManager.experiments = this.experiments
        this.sensorsManager.urlParams = this.urlParams
        await this.sensorsManager.loadSensorsView()
    }

    /**
     * Applique les filtres des capteurs
     */
    applySensorsFilters() {
        this.sensorsManager.experiments = this.experiments
        this.sensorsManager.urlParams = this.urlParams
        this.sensorsManager.applySensorsFilters()
    }

    /**
     * Affiche les capteurs
     */
    displaySensors(sensors) {
        this.sensorsManager.experiments = this.experiments
        this.sensorsManager.displaySensors(sensors)
    }

    /**
     * Affiche le détail d'un capteur
     */
    async showSensorDetails(sensorId, updateUrl = true) {
        if (updateUrl) {
            // Navigate via RouterManager pour mettre à jour l'URL
            this.routerManager.navigate('sensors', sensorId)
        } else {
            // Afficher directement sans mettre à jour l'URL
            this.sensorsManager.experiments = this.experiments
            this.sensorsManager.urlParams = this.urlParams
            await this.viewManager.showSensorDetail(sensorId)
        }
    }

    /**
     * Charge le graphique d'un capteur
     */
    async loadSensorChart(sensorId, period = '24h') {
        await this.sensorsManager.loadSensorChart(sensorId, period)
    }

    /**
     * Récupère un capteur par son ID
     */
    getSensorById(sensorId) {
        return this.sensorsManager.getSensorById(sensorId)
    }

    // ============================================
    // Data Visualization Methods
    // ============================================

    /**
     * Crée un graphique pour une expérience
     */
    async createExperimentChart(experimentId, container, period = '24h') {
        await this.dataVizManager.createExperimentChart(experimentId, container, period)
    }

    /**
     * Charge le graphique d'une expérience
     */
    async loadExperimentChart(experimentId) {
        if (!experimentId) return

        try {
            // Get measurements for this experiment
            const measurementsData = await this.apiService.fetchMeasurements({
                experimentId,
                period: 'all',
                limit: 1000
            })

            if (!measurementsData || measurementsData.length === 0) {
                const chartContainer = document.getElementById('main-chart')
                if (chartContainer) {
                    chartContainer.innerHTML = '<p>Aucune donnée de mesure disponible pour cette expérience</p>'
                }
                return
            }

            // Get sensor types
            const sensorTypesData = await this.apiService.fetchSensorTypes()
            const sensorTypes = {}
            sensorTypesData.forEach(type => {
                sensorTypes[type.id] = type
            })

            // Create chart with all measurements
            this.createMainChart(measurementsData, sensorTypes)

            // Create custom legend after a small delay
            setTimeout(() => {
                if (this.chart && this.chart.data.datasets.length > 0) {
                    this.dataVizManager.createCustomLegend(this.chart, 'chart-container')
                }
            }, 100)

            // Calculate and display statistics
            await this.dataVizManager.calculateAndDisplayStats(measurementsData)

        } catch (error) {
            console.error('Error loading experiment chart:', error)
            const chartContainer = document.getElementById('main-chart')
            if (chartContainer) {
                chartContainer.innerHTML = '<p>Erreur lors du chargement des données</p>'
            }
        }
    }

    /**
     * Crée le graphique principal
     */
    createMainChart(measurements, sensorTypesMap) {
        this.chart = this.dataVizManager.createMainChart(measurements, sensorTypesMap)
    }

    /**
     * Calcule et affiche les statistiques
     */
    async calculateAndDisplayStats(measurements) {
        await this.dataVizManager.calculateAndDisplayStats(measurements)
    }

    /**
     * Efface l'affichage des données
     */
    clearDataDisplay() {
        this.dataVizManager.clearDataDisplay()
    }

    /**
     * Charge les données du graphique
     */
    async loadChartData(experimentId) {
        const experimentSelect = document.getElementById('experiment-select')
        if (experimentSelect) {
            // Get experiments that have sensor data
            const experimentsWithSensors = await this.getExperimentsWithSensors()

            // Filter experiments to only show those with sensors
            const filteredExperiments = this.experiments.filter(exp =>
                experimentsWithSensors.includes(exp.id)
            )

            // Populate experiment select with only experiments that have sensors
            experimentSelect.innerHTML = '<option value="">Choisir une expérience</option>'
            filteredExperiments.forEach(exp => {
                const option = document.createElement('option')
                option.value = exp.id
                option.textContent = exp.title
                experimentSelect.appendChild(option)
            })

            // If a specific experiment is preselected, select it
            if (experimentId) {
                experimentSelect.value = experimentId
                await this.updateDataSensorTypes()
            }
        }

        await this.loadExperimentChart(experimentId)
    }

    // ============================================
    // Routing Methods
    // ============================================

    /**
     * Met à jour l'URL
     */
    updateUrl(view, id = null, queryParams = null) {
        this.routerManager.updateUrl(view, id, queryParams)
    }

    /**
     * Gère le routing
     */
    handleRoute(updateUrl = true) {
        this.urlParams = this.routerManager.getUrlParams()
        this.routerManager.handleRoute(updateUrl)
    }

    /**
     * Parse les paramètres URL
     */
    parseUrlParams(hash) {
        return this.routerManager.parseUrlParams(hash)
    }

    // ============================================
    // Helper Methods - Experiments Filters
    // ============================================

    /**
     * Remplit les dropdowns de filtres avec les données des expériences
     */
    populateFilterDropdowns() {
        const countries = [...new Set(this.experiments.map(exp => this.getCountryFromCity(exp.city)))].sort()
        const cities = [...new Set(this.experiments.map(exp => exp.city))].sort()
        const schools = [...new Set(this.experiments.map(exp => exp.school))].sort()
        const statuses = [...new Set(this.experiments.map(exp => exp.status))].filter(status => status).sort()
        const protocols = [...new Set(this.experiments.map(exp => exp.protocol_name))].filter(protocol => protocol).sort()

        // Populate country filter
        const countryFilter = document.getElementById('country-filter')
        if (countryFilter) {
            countryFilter.innerHTML = '<option value="">Tous les pays</option>'
            countries.forEach(country => {
                const option = document.createElement('option')
                option.value = country
                option.textContent = country
                countryFilter.appendChild(option)
            })
        }

        // Populate city filter
        const cityFilter = document.getElementById('city-filter')
        if (cityFilter) {
            cityFilter.innerHTML = '<option value="">Toutes les villes</option>'
            cities.forEach(city => {
                const option = document.createElement('option')
                option.value = city
                option.textContent = city
                cityFilter.appendChild(option)
            })
        }

        // Populate school filter
        const schoolFilter = document.getElementById('school-filter')
        if (schoolFilter) {
            schoolFilter.innerHTML = '<option value="">Toutes les écoles</option>'
            schools.forEach(school => {
                const option = document.createElement('option')
                option.value = school
                option.textContent = school
                schoolFilter.appendChild(option)
            })
        }

        // Populate status filter
        const statusFilter = document.getElementById('status-filter')
        if (statusFilter) {
            statusFilter.innerHTML = '<option value="">Tous les statuts</option>'
            statuses.forEach(status => {
                const option = document.createElement('option')
                option.value = status
                option.textContent = this.getStatusLabel(status)
                statusFilter.appendChild(option)
            })
        }

        // Populate protocol filter
        const protocolFilter = document.getElementById('experiment-protocol-filter')
        if (protocolFilter) {
            protocolFilter.innerHTML = '<option value="">Tous les protocoles</option>'
            protocols.forEach(protocol => {
                const option = document.createElement('option')
                option.value = protocol
                option.textContent = protocol
                protocolFilter.appendChild(option)
            })
        }
    }

    /**
     * Bind les événements des filtres
     */
    bindFilterEvents() {
        const countryFilter = document.getElementById('country-filter')
        const cityFilter = document.getElementById('city-filter')
        const schoolFilter = document.getElementById('school-filter')
        const statusFilter = document.getElementById('status-filter')
        const protocolFilter = document.getElementById('experiment-protocol-filter')
        const startDateFilter = document.getElementById('start-date-filter')
        const endDateFilter = document.getElementById('end-date-filter')
        const clearFiltersBtn = document.getElementById('clear-filters-btn')
        const sensorFilterBtn = document.getElementById('sensor-filter-btn')

        const filters = [countryFilter, cityFilter, schoolFilter, statusFilter, protocolFilter, startDateFilter, endDateFilter]
        filters.filter(f => f).forEach(filter => {
            filter.addEventListener('change', () => this.applyFilters())
        })

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters())
        }

        if (sensorFilterBtn) {
            sensorFilterBtn.addEventListener('click', () => this.toggleSensorFilter())
        }
    }

    /**
     * Bind les événements des toggles
     */
    bindToggleEvents() {
        const toggles = document.querySelectorAll('.filter-toggle')
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const targetId = toggle.getAttribute('data-target')
                const targetContent = document.getElementById(targetId)
                const icon = toggle.querySelector('.toggle-icon')

                if (targetContent) {
                    const isVisible = targetContent.style.display !== 'none'
                    targetContent.style.display = isVisible ? 'none' : 'block'
                    icon.classList.toggle('rotated', !isVisible)
                }
            })
        })
    }

    /**
     * Bind les événements de la barre de recherche de filtres
     */
    bindExperimentsFilterSearch() {
        const filterSearchBox = document.getElementById('experiments-filter-search-box')

        if (filterSearchBox) {
            // Remove existing listeners by cloning
            const newFilterSearchBox = filterSearchBox.cloneNode(true)
            filterSearchBox.parentNode.replaceChild(newFilterSearchBox, filterSearchBox)

            // Add the event listener
            newFilterSearchBox.addEventListener('click', () => {
                const basicFilters = document.getElementById('experiments-basic-filters')
                const additionalFilters = document.getElementById('additional-filters')

                if (basicFilters && additionalFilters) {
                    const isVisible = additionalFilters.style.display !== 'none'
                    basicFilters.style.display = isVisible ? 'none' : 'block'
                    additionalFilters.style.display = isVisible ? 'none' : 'block'

                    // Update search box appearance
                    this.updateExperimentsFilterSearchBox()
                }
            })
        }
    }

    /**
     * Applique les paramètres URL aux filtres
     */
    applyUrlParamsToExperimentsFilters() {
        if (!this.urlParams || Object.keys(this.urlParams).length === 0) return

        // Map URL parameters to filter elements
        const paramMap = {
            'country': 'country-filter',
            'city': 'city-filter',
            'school': 'school-filter',
            'status': 'status-filter',
            'protocol': 'experiment-protocol-filter',
            'sensors': 'sensor-filter-btn'
        }

        // Apply each parameter
        Object.entries(paramMap).forEach(([urlParam, elementId]) => {
            const value = this.urlParams[urlParam]
            const element = document.getElementById(elementId)

            if (value && element) {
                if (elementId === 'sensor-filter-btn') {
                    if (value === 'true') {
                        element.setAttribute('data-active', 'true')
                        element.classList.add('active')
                        element.textContent = '📊 Avec capteurs uniquement'
                    }
                } else {
                    element.value = value
                }
            }
        })

        // Handle cluster filter
        const clusterValue = this.urlParams['cluster']
        if (clusterValue && clusterValue.trim() !== '') {
            this.activeProtocolFilter = clusterValue
        }

        // Apply filters after setting values
        setTimeout(() => {
            this.applyFilters()
            this.updateExperimentsLegendState()
        }, 100)

        // Clear URL params after applying
        this.urlParams = null
    }

    /**
     * Applique tous les filtres actifs
     */
    applyFilters() {
        const countryFilter = document.getElementById('country-filter')
        const cityFilter = document.getElementById('city-filter')
        const schoolFilter = document.getElementById('school-filter')
        const statusFilter = document.getElementById('status-filter')
        const protocolFilter = document.getElementById('experiment-protocol-filter')
        const startDateFilter = document.getElementById('start-date-filter')
        const endDateFilter = document.getElementById('end-date-filter')

        const selectedCountry = countryFilter ? countryFilter.value : ''
        const selectedCity = cityFilter ? cityFilter.value : ''
        const selectedSchool = schoolFilter ? schoolFilter.value : ''
        const selectedStatus = statusFilter ? statusFilter.value : ''
        const selectedProtocolName = protocolFilter ? protocolFilter.value : ''
        const selectedStartDate = startDateFilter ? startDateFilter.value : ''
        const selectedEndDate = endDateFilter ? endDateFilter.value : ''
        const selectedProtocolCategory = this.activeProtocolFilter

        let filteredExperiments = this.experiments

        // Apply country filter
        if (selectedCountry) {
            filteredExperiments = filteredExperiments.filter(exp =>
                this.getCountryFromCity(exp.city) === selectedCountry
            )
        }

        // Apply city filter
        if (selectedCity) {
            filteredExperiments = filteredExperiments.filter(exp => exp.city === selectedCity)
        }

        // Apply school filter
        if (selectedSchool) {
            filteredExperiments = filteredExperiments.filter(exp => exp.school === selectedSchool)
        }

        // Apply status filter
        if (selectedStatus) {
            filteredExperiments = filteredExperiments.filter(exp => exp.status === selectedStatus)
        }

        // Apply protocol name filter
        if (selectedProtocolName) {
            filteredExperiments = filteredExperiments.filter(exp => exp.protocol_name === selectedProtocolName)
        }

        // Apply protocol category filter (from legend)
        if (selectedProtocolCategory) {
            filteredExperiments = filteredExperiments.filter(exp => exp.protocol === selectedProtocolCategory)
        }

        // Apply date filters
        if (selectedStartDate) {
            filteredExperiments = filteredExperiments.filter(exp =>
                new Date(exp.start_date) >= new Date(selectedStartDate)
            )
        }

        if (selectedEndDate) {
            filteredExperiments = filteredExperiments.filter(exp =>
                new Date(exp.end_date) <= new Date(selectedEndDate)
            )
        }

        // Apply sensor filter
        const sensorFilterBtn = document.getElementById('sensor-filter-btn')
        const sensorFilterActive = sensorFilterBtn && sensorFilterBtn.getAttribute('data-active') === 'true'

        if (sensorFilterActive) {
            this.displayFilteredExperiments(filteredExperiments, true)
        } else {
            this.displayFilteredExperiments(filteredExperiments, false)
        }

        // Update search box display
        this.updateExperimentsFilterSearchBox()

        // Build query parameters object for URL
        const queryParams = {}
        if (selectedCountry && selectedCountry.trim() !== '') queryParams.country = selectedCountry
        if (selectedCity && selectedCity.trim() !== '') queryParams.city = selectedCity
        if (selectedSchool && selectedSchool.trim() !== '') queryParams.school = selectedSchool
        if (selectedStatus && selectedStatus.trim() !== '') queryParams.status = selectedStatus
        if (selectedProtocolName && selectedProtocolName.trim() !== '') queryParams.protocol = selectedProtocolName
        if (selectedStartDate) queryParams.start = selectedStartDate
        if (selectedEndDate) queryParams.end = selectedEndDate
        if (selectedProtocolCategory && selectedProtocolCategory.trim() !== '') queryParams.cluster = selectedProtocolCategory
        if (sensorFilterActive) queryParams.sensors = 'true'

        // Update URL with current filters
        this.updateUrl('experiments', null, queryParams)
    }

    /**
     * Affiche les expériences filtrées
     */
    async displayFilteredExperiments(experiments, sensorFilterActive = false) {
        const container = document.getElementById('experiments-list')
        if (!container) return

        container.innerHTML = ''

        // Get experiments with sensors
        const experimentsWithSensors = await this.getExperimentsWithSensors()

        experiments.forEach(experiment => {
            // If sensor filter is active, only show experiments with sensors
            if (sensorFilterActive && !experimentsWithSensors.includes(experiment.id)) {
                return
            }

            const card = document.createElement('div')
            const hasSensors = experimentsWithSensors.includes(experiment.id)
            card.className = `experiment-card ${experiment.protocol} ${hasSensors ? 'has-sensors' : ''}`

            const sensorIndicator = hasSensors ? '<span class="sensor-indicator" title="Données de capteurs disponibles">📊</span>' : ''

            card.innerHTML = `
                <h3>${experiment.title} ${sensorIndicator}</h3>
                <p>${experiment.description}</p>
                <div class="experiment-meta">
                    <span class="experiment-location">📍 ${experiment.city}</span>
                    <span class="experiment-school">🏫 ${experiment.school}</span>
                    <span class="protocol-badge ${experiment.protocol}" title="${getProtocolLabel(experiment.protocol)}">${getProtocolIcon(experiment.protocol)}</span>
                </div>
            `
            card.addEventListener('click', () => this.showExperimentDetail(experiment.id))
            container.appendChild(card)
        })

        // Update the count display
        const header = document.querySelector('#experiments-view .view-header h2')
        if (header) {
            const total = this.experiments.length
            const filtered = experiments.length
            header.textContent = filtered === total ?
                `Toutes les expériences (${total})` :
                `Expériences filtrées (${filtered}/${total})`
        }
    }

    /**
     * Met à jour la barre de recherche des filtres
     */
    updateExperimentsFilterSearchBox() {
        const filterInput = document.getElementById('experiments-filter-input')
        const filterCount = document.getElementById('experiments-filter-count')

        if (!filterInput || !filterCount) return

        // Count active filters
        let activeFilters = 0
        const filterDescriptions = []

        // Check cluster filters
        const activeClusters = this.getActiveClusters()
        if (activeClusters.length > 0 && activeClusters.length < Object.keys(this.protocolColors).length - 1) {
            activeFilters++
            filterDescriptions.push(`${activeClusters.length} cluster${activeClusters.length > 1 ? 's' : ''}`)
        }

        // Check sensor filter
        const sensorFilterBtn = document.getElementById('sensor-filter-btn')
        if (sensorFilterBtn && sensorFilterBtn.getAttribute('data-active') === 'true') {
            activeFilters++
            filterDescriptions.push('Avec capteurs')
        }

        // Check location filters
        const countryFilter = document.getElementById('country-filter')
        const cityFilter = document.getElementById('city-filter')
        const schoolFilter = document.getElementById('school-filter')
        const statusFilter = document.getElementById('status-filter')
        const protocolFilter = document.getElementById('experiment-protocol-filter')

        if (countryFilter?.value && countryFilter.value.trim() !== '') {
            activeFilters++
            filterDescriptions.push(countryFilter.options[countryFilter.selectedIndex].text)
        }
        if (cityFilter?.value && cityFilter.value.trim() !== '') {
            activeFilters++
            filterDescriptions.push(cityFilter.options[cityFilter.selectedIndex].text)
        }
        if (schoolFilter?.value && schoolFilter.value.trim() !== '') {
            activeFilters++
            filterDescriptions.push(schoolFilter.options[schoolFilter.selectedIndex].text)
        }
        if (statusFilter?.value && statusFilter.value.trim() !== '') {
            activeFilters++
            filterDescriptions.push(statusFilter.options[statusFilter.selectedIndex].text)
        }
        if (protocolFilter?.value && protocolFilter.value.trim() !== '') {
            activeFilters++
            filterDescriptions.push(protocolFilter.options[protocolFilter.selectedIndex].text)
        }

        // Check date filters
        const startDateFilter = document.getElementById('start-date-filter')
        const endDateFilter = document.getElementById('end-date-filter')

        if (startDateFilter?.value) {
            activeFilters++
            filterDescriptions.push(`Depuis ${startDateFilter.value}`)
        }
        if (endDateFilter?.value) {
            activeFilters++
            filterDescriptions.push(`Jusqu'à ${endDateFilter.value}`)
        }

        // Update filter count and input placeholder
        if (activeFilters > 0) {
            filterCount.style.display = 'block'
            filterCount.textContent = `${activeFilters} filtre${activeFilters > 1 ? 's' : ''} actif${activeFilters > 1 ? 's' : ''}`
            filterInput.placeholder = filterDescriptions.slice(0, 2).join(', ') + (filterDescriptions.length > 2 ? '...' : '')
        } else {
            filterCount.style.display = 'none'
            filterInput.placeholder = 'Rechercher ou filtrer les expériences...'
        }
    }

    /**
     * Retourne les clusters actifs
     */
    getActiveClusters() {
        const legendItems = document.querySelectorAll('.legend-item')
        const activeClusters = []

        legendItems.forEach(item => {
            if (!item.classList.contains('inactive')) {
                const protocolName = item.getAttribute('data-protocol')
                if (protocolName) {
                    activeClusters.push(protocolName)
                }
            }
        })

        return activeClusters
    }

    /**
     * Efface tous les filtres
     */
    clearAllFilters() {
        const countryFilter = document.getElementById('country-filter')
        const cityFilter = document.getElementById('city-filter')
        const schoolFilter = document.getElementById('school-filter')
        const statusFilter = document.getElementById('status-filter')
        const protocolFilter = document.getElementById('experiment-protocol-filter')
        const startDateFilter = document.getElementById('start-date-filter')
        const endDateFilter = document.getElementById('end-date-filter')

        [countryFilter, cityFilter, schoolFilter, statusFilter, protocolFilter, startDateFilter, endDateFilter].forEach(filter => {
            if (filter) filter.value = ''
        })

        // Reset sensor filter
        const sensorFilterBtn = document.getElementById('sensor-filter-btn')
        if (sensorFilterBtn) {
            sensorFilterBtn.setAttribute('data-active', 'false')
        }

        this.activeProtocolFilter = null
        this.updateExperimentsLegendState()
        this.applyFilters()
    }

    /**
     * Toggle le filtre de capteurs
     */
    toggleSensorFilter() {
        const sensorFilterBtn = document.getElementById('sensor-filter-btn')
        if (!sensorFilterBtn) return

        const isActive = sensorFilterBtn.getAttribute('data-active') === 'true'
        sensorFilterBtn.setAttribute('data-active', !isActive)

        this.applyFilters()
    }

    /**
     * Retourne le pays depuis une ville
     */
    getCountryFromCity(city) {
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
        }
        return cityToCountry[city] || 'Autre'
    }

    /**
     * Retourne le label d'un statut
     */
    getStatusLabel(status) {
        const statusLabels = {
            'active': 'Actif',
            'planned': 'Planifié',
            'ongoing': 'En cours',
            'finished': 'Terminé',
            'archived': 'Archivée',
            'pending': 'En attente',
            'cancelled': 'Annulé'
        }
        return statusLabels[status] || status
    }

    /**
     * Configure les contrôles de filtrage temporel
     */
    setupTimeFilterControls(experimentId, chartsContainer) {
        setTimeout(() => {
            const timeFilterButtons = document.querySelectorAll('.time-filter-btn')
            console.log('Setting up time filter controls, found buttons:', timeFilterButtons.length)

            // Get period from URL or use default
            const urlPeriod = this.urlParams?.period || '24h'

            timeFilterButtons.forEach(button => {
                // Remove existing listeners to avoid duplicates
                button.removeEventListener('click', button.timeFilterHandler)

                // Create new handler
                button.timeFilterHandler = async (e) => {
                    console.log('Time filter clicked:', e.target.dataset.period)

                    // Remove active class from all buttons
                    timeFilterButtons.forEach(btn => btn.classList.remove('active'))

                    // Add active class to clicked button
                    e.target.classList.add('active')

                    // Get selected period
                    const period = e.target.dataset.period

                    // Update URL with period parameter
                    const queryParams = {}
                    if (period !== '24h') {
                        queryParams.period = period
                    }
                    this.updateUrl('experiments', experimentId, queryParams)

                    // Update chart with new period
                    await this.createExperimentChart(experimentId, chartsContainer, period)
                }

                button.addEventListener('click', button.timeFilterHandler)
            })

            // Set active button based on URL parameter
            const activeButton = document.querySelector(`.time-filter-btn[data-period="${urlPeriod}"]`)
            if (activeButton) {
                timeFilterButtons.forEach(btn => btn.classList.remove('active'))
                activeButton.classList.add('active')
            } else {
                const defaultButton = document.querySelector('.time-filter-btn[data-period="24h"]')
                if (defaultButton) {
                    timeFilterButtons.forEach(btn => btn.classList.remove('active'))
                    defaultButton.classList.add('active')
                }
            }

            // Update chart with period from URL if it's not the default
            if (urlPeriod !== '24h') {
                this.createExperimentChart(experimentId, chartsContainer, urlPeriod)
            }

            // Setup "Vue détaillée" button
            const openDataBtn = document.getElementById('open-in-data-view')
            if (openDataBtn) {
                openDataBtn.addEventListener('click', () => {
                    this.routerManager.navigate('data', experimentId)
                })
            }
        }, 100)
    }

    /**
     * Applique la couleur du cluster aux sections
     */
    applyClusterColorToSections(clusterColor) {
        const titleHeader = document.querySelector('.title-header')
        const sensorsSection = document.querySelector('.sensors-section h3')
        const chartsSection = document.querySelector('.charts-section h3')

        if (titleHeader) {
            titleHeader.style.borderBottomColor = clusterColor
        }
        if (sensorsSection) {
            sensorsSection.style.borderBottomColor = clusterColor
        }
        if (chartsSection) {
            chartsSection.style.borderBottomColor = clusterColor
        }
    }

    /**
     * Bind les événements des filtres de données
     */
    bindDataFilterEvents() {
        // Prevent binding multiple times
        if (this._dataFilterEventsBound) {
            return
        }
        this._dataFilterEventsBound = true

        // Basic filters
        const experimentSelect = document.getElementById('experiment-select')
        const sensorTypeSelect = document.getElementById('sensor-type-select')

        // Advanced filters
        const periodSelect = document.getElementById('data-period-select')
        const startDateInput = document.getElementById('data-start-date')
        const endDateInput = document.getElementById('data-end-date')
        const minQualitySelect = document.getElementById('data-min-quality')
        const limitSelect = document.getElementById('data-limit')

        // Synchronize experiment selector with selectedExperimentForData
        if (experimentSelect && this.selectedExperimentForData) {
            experimentSelect.value = this.selectedExperimentForData
        }

        // Buttons
        const applyFiltersBtn = document.getElementById('data-apply-filters-btn')
        const clearFiltersBtn = document.getElementById('data-clear-filters-btn')
        const filterSearchBox = document.getElementById('data-filter-search-box')

        // Auto-apply basic filters
        if (sensorTypeSelect) {
            sensorTypeSelect.addEventListener('change', () => this.applyDataFilters())
        }

        // Special handling for experiment select to update sensor types
        if (experimentSelect) {
            experimentSelect.addEventListener('change', async () => {
                await this.updateDataSensorTypes()
                this.applyDataFilters()
            })
        }

        // View experiment details button
        const viewDetailsBtn = document.getElementById('view-experiment-details')
        if (viewDetailsBtn && experimentSelect) {
            const updateDetailsButton = () => {
                viewDetailsBtn.disabled = !experimentSelect.value
            }

            experimentSelect.addEventListener('change', updateDetailsButton)
            updateDetailsButton() // Initial state

            // Handle button click
            viewDetailsBtn.addEventListener('click', () => {
                const experimentId = experimentSelect.value
                if (experimentId) {
                    this.showExperimentDetail(experimentId)
                }
            })
        }

        // Manual apply for advanced filters
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyDataFilters())
        }

        // Clear filters button
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearDataFilters())
        }

        // Filter search box click to expand filters
        if (filterSearchBox) {
            filterSearchBox.addEventListener('click', () => {
                const additionalFilters = document.getElementById('data-additional-filters')
                if (additionalFilters) {
                    const isVisible = additionalFilters.style.display !== 'none'
                    additionalFilters.style.display = isVisible ? 'none' : 'block'
                    this.updateFilterSearchBox()
                }
            })
        }

        console.log('✅ Data filter events bound')
    }

    /**
     * Applique les filtres de données
     */
    applyDataFilters() {
        const experimentId = document.getElementById('experiment-select')?.value
        const sensorTypeId = document.getElementById('sensor-type-select')?.value
        const period = document.getElementById('data-period-select')?.value || 'all'
        const startDate = document.getElementById('data-start-date')?.value
        const endDate = document.getElementById('data-end-date')?.value
        const minQuality = document.getElementById('data-min-quality')?.value
        const limit = document.getElementById('data-limit')?.value || ''

        if (experimentId && experimentId !== this.selectedExperimentForData) {
            this.selectedExperimentForData = experimentId
        }

        const queryParams = {}
        if (sensorTypeId && sensorTypeId.trim() !== '') queryParams.sensor = sensorTypeId
        if (period && period !== 'all') queryParams.period = period
        if (startDate && startDate.trim() !== '') queryParams.start = startDate
        if (endDate && endDate.trim() !== '') queryParams.end = endDate
        if (minQuality && minQuality.trim() !== '') queryParams.quality = minQuality
        if (limit && limit.trim() !== '') queryParams.limit = limit

        this.routerManager.updateUrl('data', this.selectedExperimentForData, queryParams)
        this.updateFilterSearchBox()
        this.loadFilteredChartData(experimentId, sensorTypeId, period, startDate, endDate, minQuality, limit)
    }

    /**
     * Applique les filtres de données tout en préservant l'URL
     */
    applyDataFiltersPreservingUrl() {
        const experimentId = document.getElementById('experiment-select')?.value
        const sensorTypeId = document.getElementById('sensor-type-select')?.value
        const period = document.getElementById('data-period-select')?.value || 'all'
        const startDate = document.getElementById('data-start-date')?.value
        const endDate = document.getElementById('data-end-date')?.value
        const minQuality = document.getElementById('data-min-quality')?.value
        const limit = document.getElementById('data-limit')?.value || ''

        if (experimentId && experimentId !== this.selectedExperimentForData) {
            this.selectedExperimentForData = experimentId
        }

        this.updateFilterSearchBox()
        this.loadFilteredChartData(experimentId, sensorTypeId, period, startDate, endDate, minQuality, limit)
    }

    /**
     * Efface tous les filtres de données
     */
    clearDataFilters() {
        // Clear basic filters
        const experimentSelect = document.getElementById('experiment-select')
        const sensorTypeSelect = document.getElementById('sensor-type-select')

        // Reset experiment selector - keep first option
        if (experimentSelect && experimentSelect.options.length > 0) {
            experimentSelect.selectedIndex = 0
        }

        // Reset sensor type selector
        if (sensorTypeSelect && sensorTypeSelect.options.length > 0) {
            sensorTypeSelect.selectedIndex = 0
        }

        // Clear advanced filters
        const periodSelect = document.getElementById('data-period-select')
        if (periodSelect) periodSelect.value = 'all'

        const startDateInput = document.getElementById('data-start-date')
        if (startDateInput) startDateInput.value = ''

        const endDateInput = document.getElementById('data-end-date')
        if (endDateInput) endDateInput.value = ''

        const minQualitySelect = document.getElementById('data-min-quality')
        if (minQualitySelect) minQualitySelect.value = ''

        const limitSelect = document.getElementById('data-limit')
        if (limitSelect) limitSelect.value = ''

        // Update and apply filters
        this.applyDataFilters()
    }

    /**
     * Met à jour les types de capteurs pour l'expérience sélectionnée
     */
    async updateDataSensorTypes() {
        const experimentSelect = document.getElementById('experiment-select')
        const sensorTypeSelect = document.getElementById('sensor-type-select')

        if (!experimentSelect || !sensorTypeSelect) return

        const selectedExperiment = experimentSelect.value

        // Clear existing sensor type options (keep first "Tous les types" option)
        while (sensorTypeSelect.children.length > 1) {
            sensorTypeSelect.removeChild(sensorTypeSelect.lastChild)
        }

        if (!selectedExperiment) return

        try {
            // Fetch measurements for this experiment to get sensor types with data
            const response = await fetch(`/api/sensors/measurements?experimentId=${selectedExperiment}`)
            const data = await response.json()

            if (data.success && data.data) {
                // Get unique sensor types from measurements
                const uniqueTypes = [...new Set(data.data.map(m =>
                    m.sensor_type_id || m.sensorType
                ).filter(Boolean))]

                // Sort and populate dropdown with labels
                uniqueTypes.sort().forEach(type => {
                    const option = document.createElement('option')
                    option.value = type

                    // Find the sensor type object to get the label
                    const sensorTypeObj = this.sensorTypes.find(st => st.id === type)
                    option.textContent = sensorTypeObj ? `${sensorTypeObj.icon} ${sensorTypeObj.name}` : type

                    sensorTypeSelect.appendChild(option)
                })
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des types de capteurs:', error)
        }
    }

    /**
     * Met à jour le filtre de recherche pour les données
     */
    updateFilterSearchBox() {
        const filterInput = document.getElementById('data-filter-input')
        const filterCount = document.getElementById('data-filter-count')

        if (!filterInput || !filterCount) return

        // Count active filters
        let activeFilters = 0
        const filterDescriptions = []

        // Check each filter
        const experimentSelect = document.getElementById('experiment-select')
        if (experimentSelect?.value && experimentSelect.value.trim() !== '') {
            activeFilters++
            const selectedOption = experimentSelect.options[experimentSelect.selectedIndex]
            if (selectedOption) {
                filterDescriptions.push(selectedOption.text)
            }
        }

        const sensorTypeSelect = document.getElementById('sensor-type-select')
        if (sensorTypeSelect?.value && sensorTypeSelect.value.trim() !== '') {
            activeFilters++
            filterDescriptions.push(sensorTypeSelect.value)
        }

        const periodSelect = document.getElementById('data-period-select')
        if (periodSelect?.value && periodSelect.value !== 'all') {
            activeFilters++
            const selectedOption = periodSelect.options[periodSelect.selectedIndex]
            filterDescriptions.push(selectedOption ? selectedOption.text : periodSelect.value)
        }

        const startDate = document.getElementById('data-start-date')?.value
        if (startDate && startDate.trim() !== '') {
            activeFilters++
            filterDescriptions.push(`Début: ${startDate}`)
        }

        const endDate = document.getElementById('data-end-date')?.value
        if (endDate && endDate.trim() !== '') {
            activeFilters++
            filterDescriptions.push(`Fin: ${endDate}`)
        }

        const minQuality = document.getElementById('data-min-quality')?.value
        if (minQuality && minQuality.trim() !== '') {
            activeFilters++
            filterDescriptions.push(`Qualité: ${minQuality}`)
        }

        const limit = document.getElementById('data-limit')?.value
        if (limit && limit.trim() !== '') {
            activeFilters++
            filterDescriptions.push(`Limite: ${limit}`)
        }

        // Update display
        if (activeFilters > 0) {
            filterCount.style.display = 'block'
            filterCount.textContent = `${activeFilters} filtre${activeFilters > 1 ? 's' : ''} actif${activeFilters > 1 ? 's' : ''}`
            filterInput.placeholder = filterDescriptions.join(' • ')
        } else {
            filterCount.style.display = 'none'
            filterInput.placeholder = 'Cliquez pour filtrer les données...'
        }
    }

    /**
     * Charge les données filtrées et affiche le graphique
     */
    async loadFilteredChartData(experimentId, sensorTypeId, period, startDate, endDate, minQuality, limit) {
        const chartContainer = document.getElementById('chart-container')
        if (!chartContainer) return

        try {
            // Build API URL with filters
            let apiUrl = `/api/sensors/measurements?`
            const params = new URLSearchParams()

            if (experimentId) params.append('experimentId', experimentId)
            if (period && period !== 'all') params.append('period', period)
            if (startDate) params.append('startDate', startDate)
            if (endDate) params.append('endDate', endDate)
            if (minQuality) params.append('minQuality', minQuality)
            if (limit) params.append('limit', limit)

            apiUrl += params.toString()

            // Fetch measurements
            const measurementsResponse = await fetch(apiUrl)
            const measurementsData = await measurementsResponse.json()

            if (!measurementsData.success) {
                throw new Error(measurementsData.message || 'Erreur lors de la récupération des données')
            }

            // Filter by sensor type if specified
            let filteredMeasurements = measurementsData.data || []
            if (sensorTypeId && sensorTypeId.trim() !== '') {
                filteredMeasurements = filteredMeasurements.filter(m =>
                    (m.sensor_type_id || m.sensorType) === sensorTypeId
                )
            }

            // Create sensor types map for the chart (id -> {id, name, icon, unit})
            const sensorTypesMap = {}
            this.sensorTypes.forEach(st => {
                sensorTypesMap[st.id] = {
                    name: st.name,
                    icon: st.icon,
                    unit: st.unit
                }
            })

            // Create the chart
            if (filteredMeasurements.length > 0) {
                // Ensure canvas exists
                let canvas = document.getElementById('dataChart')
                if (!canvas) {
                    chartContainer.innerHTML = '<canvas id="dataChart"></canvas>'
                    canvas = document.getElementById('dataChart')
                }

                this.dataVizManager.createMainChart(filteredMeasurements, sensorTypesMap)
                await this.dataVizManager.calculateAndDisplayStats(filteredMeasurements)
            } else {
                chartContainer.innerHTML = '<div class="no-data">Aucune donnée disponible pour les filtres sélectionnés</div>'
            }

        } catch (error) {
            console.error('Erreur lors du chargement des données:', error)
            chartContainer.innerHTML = `<div class="error">Erreur: ${error.message}</div>`
        }
    }

    /**
     * Calcule et affiche les statistiques des mesures
     */
    calculateAndDisplayStats(measurements) {
        const statsContainer = document.getElementById('data-stats')
        if (!statsContainer || !measurements || measurements.length === 0) return

        const totalMeasurements = measurements.length
        const uniqueSensors = new Set(measurements.map(m => m.sensor_id || m.sensorId)).size
        const uniqueTypes = new Set(measurements.map(m => m.sensor_type_id || m.sensorType)).size

        // Calculate date range
        const timestamps = measurements.map(m => new Date(m.timestamp || m.date)).filter(d => !isNaN(d))
        const minDate = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null
        const maxDate = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null

        let dateRangeText = 'N/A'
        if (minDate && maxDate) {
            dateRangeText = `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`
        }

        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Mesures:</span>
                <span class="stat-value">${totalMeasurements.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Capteurs:</span>
                <span class="stat-value">${uniqueSensors}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Types:</span>
                <span class="stat-value">${uniqueTypes}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Période:</span>
                <span class="stat-value">${dateRangeText}</span>
            </div>
        `
    }

    // ============================================
    // Utility Methods
    // ============================================

    /**
     * Retourne le label d'un protocole
     */
    getProtocolLabel(protocol) {
        return getProtocolLabel(protocol)
    }

    /**
     * Retourne l'icône d'un protocole
     */
    getProtocolIcon(protocol) {
        return getProtocolIcon(protocol)
    }
}
