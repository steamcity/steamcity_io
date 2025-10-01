/**
 * ExperimentsManager - Gestion de la vue et des interactions avec les expériences
 *
 * Ce module centralise toute la logique liée aux expériences :
 * - Affichage de la liste des expériences
 * - Affichage des détails d'une expérience
 * - Filtrage par protocole/cluster
 * - Légende interactive des clusters
 * - Gestion des indicateurs de données disponibles
 *
 * @module ExperimentsManager
 */

export class ExperimentsManager {
    /**
     * Crée une instance d'ExperimentsManager
     * @param {Object} config - Configuration du gestionnaire
     * @param {Array} config.experiments - Liste des expériences
     * @param {Object} config.protocolColors - Couleurs par protocole
     * @param {Function} config.getProtocolLabel - Fonction pour obtenir le label d'un protocole
     * @param {Function} config.getProtocolIcon - Fonction pour obtenir l'icône d'un protocole
     * @param {Function} config.onExperimentClick - Callback lors du clic sur une expérience
     * @param {ApiService} config.apiService - Instance d'ApiService
     */
    constructor(config = {}) {
        this.experiments = config.experiments || []
        this.protocolColors = config.protocolColors || {}
        this.getProtocolLabel = config.getProtocolLabel || ((p) => p)
        this.getProtocolIcon = config.getProtocolIcon || ((p) => '')
        this.onExperimentClick = config.onExperimentClick || (() => {})
        this.apiService = config.apiService || null

        this.activeExperimentFilter = null
        this.experimentsWithSensorsCache = null
    }

    /**
     * Charge et affiche la liste des expériences
     * @param {Object} options - Options d'affichage
     * @param {boolean} options.withLegend - Créer la légende des clusters
     * @param {boolean} options.checkSensors - Vérifier les données de capteurs disponibles
     * @returns {Promise<void>}
     */
    async loadExperimentsList(options = {}) {
        const container = document.getElementById('experiments-list')
        if (!container) {
            console.warn('Container #experiments-list not found')
            return
        }

        const { withLegend = true, checkSensors = true } = options

        if (withLegend) {
            this.createExperimentsLegend()
        }

        container.innerHTML = ''

        // Check which experiments have sensor data
        const experimentsWithSensors = checkSensors
            ? await this.getExperimentsWithSensors()
            : []

        this.experiments.forEach(experiment => {
            const card = this.createExperimentCard(experiment, experimentsWithSensors)
            container.appendChild(card)
        })
    }

    /**
     * Crée une carte HTML pour une expérience
     * @param {Object} experiment - Données de l'expérience
     * @param {Array} experimentsWithSensors - Liste des IDs d'expériences avec données
     * @returns {HTMLElement} - Carte HTML
     */
    createExperimentCard(experiment, experimentsWithSensors = []) {
        const card = document.createElement('div')
        const hasSensors = experimentsWithSensors.includes(experiment.id)
        card.className = `experiment-card ${experiment.protocol} ${hasSensors ? 'has-sensors' : ''}`

        const sensorIndicator = hasSensors
            ? '<span class="sensor-indicator" title="Données de capteurs disponibles">📊</span>'
            : ''

        card.innerHTML = `
            <h3>${experiment.title} ${sensorIndicator}</h3>
            <p>${experiment.description}</p>
            <div class="experiment-meta">
                <span class="experiment-location">📍 ${experiment.city}</span>
                <span class="protocol-badge ${experiment.protocol}" title="${this.getProtocolLabel(experiment.protocol)}">${this.getProtocolIcon(experiment.protocol)}</span>
            </div>
        `

        card.addEventListener('click', () => this.onExperimentClick(experiment.id))
        return card
    }

    /**
     * Filtre les expériences par protocole
     * @param {string|null} protocol - Protocole à filtrer (null = tous)
     * @returns {Promise<void>}
     */
    async filterExperiments(protocol) {
        const container = document.getElementById('experiments-list')
        if (!container) return

        const filteredExperiments = protocol
            ? this.experiments.filter(exp => exp.protocol === protocol)
            : this.experiments

        container.innerHTML = ''

        // Check which experiments have sensor data
        const experimentsWithSensors = await this.getExperimentsWithSensors()

        filteredExperiments.forEach(experiment => {
            const card = this.createExperimentCard(experiment, experimentsWithSensors)
            container.appendChild(card)
        })
    }

    /**
     * Récupère la liste des expériences qui ont des données de capteurs
     * @returns {Promise<Array<string>>} - Liste des IDs d'expériences
     */
    async getExperimentsWithSensors() {
        // Use cache if available
        if (this.experimentsWithSensorsCache) {
            return this.experimentsWithSensorsCache
        }

        if (!this.apiService) {
            console.warn('ApiService not available')
            return []
        }

        try {
            const measurements = await this.apiService.fetchMeasurements({ limit: 1000 })

            if (measurements && Array.isArray(measurements)) {
                // Get unique experiment IDs that have measurements
                const experimentIds = [...new Set(measurements.map(m => m.experiment_id))]
                this.experimentsWithSensorsCache = experimentIds
                return experimentIds
            }
            return []
        } catch (error) {
            console.error('Error checking experiments with sensors:', error)
            return []
        }
    }

    /**
     * Crée la légende interactive des clusters/protocoles
     * @returns {void}
     */
    createExperimentsLegend() {
        const legend = document.getElementById('experiments-legend')
        if (!legend) {
            console.warn('Legend container #experiments-legend not found')
            return
        }

        const protocols = [
            { key: 'environmental', label: `🌱 ${this.getProtocolLabel('environmental')}` },
            { key: 'energy', label: `⚡ ${this.getProtocolLabel('energy')}` },
            { key: 'mobility', label: `🚗 ${this.getProtocolLabel('mobility')}` },
            { key: 'governance', label: `🏛️ ${this.getProtocolLabel('governance')}` },
            { key: 'technology', label: `💻 ${this.getProtocolLabel('technology')}` }
        ]

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
        `

        legend.innerHTML = legendHTML

        // Add click listeners
        legend.querySelectorAll('.legend-item.clickable').forEach(item => {
            item.addEventListener('click', () => {
                const protocolKey = item.getAttribute('data-protocol')
                this.filterExperimentsByLegend(protocolKey)
            })
        })
    }

    /**
     * Filtre les expériences via un clic sur la légende
     * @param {string} protocolKey - Clé du protocole ('' = tous)
     * @returns {Promise<void>}
     */
    async filterExperimentsByLegend(protocolKey) {
        // Update active filter
        this.activeExperimentFilter = protocolKey || null

        // Filter experiments
        await this.filterExperiments(this.activeExperimentFilter)

        // Update legend visual state
        this.updateExperimentsLegendState()
    }

    /**
     * Met à jour l'état visuel de la légende
     * @returns {void}
     */
    updateExperimentsLegendState() {
        const legend = document.getElementById('experiments-legend')
        if (!legend) return

        // Update active states
        legend.querySelectorAll('.legend-item.clickable').forEach(item => {
            const protocolKey = item.getAttribute('data-protocol')
            const isActive = (protocolKey === '' && this.activeExperimentFilter === null) ||
                           (protocolKey === this.activeExperimentFilter)

            item.classList.toggle('active', isActive)
        })
    }

    /**
     * Charge les détails d'une expérience (infos + capteurs + graphique)
     * @param {Object} experiment - Données de l'expérience
     * @param {Object} options - Options de chargement
     * @param {Function} options.onChartCreate - Callback pour créer le graphique
     * @param {Function} options.applyClusterColor - Callback pour appliquer la couleur du cluster
     * @returns {Promise<void>}
     */
    async loadExperimentDetails(experiment, options = {}) {
        const titleElement = document.getElementById('experiment-detail-title')
        const infoContainer = document.getElementById('experiment-info')
        const sensorsContainer = document.getElementById('experiment-sensors')
        const chartsContainer = document.getElementById('experiment-charts')
        const methodologyContainer = document.getElementById('experiment-methodology')
        const hypothesesContainer = document.getElementById('experiment-hypotheses')
        const conclusionsContainer = document.getElementById('experiment-conclusions')

        if (!experiment) {
            console.warn('No experiment provided')
            return
        }

        // Clear previous content
        if (chartsContainer) {
            chartsContainer.innerHTML = ''
        }
        if (sensorsContainer) {
            sensorsContainer.innerHTML = ''
        }

        // Get cluster color
        const clusterColor = this.protocolColors[experiment.protocol] || this.protocolColors.other

        // Update page title
        if (titleElement) {
            titleElement.textContent = experiment.title
        }

        // Setup back button
        const backButton = document.getElementById('back-to-map')
        if (backButton) {
            // Remove existing listener if any
            const newBackButton = backButton.cloneNode(true)
            backButton.parentNode.replaceChild(newBackButton, backButton)

            // Add new listener to navigate back to experiments list
            newBackButton.addEventListener('click', () => {
                if (options.onBackToList) {
                    options.onBackToList()
                }
            })
        }

        // Apply cluster color to sections
        if (options.applyClusterColor) {
            options.applyClusterColor(clusterColor)
        }

        // Load basic experiment info
        if (infoContainer) {
            infoContainer.innerHTML = `
                <div class="experiment-meta">
                    <p><strong>📍 Lieu:</strong> ${experiment.city}</p>
                    <p><strong>🏫 École:</strong> ${experiment.school}</p>
                    <p><strong>📋 Protocole:</strong> <span class="protocol-name">${experiment.protocol_name}</span></p>
                    <p><strong>📅 Date:</strong> ${new Date(experiment.date).toLocaleDateString()}</p>
                    <p><strong>📊 Statut:</strong> <span class="status-badge status-${experiment.status}">${experiment.status_label || experiment.status}</span></p>
                </div>

                <div class="experiment-section">
                    <h4>📝 Description</h4>
                    <p>${experiment.description}</p>
                </div>

                <div class="experiment-section">
                    <p><span class="protocol-badge ${experiment.protocol}">${this.getProtocolLabel(experiment.protocol)}</span></p>
                </div>
            `
        }

        // Load methodology
        if (methodologyContainer) {
            methodologyContainer.innerHTML = experiment.methodology || 'Aucune méthodologie spécifiée pour cette expérience.'
        }

        // Load hypotheses
        if (hypothesesContainer) {
            hypothesesContainer.innerHTML = experiment.hypotheses || 'Aucune hypothèse spécifiée pour cette expérience.'
        }

        // Load conclusions
        if (conclusionsContainer) {
            conclusionsContainer.innerHTML = experiment.conclusions || 'Aucune conclusion disponible pour cette expérience.'
        }

        // Load sensors data
        await this.loadExperimentSensors(experiment, sensorsContainer, chartsContainer, options)
    }

    /**
     * Charge les capteurs d'une expérience
     * @param {Object} experiment - Données de l'expérience
     * @param {HTMLElement} sensorsContainer - Conteneur des capteurs
     * @param {HTMLElement} chartsContainer - Conteneur des graphiques
     * @param {Object} options - Options avec callbacks
     * @returns {Promise<void>}
     */
    async loadExperimentSensors(experiment, sensorsContainer, chartsContainer, options = {}) {
        if (!this.apiService) {
            if (sensorsContainer) {
                sensorsContainer.innerHTML = '<p>Service API non disponible</p>'
            }
            return
        }

        try {
            // Fetch sensor devices and sensor types in parallel
            const [sensorDevices, sensorTypesData] = await Promise.all([
                this.apiService.fetchSensorDevices({ experimentId: experiment.id }),
                this.apiService.fetchSensorTypes()
            ])

            // Create lookup for sensor types
            const sensorTypes = {}
            if (sensorTypesData && Array.isArray(sensorTypesData)) {
                sensorTypesData.forEach(type => {
                    sensorTypes[type.id] = type
                })
            }

            if (sensorsContainer && sensorDevices && sensorDevices.length > 0) {
                // Get latest measurements for each sensor (limit to first 6)
                for (const device of sensorDevices.slice(0, 6)) {
                    try {
                        const measurements = await this.apiService.fetchMeasurements({
                            sensorId: device.id,
                            limit: 1
                        })

                        const sensorType = sensorTypes[device.sensor_type_id]
                        const latestMeasurement = measurements && measurements.length > 0 ? measurements[0] : null

                        const sensorCard = document.createElement('div')
                        sensorCard.className = 'sensor-card clickable'

                        const status = device.status === 'online' ? 'en ligne' : device.status === 'offline' ? 'hors ligne' : device.status
                        const statusClass = device.status === 'online' ? 'status-online' : device.status === 'offline' ? 'status-offline' : 'status-warning'

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
                                <div class="sensor-battery">🔋 ${device.metadata?.battery_level || 'N/A'}%</div>
                                <small>Maj: ${latestMeasurement ?
                                    new Date(latestMeasurement.timestamp).toLocaleString() :
                                    'N/A'
                                }</small>
                            </div>
                            <div class="click-hint">🔍 Cliquez pour voir les détails</div>
                        `

                        // Add click handler to navigate to sensor details
                        if (options.onSensorClick) {
                            sensorCard.addEventListener('click', () => {
                                options.onSensorClick(device.id)
                            })
                        }

                        sensorsContainer.appendChild(sensorCard)
                    } catch (error) {
                        console.warn('Error loading measurements for sensor:', device.id, error)
                    }
                }

                // Show charts section when there are sensors
                const chartsSection = document.querySelector('#experiment-detail-view .charts-section')
                if (chartsSection) {
                    chartsSection.style.display = 'block'
                }

                // Create charts with measurement data
                if (options.onChartCreate && chartsContainer) {
                    await options.onChartCreate(experiment.id, chartsContainer)
                }
            } else {
                // No sensors - hide charts section
                if (sensorsContainer) {
                    sensorsContainer.innerHTML = '<p>Aucun capteur configuré pour cette expérience</p>'
                }

                // Hide the entire charts section when no sensors
                const chartsSection = document.querySelector('#experiment-detail-view .charts-section')
                if (chartsSection) {
                    chartsSection.style.display = 'none'
                }
            }
        } catch (error) {
            console.error('Error loading experiment sensors:', error)
            if (sensorsContainer) {
                sensorsContainer.innerHTML = '<p>Erreur lors du chargement des capteurs</p>'
            }
        }
    }

    /**
     * Met à jour la liste des expériences
     * @param {Array} experiments - Nouvelle liste d'expériences
     * @returns {void}
     */
    setExperiments(experiments) {
        this.experiments = experiments
        this.experimentsWithSensorsCache = null // Invalider le cache
    }

    /**
     * Récupère une expérience par son ID
     * @param {string} experimentId - ID de l'expérience
     * @returns {Object|null} - Expérience trouvée ou null
     */
    getExperimentById(experimentId) {
        return this.experiments.find(exp => exp.id === experimentId) || null
    }

    /**
     * Réinitialise les filtres
     * @returns {void}
     */
    resetFilters() {
        this.activeExperimentFilter = null
        this.updateExperimentsLegendState()
    }
}