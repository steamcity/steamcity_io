/**
 * Point d'entrée hybride - utilise AuthManager + ApiService + MapManager + DataVisualizationManager + ExperimentsManager + SensorsManager + RouterManager + script.js original
 * Cette approche permet de tester l'intégration en toute sécurité
 */
import { AuthManager } from './auth-manager.js'
import { ApiService } from './api-service.js'
import { MapManager } from './map-manager.js'
import { DataVisualizationManager } from './data-visualization-manager.js'
import { ExperimentsManager } from './experiments-manager.js'
import { SensorsManager } from './sensors-manager.js'
import { RouterManager } from './router-manager.js'
import { ViewManager } from './view-manager.js'

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
                    // Create ViewManager to coordinate view switching
                    this.viewManager = new ViewManager({
                        mapManager: this.mapManager,
                        experimentsManager: this.experimentsManager,
                        sensorsManager: null, // Will be set after SensorsManager creation
                        dataVisualizationManager: this.dataVizManager,
                        onViewChange: (viewName, updateUrl) => {
                            // ViewManager handles the display, we just need to update URL if needed
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

                    this.sensorsManager = new SensorsManager({
                        apiService: this.apiService,
                        dataVizManager: this.dataVizManager,
                        protocolColors: this.protocolColors,
                        getProtocolLabel: (p) => this.getProtocolLabel(p),
                        experiments: this.experiments,
                        updateUrl: (view, id, queryParams) => this.updateUrl(view, id, queryParams),
                        showView: (view) => this.viewManager.showView(view, { updateUrl: false }),
                        showExperimentDetail: (id) => this.showExperimentDetail(id),
                        navigateToDataView: (experimentId) => this.routerManager.navigate('data', experimentId),
                        urlParams: this.urlParams
                    })

                    // Update ViewManager with SensorsManager after creation
                    this.viewManager.sensorsManager = this.sensorsManager

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

                    // Override des méthodes de routing
                    this.overrideRoutingMethods()

                    console.log('✅ AuthManager, ApiService, MapManager, DataVisualizationManager, ExperimentsManager, SensorsManager et RouterManager intégrés avec succès')

                    // Maintenant appeler init() avec tous les managers disponibles
                    this.init()
                }

                // updateActiveNavButton is now handled by ViewManager

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

                    // Override loadExperimentChart (for data view)
                    this.loadExperimentChart = async (experimentId) => {
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

                            // Create custom legend after a small delay to ensure chart is ready
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
                            },
                            onBackToList: () => {
                                // Navigate back to experiments list
                                this.routerManager.navigate('experiments')
                            }
                        })
                    }

                    // Override showExperimentDetail
                    this.showExperimentDetail = async (experimentId, updateUrl = true) => {
                        if (updateUrl) {
                            // Navigate via RouterManager pour mettre à jour l'URL
                            this.routerManager.navigate('experiments', experimentId)
                        } else {
                            // Afficher directement sans mettre à jour l'URL via ViewManager
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
                        if (updateUrl) {
                            // Navigate via RouterManager pour mettre à jour l'URL
                            this.routerManager.navigate('sensors', sensorId)
                        } else {
                            // Afficher directement sans mettre à jour l'URL via ViewManager
                            this.sensorsManager.experiments = this.experiments
                            this.sensorsManager.urlParams = this.urlParams
                            await this.viewManager.showSensorDetail(sensorId)
                        }
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

                overrideRoutingMethods() {
                    // Override updateUrl
                    this.updateUrl = (view, id = null, queryParams = null) => {
                        this.routerManager.updateUrl(view, id, queryParams)
                    }

                    // Override handleRoute
                    this.handleRoute = (updateUrl = true) => {
                        // Store current URL params before handling route
                        this.urlParams = this.routerManager.getUrlParams()
                        this.routerManager.handleRoute(updateUrl)
                    }

                    // Override parseUrlParams
                    this.parseUrlParams = (hash) => {
                        return this.routerManager.parseUrlParams(hash)
                    }

                    console.log('✅ Méthodes de routing override pour utiliser RouterManager')
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

                    mapTab?.addEventListener('click', () => this.viewManager.showView('map'))
                    experimentsTab?.addEventListener('click', () => this.viewManager.showView('experiments'))
                    dataTab?.addEventListener('click', () => this.viewManager.showView('data'))
                    sensorsTab?.addEventListener('click', () => this.viewManager.showView('sensors'))

                    // Center map button
                    document.getElementById('center-map-btn')?.addEventListener('click', () => this.mapManager.centerOnVisibleMarkers())

                    // Protocol filters
                    document.getElementById('protocol-filter')?.addEventListener('change', (e) => this.filterByProtocol(e.target.value))

                    // RouterManager gère maintenant hashchange et popstate
                    // Plus besoin d'event listeners manuels ici

                    console.log('✅ Événements bindés (auth et routing délégués aux managers)')
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
                    this.routerManager.init()
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
            window.viewManager = window.steamcity.viewManager
            window.routerManager = window.steamcity.routerManager

            console.log('🚀 Application SteamCity démarrée avec tous les managers')
            console.log('📦 Modules chargés:', {
                authManager: !!window.authManager,
                apiService: !!window.apiService,
                mapManager: !!window.mapManager,
                dataVizManager: !!window.dataVizManager,
                experimentsManager: !!window.experimentsManager,
                sensorsManager: !!window.sensorsManager,
                viewManager: !!window.viewManager,
                routerManager: !!window.routerManager,
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