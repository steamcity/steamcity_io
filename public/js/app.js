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
            },
            onInitializeData: async (experimentId) => {
                await this.loadChartData(experimentId)
                this.bindDataFilterEvents()
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
        const homepage = document.getElementById('homepage')
        const mainApp = document.getElementById('main-app')

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
        const homepage = document.getElementById('homepage')
        const mainApp = document.getElementById('main-app')

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
            // Load experiments
            this.experiments = await this.apiService.fetchExperiments()
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
            await this.calculateAndDisplayStats(measurementsData)

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

        [countryFilter, cityFilter, schoolFilter, statusFilter, protocolFilter, startDateFilter, endDateFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => this.applyFilters())
            }
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
            experimentSelect.addEventListener('change', () => {
                this.updateDataSensorTypes()
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

        console.log('✅ Data filter events bound')
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
