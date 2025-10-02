/**
 * ViewManager - Gestion de l'affichage et du basculement entre les vues
 *
 * Ce module centralise toute la logique d'affichage des vues :
 * - Basculement entre les vues (map, experiments, sensors, data)
 * - Mise à jour des boutons de navigation actifs
 * - Initialisation spécifique à chaque vue
 * - Coordination avec les managers spécialisés
 *
 * @module ViewManager
 */

export class ViewManager {
    /**
     * Crée une instance de ViewManager
     * @param {Object} config - Configuration du gestionnaire
     * @param {MapManager} config.mapManager - Instance de MapManager
     * @param {ExperimentsManager} config.experimentsManager - Instance d'ExperimentsManager
     * @param {SensorsManager} config.sensorsManager - Instance de SensorsManager
     * @param {DataVisualizationManager} config.dataVisualizationManager - Instance de DataVisualizationManager
     * @param {Function} config.onViewChange - Callback appelé lors d'un changement de vue
     */
    constructor(config = {}) {
        this.mapManager = config.mapManager || null
        this.experimentsManager = config.experimentsManager || null
        this.sensorsManager = config.sensorsManager || null
        this.dataVisualizationManager = config.dataVisualizationManager || null
        this.onViewChange = config.onViewChange || (() => {})

        // Initialization callbacks
        this.onInitializeMap = config.onInitializeMap || null
        this.onInitializeExperiments = config.onInitializeExperiments || null
        this.onInitializeSensors = config.onInitializeSensors || null
        this.onInitializeData = config.onInitializeData || null

        this.currentView = null
        this.selectedExperimentForData = null
    }

    /**
     * Affiche une vue spécifique
     * @param {string} viewName - Nom de la vue (map, experiments, sensors, data)
     * @param {Object} options - Options d'affichage
     * @param {boolean} options.updateUrl - Mettre à jour l'URL
     * @returns {Promise<void>}
     */
    async showView(viewName, options = {}) {
        const { updateUrl = true } = options

        console.log('ViewManager: Switching to view:', viewName)

        // Update navigation buttons
        this.updateActiveNavButton(viewName)

        // Update views visibility
        this.switchViewInDOM(viewName)

        // Store current view
        this.currentView = viewName

        // Call onViewChange callback
        this.onViewChange(viewName, updateUrl)

        // Initialize specific view logic
        await this.initializeView(viewName)
    }

    /**
     * Bascule la vue active dans le DOM
     * @param {string} viewName - Nom de la vue
     * @private
     */
    switchViewInDOM(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active')
        })

        // Show requested view
        const viewElement = document.getElementById(viewName + '-view')
        if (viewElement) {
            viewElement.classList.add('active')
        } else {
            console.warn(`ViewManager: View element not found: ${viewName}-view`)
        }
    }

    /**
     * Met à jour l'état actif des boutons de navigation
     * @param {string} viewName - Nom de la vue (map, experiments, sensors, data)
     * @private
     */
    updateActiveNavButton(viewName) {
        const buttons = {
            map: document.getElementById('map-tab'),
            experiments: document.getElementById('experiments-tab'),
            sensors: document.getElementById('sensors-tab'),
            data: document.getElementById('data-tab')
        }

        // Remove active class from all buttons
        Object.values(buttons).forEach(btn => btn?.classList.remove('active'))

        // Add active class to corresponding button
        if (buttons[viewName]) {
            buttons[viewName].classList.add('active')
        }
    }

    /**
     * Initialise la logique spécifique à une vue
     * @param {string} viewName - Nom de la vue
     * @returns {Promise<void>}
     * @private
     */
    async initializeView(viewName) {
        switch (viewName) {
            case 'map':
                await this.initializeMapView()
                break
            case 'experiments':
                await this.initializeExperimentsView()
                break
            case 'sensors':
                await this.initializeSensorsView()
                break
            case 'data':
                await this.initializeDataView()
                break
            default:
                console.warn(`ViewManager: Unknown view: ${viewName}`)
        }
    }

    /**
     * Initialise la vue carte
     * @returns {Promise<void>}
     * @private
     */
    async initializeMapView() {
        if (!this.mapManager) {
            console.warn('ViewManager: MapManager not available')
            return
        }

        // Load map view - delegate to app's initializeMap if available
        if (this.onInitializeMap) {
            await this.onInitializeMap()
        } else {
            // Fallback behavior
            // If map is not initialized, initialize it
            if (!this.mapManager.getMapInstance()) {
                console.log('ViewManager: Initializing map...')
                // Map initialization will be handled by the app
                return
            }

            // Refresh map if it already exists
            setTimeout(() => {
                const map = this.mapManager.getMapInstance()
                if (map) {
                    map.invalidateSize()
                    this.mapManager.centerOnVisibleMarkers()
                }
            }, 50)
        }
    }

    /**
     * Initialise la vue expériences
     * @returns {Promise<void>}
     * @private
     */
    async initializeExperimentsView() {
        if (!this.experimentsManager) {
            console.warn('ViewManager: ExperimentsManager not available')
            return
        }

        // Load experiments list - delegate to app's loadExperimentsList
        // which handles both ExperimentsManager and additional bindings
        if (this.onInitializeExperiments) {
            await this.onInitializeExperiments()
        } else {
            // Fallback: just load experiments list
            await this.experimentsManager.loadExperimentsList({
                withLegend: true,
                checkSensors: true
            })
        }
    }

    /**
     * Initialise la vue capteurs
     * @returns {Promise<void>}
     * @private
     */
    async initializeSensorsView() {
        if (!this.sensorsManager) {
            console.warn('ViewManager: SensorsManager not available')
            return
        }

        // Load sensors view - delegate to app's loadSensorsView
        // which handles SensorsManager and additional bindings
        if (this.onInitializeSensors) {
            await this.onInitializeSensors()
        } else {
            // Fallback: just load sensors view
            await this.sensorsManager.loadSensorsView()
        }
    }

    /**
     * Initialise la vue données/graphiques
     * @returns {Promise<void>}
     * @private
     */
    async initializeDataView() {
        if (!this.dataVisualizationManager) {
            console.warn('ViewManager: DataVisualizationManager not available')
            return
        }

        // Load data view - delegate to app's loadDataView if available
        if (this.onInitializeData) {
            await this.onInitializeData(this.selectedExperimentForData)
        } else {
            // Fallback: just load chart data
            await this.dataVisualizationManager.loadChartData(this.selectedExperimentForData)
            this.dataVisualizationManager.bindDataFilterEvents()
        }
    }

    /**
     * Affiche les détails d'une expérience
     * @param {string} experimentId - ID de l'expérience
     * @param {Object} experiment - Données de l'expérience
     * @param {Object} options - Options d'affichage
     * @returns {Promise<void>}
     */
    async showExperimentDetail(experimentId, experiment, options = {}) {
        console.log('ViewManager: Showing experiment detail:', experimentId)

        // Update navigation button to experiments
        this.updateActiveNavButton('experiments')

        // Show experiment detail view (not list view)
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
        const detailView = document.getElementById('experiment-detail-view')
        if (detailView) {
            detailView.classList.add('active')
        }

        // Store current view
        this.currentView = 'experiments'

        // Load experiment details via ExperimentsManager
        if (this.experimentsManager && experiment) {
            await this.experimentsManager.loadExperimentDetails(experiment, options)
        }
    }

    /**
     * Affiche les détails d'un capteur
     * @param {string} sensorId - ID du capteur
     * @param {Object} options - Options d'affichage
     * @returns {Promise<void>}
     */
    async showSensorDetail(sensorId, _options = {}) {
        console.log('ViewManager: Showing sensor detail:', sensorId)

        // Update navigation button to sensors
        this.updateActiveNavButton('sensors')

        // Show sensor detail view
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
        const detailView = document.getElementById('sensor-detail-view')
        if (detailView) {
            detailView.classList.add('active')
        }

        // Store current view
        this.currentView = 'sensors'

        // Load sensor details via SensorsManager (showSensorDetails with updateUrl=false)
        if (this.sensorsManager) {
            await this.sensorsManager.showSensorDetails(sensorId, false)
        }
    }

    /**
     * Retourne à la vue liste des expériences
     * @returns {Promise<void>}
     */
    async showExperimentsList() {
        console.log('ViewManager: Showing experiments list')
        await this.showView('experiments', { updateUrl: true })
    }

    /**
     * Retourne à la vue liste des capteurs
     * @returns {Promise<void>}
     */
    async showSensorsList() {
        console.log('ViewManager: Showing sensors list')
        await this.showView('sensors', { updateUrl: true })
    }

    /**
     * Définit l'expérience sélectionnée pour la vue données
     * @param {string|null} experimentId - ID de l'expérience
     */
    setSelectedExperimentForData(experimentId) {
        this.selectedExperimentForData = experimentId
    }

    /**
     * Récupère le nom de la vue courante
     * @returns {string|null}
     */
    getCurrentView() {
        return this.currentView
    }
}
