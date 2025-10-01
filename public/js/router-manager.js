/**
 * RouterManager - Gestion du routing et de la navigation
 *
 * Ce module centralise toute la logique de routing/navigation :
 * - Gestion du hash URL (#/map, #/data, #/experiments, #/sensors)
 * - Parsing des paramètres URL
 * - Navigation programmatique
 * - Événements de changement de route
 * - Historique de navigation
 *
 * @module RouterManager
 */

export class RouterManager {
    /**
     * Crée une instance de RouterManager
     * @param {Object} config - Configuration du gestionnaire
     * @param {Function} config.onViewChange - Callback appelé lors du changement de vue (viewName, updateUrl)
     * @param {Function} config.onExperimentDetail - Callback pour afficher un détail d'expérience (experimentId, updateUrl)
     * @param {Function} config.onSensorDetail - Callback pour afficher un détail de capteur (sensorId, updateUrl)
     * @param {Function} config.onDataView - Callback pour la vue data (experimentId, updateUrl)
     */
    constructor(config = {}) {
        this.onViewChange = config.onViewChange || (() => {})
        this.onExperimentDetail = config.onExperimentDetail || (() => {})
        this.onSensorDetail = config.onSensorDetail || (() => {})
        this.onDataView = config.onDataView || (() => {})

        // État actuel
        this.currentView = null
        this.currentId = null
        this.urlParams = {}

        // Bind methods
        this.handleRoute = this.handleRoute.bind(this)
        this.handlePopState = this.handlePopState.bind(this)
    }

    /**
     * Initialise le router et écoute les changements de hash
     */
    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', this.handleRoute)
        window.addEventListener('popstate', this.handlePopState)

        // Handle initial route
        const hash = window.location.hash
        if (!hash || hash === '#' || hash === '#/') {
            // No hash or empty hash, navigate to default route
            this.navigate('map')
        } else {
            // Handle existing hash
            this.handleRoute(false)
        }
    }

    /**
     * Nettoie les event listeners
     */
    destroy() {
        window.removeEventListener('hashchange', this.handleRoute)
        window.removeEventListener('popstate', this.handlePopState)
    }

    /**
     * Gère l'événement popstate (navigation avant/arrière)
     * @private
     */
    handlePopState() {
        this.handleRoute(false)
    }

    /**
     * Met à jour l'URL sans recharger la page
     * @param {string} view - Nom de la vue (map, experiments, sensors, data)
     * @param {string|null} id - ID optionnel (experimentId, sensorId)
     * @param {Object|null} queryParams - Paramètres de requête optionnels
     */
    updateUrl(view, id = null, queryParams = null) {
        let url = '#/' + view

        if (id) {
            url += '/' + id
        }

        if (queryParams && Object.keys(queryParams).length > 0) {
            const params = new URLSearchParams()
            Object.entries(queryParams).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.set(key, value)
                }
            })
            if (params.toString()) {
                url += '?' + params.toString()
            }
        }

        history.pushState({ view, id, queryParams }, '', url)

        // Update current state
        this.currentView = view
        this.currentId = id
        this.urlParams = queryParams || {}
    }

    /**
     * Parse les paramètres d'une URL hash
     * @param {string} hash - Hash URL (sans le #)
     * @returns {Object} Objet contenant parts (array) et params (object)
     */
    parseUrlParams(hash) {
        const [path, queryString] = hash.split('?')
        const parts = path.split('/').filter(p => p)
        const params = {}

        if (queryString) {
            const urlParams = new URLSearchParams(queryString)
            for (const [key, value] of urlParams) {
                params[key] = value
            }
        }

        return { parts, params }
    }

    /**
     * Gère le routing basé sur l'URL actuelle
     * @param {boolean|Event} updateUrlOrEvent - Si false, n'appelle pas updateUrl dans les callbacks. Peut aussi être un Event.
     */
    handleRoute(updateUrlOrEvent = true) {
        // Handle both direct calls and event listener calls
        const updateUrl = typeof updateUrlOrEvent === 'boolean' ? updateUrlOrEvent : true

        const hash = window.location.hash.slice(1) // Remove #
        const { parts, params } = this.parseUrlParams(hash)

        // Store URL params
        this.urlParams = params

        if (parts.length === 0) {
            // Default route
            this.currentView = 'map'
            this.currentId = null
            this.onViewChange('map', updateUrl)
        } else if (parts[0] === 'map') {
            this.currentView = 'map'
            this.currentId = null
            this.onViewChange('map', updateUrl)
        } else if (parts[0] === 'experiments') {
            if (parts.length > 1) {
                // Experiment detail route: #/experiments/experiment-id
                const experimentId = parts[1]
                this.currentView = 'experiments'
                this.currentId = experimentId
                this.onExperimentDetail(experimentId, updateUrl)
            } else {
                // Experiments list route: #/experiments
                this.currentView = 'experiments'
                this.currentId = null
                this.onViewChange('experiments', updateUrl)
            }
        } else if (parts[0] === 'sensors') {
            if (parts.length > 1) {
                // Sensor detail route: #/sensors/sensor-id
                const sensorId = parts[1]
                this.currentView = 'sensors'
                this.currentId = sensorId
                this.onSensorDetail(sensorId, updateUrl)
            } else {
                // Sensors view route: #/sensors
                this.currentView = 'sensors'
                this.currentId = null
                this.onViewChange('sensors', updateUrl)
            }
        } else if (parts[0] === 'data') {
            if (parts.length > 1) {
                // Data view with experiment route: #/data/experiment-id
                const experimentId = parts[1]
                this.currentView = 'data'
                this.currentId = experimentId
                this.onDataView(experimentId, updateUrl)
            } else {
                // Data view route: #/data
                this.currentView = 'data'
                this.currentId = null
                this.onDataView(null, updateUrl)
            }
        } else {
            // Invalid route, redirect to map
            this.navigate('map')
        }
    }

    /**
     * Navigation programmatique vers une vue
     * @param {string} view - Nom de la vue
     * @param {string|null} id - ID optionnel
     * @param {Object|null} queryParams - Paramètres de requête optionnels
     */
    navigate(view, id = null, queryParams = null) {
        this.updateUrl(view, id, queryParams)
        this.handleRoute(false)
    }

    /**
     * Retourne la route actuelle
     * @returns {Object} Objet contenant view, id et params
     */
    getCurrentRoute() {
        return {
            view: this.currentView,
            id: this.currentId,
            params: { ...this.urlParams }
        }
    }

    /**
     * Retourne les paramètres URL actuels
     * @returns {Object} Paramètres URL
     */
    getUrlParams() {
        return { ...this.urlParams }
    }

    /**
     * Retourne une valeur de paramètre URL spécifique
     * @param {string} key - Clé du paramètre
     * @param {*} defaultValue - Valeur par défaut si le paramètre n'existe pas
     * @returns {*} Valeur du paramètre
     */
    getUrlParam(key, defaultValue = null) {
        return this.urlParams[key] !== undefined ? this.urlParams[key] : defaultValue
    }

    /**
     * Met à jour un paramètre URL sans changer la vue
     * @param {string} key - Clé du paramètre
     * @param {*} value - Valeur du paramètre
     */
    updateUrlParam(key, value) {
        this.urlParams[key] = value
        this.updateUrl(this.currentView, this.currentId, this.urlParams)
    }

    /**
     * Supprime un paramètre URL
     * @param {string} key - Clé du paramètre à supprimer
     */
    removeUrlParam(key) {
        delete this.urlParams[key]
        this.updateUrl(this.currentView, this.currentId, this.urlParams)
    }

    /**
     * Retourne la vue actuelle
     * @returns {string|null} Nom de la vue actuelle
     */
    getCurrentView() {
        return this.currentView
    }

    /**
     * Retourne l'ID actuel (experimentId ou sensorId)
     * @returns {string|null} ID actuel
     */
    getCurrentId() {
        return this.currentId
    }
}
