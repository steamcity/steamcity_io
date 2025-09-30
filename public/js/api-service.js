/**
 * ApiService - Centralise tous les appels API de la plateforme SteamCity
 * Gère les requêtes HTTP, les erreurs et fournit une interface cohérente
 */
export class ApiService {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        }
    }

    /**
     * Méthode privée pour gérer les requêtes fetch avec gestion d'erreurs
     * @private
     * @param {string} endpoint - Endpoint de l'API (sans le baseUrl)
     * @param {Object} options - Options fetch
     * @returns {Promise<any>} - Données JSON de la réponse
     * @throws {Error} - En cas d'erreur réseau ou HTTP
     */
    async _fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.defaultHeaders,
                    ...(options.headers || {})
                }
            })

            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`)
            }

            const jsonData = await response.json()

            // Si la réponse a un format {success, data, ...}, extraire .data
            // Sinon retourner la réponse complète
            if (jsonData && typeof jsonData === 'object' && 'data' in jsonData) {
                return jsonData.data
            }

            return jsonData
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error)
            throw error
        }
    }

    /**
     * Récupère la liste de toutes les expériences
     * @returns {Promise<Array>} - Liste des expériences
     */
    async fetchExperiments() {
        return this._fetch('/experiments')
    }

    /**
     * Récupère les détails d'une expérience spécifique
     * @param {string} id - ID de l'expérience
     * @returns {Promise<Object>} - Détails de l'expérience
     */
    async fetchExperimentById(id) {
        return this._fetch(`/experiments/${id}`)
    }

    /**
     * Récupère la liste des capteurs (legacy endpoint)
     * @param {Object} params - Paramètres de requête (experimentId, limit, etc.)
     * @returns {Promise<Array>} - Liste des mesures de capteurs
     */
    async fetchSensors(params = {}) {
        const queryString = new URLSearchParams(params).toString()
        const endpoint = queryString ? `/sensors?${queryString}` : '/sensors'
        return this._fetch(endpoint)
    }

    /**
     * Récupère la liste des dispositifs capteurs
     * @param {Object} params - Paramètres de requête (experimentId, type, etc.)
     * @returns {Promise<Array>} - Liste des dispositifs
     */
    async fetchSensorDevices(params = {}) {
        const queryString = new URLSearchParams(params).toString()
        const endpoint = queryString ? `/sensors/devices?${queryString}` : '/sensors/devices'
        return this._fetch(endpoint)
    }

    /**
     * Récupère les détails d'un capteur spécifique
     * @param {string} id - ID du capteur
     * @returns {Promise<Object>} - Détails du capteur
     */
    async fetchSensorById(id) {
        return this._fetch(`/sensors/devices/${id}`)
    }

    /**
     * Récupère les types de capteurs disponibles
     * @returns {Promise<Array>} - Liste des types de capteurs
     */
    async fetchSensorTypes() {
        return this._fetch('/sensors/types')
    }

    /**
     * Récupère les mesures de capteurs avec filtres
     * @param {Object} params - Paramètres de filtrage
     * @param {string} params.experimentId - ID de l'expérience (optionnel)
     * @param {string} params.sensorId - ID du capteur (optionnel)
     * @param {string} params.period - Période (24h, 7d, 30d, all) (optionnel)
     * @param {number} params.limit - Nombre maximum de résultats (optionnel)
     * @param {string} params.from - Date de début ISO (optionnel)
     * @param {string} params.to - Date de fin ISO (optionnel)
     * @returns {Promise<Array>} - Liste des mesures
     */
    async fetchMeasurements(params = {}) {
        // Nettoyer les paramètres undefined
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        )

        const queryString = new URLSearchParams(cleanParams).toString()
        const endpoint = queryString ? `/sensors/measurements?${queryString}` : '/sensors/measurements'
        return this._fetch(endpoint)
    }

    /**
     * Récupère la liste des protocoles réseau
     * @returns {Promise<Array>} - Liste des protocoles
     */
    async fetchProtocols() {
        return this._fetch('/protocols')
    }

    /**
     * Upload un fichier CSV de données de capteurs
     * @param {File} file - Fichier CSV à uploader
     * @returns {Promise<Object>} - Résultat de l'upload
     */
    async uploadCSV(file) {
        const formData = new FormData()
        formData.append('csvFile', file)

        // Note: on ne met pas Content-Type pour FormData, le navigateur le gère
        const response = await fetch(`${this.baseUrl}/sensors/upload-csv`, {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
        }

        return await response.json()
    }

    /**
     * Health check de l'API
     * @returns {Promise<Object>} - Statut de l'API
     */
    async healthCheck() {
        return this._fetch('/health')
    }

    /**
     * Méthode utilitaire pour construire des URLs avec paramètres
     * @param {string} endpoint - Endpoint de base
     * @param {Object} params - Paramètres à ajouter
     * @returns {string} - URL complète avec paramètres
     */
    buildUrl(endpoint, params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        )
        const queryString = new URLSearchParams(cleanParams).toString()
        return queryString ? `${endpoint}?${queryString}` : endpoint
    }
}