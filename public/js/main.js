/**
 * Point d'entrée hybride - utilise AuthManager + ApiService + MapManager + DataVisualizationManager + ExperimentsManager + SensorsManager + script.js original
 * Cette approche permet de tester l'intégration en toute sécurité
 */
import { AuthManager } from './auth-manager.js'
import { ApiService } from './api-service.js'
import { MapManager } from './map-manager.js'
import { DataVisualizationManager } from './data-visualization-manager.js'
import { ExperimentsManager } from './experiments-manager.js'
import { SensorsManager } from './sensors-manager.js'

// Variables globales pour l'intégration
window.authManager = null
window.apiService = null
window.mapManager = null
window.dataVizManager = null
window.experimentsManager = null
window.sensorsManager = null
window.originalSteamCity = null

// Activer le mode patching pour empêcher script.js d'instancier automatiquement
window.__STEAMCITY_PATCHING_MODE__ = true

// Fonction pour modifier la classe SteamCityPlatform existante
function patchSteamCityWithAuthManager() {
    // Attendre que script.js soit chargé
    const checkOriginalClass = setInterval(() => {
        if (window.SteamCityPlatform) {
            clearInterval(checkOriginalClass)

            // Sauvegarder l'instance originale
            const OriginalClass = window.SteamCityPlatform

            // Créer une version patchée
            class PatchedSteamCityPlatform extends OriginalClass {
                constructor() {
                    // Appeler super() - init() sera appelé mais ne fera rien car authManager n'existe pas encore
                    super()

                    // Créer AuthManager, ApiService, MapManager, DataVisualizationManager et ExperimentsManager APRÈS l'appel à super()
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
                        getProtocolLabel: (p) => this.getProtocolLabel(p),
                        getProtocolIcon: (p) => this.getProtocolIcon(p),
                        onExperimentClick: (id) => this.showExperimentDetail(id),
                        apiService: this.apiService
                    })
                    this.sensorsManager = new SensorsManager({
                        apiService: this.apiService,
                        dataVizManager: this.dataVizManager,
                        protocolColors: this.protocolColors,
                        getProtocolLabel: (p) => this.getProtocolLabel(p),
                        experiments: this.experiments,
                        updateUrl: (params) => this.updateUrl(params),
                        showView: (view) => this.showView(view),
                        showExperimentDetail: (id) => this.showExperimentDetail(id),
                        urlParams: this.urlParams
                    })

                    // Override des méthodes d'authentification
                    this.overrideAuthMethods()

                    // Override des méthodes API
                    this.overrideApiMethods()

                    // Override des méthodes de carte
                    this.overrideMapMethods()

                    // Override des méthodes de visualisation
                    this.overrideDataVizMethods()

                    // Override des méthodes d'expériences
                    this.overrideExperimentsMethods()

                    // Override des méthodes de capteurs
                    this.overrideSensorsMethods()

                    console.log('✅ AuthManager, ApiService, MapManager, DataVisualizationManager, ExperimentsManager et SensorsManager intégrés avec succès')

                    // Maintenant appeler init() avec tous les managers disponibles
                    this.init()
                }

                overrideAuthMethods() {
                    // Override checkAuthenticationState
                    this.checkAuthenticationState = () => {
                        this.isAuthenticated = this.authManager.getAuthState()
                    }

                    // Override showLoginModal
                    this.showLoginModal = () => {
                        this.authManager.showLoginModal()
                    }

                    // Override hideLoginModal
                    this.hideLoginModal = () => {
                        this.authManager.hideLoginModal()
                    }

                    // Override handleLogin
                    this.handleLogin = async (e) => {
                        const result = await this.authManager.handleLogin(e)
                        if (result) {
                            // Connexion réussie - continuer avec l'ancien flux
                            await this.showMainApp()
                        }
                        return result
                    }

                    // Override handleLogout
                    this.handleLogout = () => {
                        this.authManager.handleLogout()
                        // Le rechargement est géré par AuthManager
                    }

                    // Écouter les événements d'AuthManager
                    window.addEventListener('auth:loginSuccess', async () => {
                        this.isAuthenticated = true
                        await this.showMainApp()
                    })

                    window.addEventListener('auth:logout', () => {
                        this.isAuthenticated = false
                        // Le rechargement est géré par AuthManager
                    })
                }

                overrideApiMethods() {
                    // Intercepter les appels fetch et les rediriger vers ApiService
                    // Cela permet d'utiliser ApiService de manière transparente

                    // Sauvegarder le fetch original si nécessaire pour d'autres cas
                    this._originalFetch = window.fetch.bind(window)

                    console.log('✅ ApiService prêt à être utilisé (méthodes disponibles)')
                }

                overrideMapMethods() {
                    // Override initializeMap pour utiliser MapManager
                    const originalInitializeMap = this.initializeMap.bind(this)
                    this.initializeMap = async () => {
                        if (this.map) return

                        try {
                            await this.mapManager.initialize()
                            this.map = this.mapManager.getMapInstance()

                            // Charger les marqueurs et créer la légende
                            await this.loadMapMarkers()
                            this.createMapLegend()

                            console.log('✅ Carte initialisée via MapManager')
                        } catch (error) {
                            console.error('❌ Erreur lors de l\'initialisation de la carte:', error)
                        }
                    }

                    // Override loadMapMarkers pour utiliser MapManager
                    this.loadMapMarkers = async () => {
                        if (!this.experiments.length) {
                            await this.loadInitialData()
                        }

                        this.mapManager.addMarkers(this.experiments, {
                            fitBounds: true,
                            getProtocolLabel: (p) => this.getProtocolLabel(p)
                        })
                        this.markers = this.mapManager.getMarkers()
                    }

                    // Override clearMarkers pour utiliser MapManager
                    this.clearMarkers = () => {
                        this.mapManager.clearMarkers()
                        this.markers = []
                    }

                    // Override centerMapOnVisibleMarkers
                    this.centerMapOnVisibleMarkers = () => {
                        this.mapManager.centerOnVisibleMarkers()
                    }

                    // Override filterByProtocol pour utiliser MapManager
                    this.filterByProtocol = (protocol) => {
                        this.mapManager.filterByProtocol(
                            protocol || null,
                            this.experiments,
                            { getProtocolLabel: (p) => this.getProtocolLabel(p) }
                        )
                        this.markers = this.mapManager.getMarkers()
                    }

                    // Override filterByLegend
                    this.filterByLegend = (protocolKey) => {
                        this.activeProtocolFilter = protocolKey
                        this.mapManager.filterByProtocol(
                            protocolKey,
                            this.experiments,
                            { getProtocolLabel: (p) => this.getProtocolLabel(p) }
                        )
                        this.markers = this.mapManager.getMarkers()

                        // Update dropdown filter to match
                        const protocolFilter = document.getElementById('protocol-filter')
                        if (protocolFilter) {
                            protocolFilter.value = protocolKey || ''
                        }
                    }

                    // Override createMapLegend
                    this.createMapLegend = () => {
                        const protocols = [
                            { key: 'environmental', label: `🌱 ${this.getProtocolLabel('environmental')}` },
                            { key: 'energy', label: `⚡ ${this.getProtocolLabel('energy')}` },
                            { key: 'mobility', label: `🚗 ${this.getProtocolLabel('mobility')}` },
                            { key: 'governance', label: `🏛️ ${this.getProtocolLabel('governance')}` },
                            { key: 'technology', label: `💻 ${this.getProtocolLabel('technology')}` }
                        ]

                        this.mapManager.createLegend(protocols, (p) => this.getProtocolLabel(p))
                        this.mapManager.bindLegendEvents((protocolKey) => {
                            this.filterByLegend(protocolKey)
                        })
                    }

                    // Override updateLegendState
                    this.updateLegendState = () => {
                        this.mapManager.updateLegendState()
                    }

                    console.log('✅ Méthodes de carte override pour utiliser MapManager')
                }

                overrideDataVizMethods() {
                    // Override createExperimentChart
                    this.createExperimentChart = async (experimentId, container, period = '24h') => {
                        await this.dataVizManager.createExperimentChart(experimentId, container, period)
                    }

                    // Override createMainChart
                    this.createMainChart = (measurements, sensorTypesMap) => {
                        this.chart = this.dataVizManager.createMainChart(measurements, sensorTypesMap)
                    }

                    // Override calculateAndDisplayStats
                    this.calculateAndDisplayStats = async (measurements) => {
                        await this.dataVizManager.calculateAndDisplayStats(measurements)
                    }

                    // Override clearDataDisplay
                    this.clearDataDisplay = () => {
                        this.dataVizManager.clearDataDisplay()
                    }

                    // Override getTimeUnit
                    this.getTimeUnit = (period) => {
                        return this.dataVizManager.getTimeUnit(period)
                    }

                    // Override getPeriodLabel
                    this.getPeriodLabel = (period) => {
                        return this.dataVizManager.getPeriodLabel(period)
                    }

                    // Override calculateMedian
                    this.calculateMedian = (sortedValues) => {
                        return this.dataVizManager.calculateMedian(sortedValues)
                    }

                    console.log('✅ Méthodes de visualisation override pour utiliser DataVisualizationManager')
                }

                overrideExperimentsMethods() {
                    // Override loadExperimentsList
                    this.loadExperimentsList = async () => {
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

                        // Setup additional bindings that experimentsManager doesn't handle
                        this.populateFilterDropdowns()
                        this.bindFilterEvents()
                        this.bindToggleEvents()
                        this.bindExperimentsFilterSearch()
                        this.applyUrlParamsToExperimentsFilters()
                    }

                    // Override filterExperiments
                    this.filterExperiments = async (protocol) => {
                        this.experimentsManager.setExperiments(this.experiments)
                        await this.experimentsManager.filterExperiments(protocol)
                    }

                    // Override getExperimentsWithSensors
                    this.getExperimentsWithSensors = async () => {
                        return await this.experimentsManager.getExperimentsWithSensors()
                    }

                    // Override createExperimentsLegend
                    this.createExperimentsLegend = () => {
                        this.experimentsManager.setExperiments(this.experiments)
                        this.experimentsManager.createExperimentsLegend()
                    }

                    // Override filterExperimentsByLegend
                    this.filterExperimentsByLegend = async (protocolKey) => {
                        this.experimentsManager.setExperiments(this.experiments)
                        await this.experimentsManager.filterExperimentsByLegend(protocolKey)

                        // Apply all filters (for complex filtering with dropdowns)
                        this.applyFilters()
                    }

                    // Override updateExperimentsLegendState
                    this.updateExperimentsLegendState = () => {
                        this.experimentsManager.updateExperimentsLegendState()
                    }

                    // Override loadExperimentDetails
                    const originalLoadExperimentDetails = this.loadExperimentDetails.bind(this)
                    this.loadExperimentDetails = async (experiment) => {
                        this.experimentsManager.setExperiments(this.experiments)

                        await this.experimentsManager.loadExperimentDetails(experiment, {
                            onChartCreate: async (experimentId, container) => {
                                await this.createExperimentChart(experimentId, container)
                                this.setupTimeFilterControls(experimentId, container)
                            },
                            applyClusterColor: (color) => {
                                this.applyClusterColorToSections(color)
                            },
                            onSensorClick: (sensorId) => {
                                this.showSensorDetails(sensorId)
                            }
                        })
                    }

                    console.log('✅ Méthodes d\'expériences override pour utiliser ExperimentsManager')
                }

                overrideSensorsMethods() {
                    // Override loadSensorsView
                    this.loadSensorsView = async () => {
                        this.sensorsManager.experiments = this.experiments
                        this.sensorsManager.urlParams = this.urlParams
                        await this.sensorsManager.loadSensorsView()
                    }

                    // Override applySensorsFilters
                    this.applySensorsFilters = () => {
                        this.sensorsManager.experiments = this.experiments
                        this.sensorsManager.urlParams = this.urlParams
                        this.sensorsManager.applySensorsFilters()
                    }

                    // Override displaySensors
                    this.displaySensors = (sensors) => {
                        this.sensorsManager.experiments = this.experiments
                        this.sensorsManager.displaySensors(sensors)
                    }

                    // Override showSensorDetails
                    this.showSensorDetails = async (sensorId, updateUrl = true) => {
                        this.sensorsManager.experiments = this.experiments
                        this.sensorsManager.urlParams = this.urlParams
                        await this.sensorsManager.showSensorDetails(sensorId, updateUrl)
                    }

                    // Override loadSensorChart
                    this.loadSensorChart = async (sensorId, period = '24h') => {
                        await this.sensorsManager.loadSensorChart(sensorId, period)
                    }

                    // Override getSensorById
                    this.getSensorById = (sensorId) => {
                        return this.sensorsManager.getSensorById(sensorId)
                    }

                    console.log('✅ Méthodes de capteurs override pour utiliser SensorsManager')
                }

                // Override bindEvents pour ne pas re-binder les événements auth
                bindEvents() {
                    // Appeler la méthode parent mais sans les événements auth
                    // (AuthManager gère déjà ces événements)

                    // Navigation events
                    const mapTab = document.getElementById('map-tab')
                    const experimentsTab = document.getElementById('experiments-tab')
                    const dataTab = document.getElementById('data-tab')
                    const sensorsTab = document.getElementById('sensors-tab')

                    mapTab?.addEventListener('click', () => this.showView('map'))
                    experimentsTab?.addEventListener('click', () => this.showView('experiments'))
                    dataTab?.addEventListener('click', () => this.showView('data'))
                    sensorsTab?.addEventListener('click', () => this.showView('sensors'))

                    // Protocol filters
                    document.getElementById('protocol-filter')?.addEventListener('change', (e) => this.filterByProtocol(e.target.value))

                    // Window events
                    window.addEventListener('hashchange', () => this.handleRoute(false))
                    window.addEventListener('popstate', () => this.handleRoute(false))

                    console.log('✅ Événements bindés (auth délégué à AuthManager)')
                }

                // Override init pour utiliser AuthManager
                async init() {
                    // Si authManager n'est pas encore initialisé, ne rien faire
                    // (cela arrive lors du super() avant qu'on ait créé authManager)
                    if (!this.authManager) {
                        return
                    }

                    // AuthManager gère déjà son état - pas besoin d'appeler checkAuthenticationState
                    this.isAuthenticated = this.authManager.getAuthState()

                    this.bindEvents()
                    await this.showHomepage()
                }
            }

            // Remplacer la classe globale
            window.SteamCityPlatform = PatchedSteamCityPlatform

            // Créer une nouvelle instance
            window.steamcity = new PatchedSteamCityPlatform()

            // Exposer les managers globalement
            window.apiService = window.steamcity.apiService
            window.authManager = window.steamcity.authManager
            window.mapManager = window.steamcity.mapManager
            window.dataVizManager = window.steamcity.dataVizManager
            window.experimentsManager = window.steamcity.experimentsManager
            window.sensorsManager = window.steamcity.sensorsManager

            console.log('🚀 Application SteamCity démarrée avec tous les managers')
            console.log('📦 Modules chargés:', {
                authManager: !!window.authManager,
                apiService: !!window.apiService,
                mapManager: !!window.mapManager,
                dataVizManager: !!window.dataVizManager,
                experimentsManager: !!window.experimentsManager,
                sensorsManager: !!window.sensorsManager,
                steamcity: !!window.steamcity
            })

            // Afficher un indicateur visuel temporaire pour debug
            const debugDiv = document.createElement('div')
            debugDiv.id = 'module-debug'
            debugDiv.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: #27ae60; color: white; padding: 10px; border-radius: 5px; font-size: 12px; z-index: 10000;'
            debugDiv.innerHTML = '✅ Tous les managers chargés'
            document.body.appendChild(debugDiv)
            setTimeout(() => debugDiv.remove(), 3000)
        }
    }, 100)
}

// Charger script.js puis appliquer le patch
const script = document.createElement('script')
script.src = 'script.js'
script.onload = () => {
    patchSteamCityWithAuthManager()
}
script.onerror = (error) => {
    console.error('❌ Erreur lors du chargement de script.js:', error)
}
document.head.appendChild(script)

// Export pour les tests
export { patchSteamCityWithAuthManager }