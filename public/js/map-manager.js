/**
 * MapManager - Gestion de la carte Leaflet et des marqueurs
 *
 * Ce module centralise toute la logique de gestion de la carte interactive :
 * - Initialisation de Leaflet
 * - Ajout/suppression de marqueurs
 * - Filtrage par protocole
 * - Création de la légende
 * - Centrage et navigation sur la carte
 *
 * @module MapManager
 */

export class MapManager {
    /**
     * Crée une instance de MapManager
     * @param {Object} config - Configuration du gestionnaire de carte
     * @param {string} config.containerId - ID du conteneur DOM pour la carte
     * @param {Array<number>} config.center - Coordonnées [lat, lng] du centre initial
     * @param {number} config.zoom - Niveau de zoom initial
     * @param {Object} config.protocolColors - Mapping des couleurs par protocole
     * @param {Function} config.onMarkerClick - Callback lors du clic sur un marqueur
     */
    constructor(config = {}) {
        this.containerId = config.containerId || 'map'
        this.center = config.center || [46.2276, 2.2137] // France par défaut
        this.zoom = config.zoom || 6
        this.protocolColors = config.protocolColors || {}
        this.onMarkerClick = config.onMarkerClick || null

        this.map = null
        this.markers = []
        this.activeProtocolFilter = null
        this.legendId = config.legendId || 'map-legend'
    }

    /**
     * Initialise la carte Leaflet
     * @returns {Promise<L.Map>} Instance de la carte Leaflet
     */
    async initialize() {
        if (this.map) {
            console.warn('Map already initialized')
            return this.map
        }

        const mapContainer = document.getElementById(this.containerId)
        if (!mapContainer) {
            throw new Error(`Map container #${this.containerId} not found`)
        }

        // Initialize Leaflet map
        this.map = L.map(this.containerId).setView(this.center, this.zoom)

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map)

        console.log('✅ Map initialized:', this.containerId)
        return this.map
    }

    /**
     * Ajoute des marqueurs pour une liste d'expériences
     * @param {Array<Object>} experiments - Liste des expériences à afficher
     * @param {Object} options - Options d'affichage
     * @param {boolean} options.fitBounds - Ajuster la vue pour voir tous les marqueurs
     * @param {Function} options.getProtocolLabel - Fonction pour obtenir le label d'un protocole
     */
    addMarkers(experiments, options = {}) {
        if (!this.map) {
            console.warn('Map not initialized, call initialize() first')
            return
        }

        const { fitBounds = true, getProtocolLabel = (p) => p } = options
        const bounds = []

        experiments.forEach(experiment => {
            if (experiment.location && experiment.location.coordinates) {
                const [lng, lat] = experiment.location.coordinates
                const color = this.protocolColors[experiment.protocol] || this.protocolColors.other || '#95a5a6'

                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(this.map)

                // Create popup content
                const popupContent = this._createPopupContent(experiment, getProtocolLabel)

                marker.bindPopup(popupContent)
                this.markers.push({ marker, experiment })
                bounds.push([lat, lng])
            }
        })

        // Adjust map view to fit all markers
        if (fitBounds && bounds.length > 0) {
            this.fitBounds(bounds)
        }

        console.log(`✅ Added ${this.markers.length} markers to map`)
    }

    /**
     * Crée le contenu HTML d'une popup de marqueur
     * @private
     * @param {Object} experiment - Données de l'expérience
     * @param {Function} getProtocolLabel - Fonction pour obtenir le label d'un protocole
     * @returns {string} HTML de la popup
     */
    _createPopupContent(experiment, getProtocolLabel) {
        return `
            <div class="map-popup">
                <h4>${experiment.title}</h4>
                <p><strong>Ville:</strong> ${experiment.city}</p>
                <p><strong>École:</strong> ${experiment.school}</p>
                <p><strong>Protocole:</strong> ${experiment.protocol_name}</p>
                <p><strong>Cluster:</strong> <span class="protocol-badge ${experiment.protocol}">${getProtocolLabel(experiment.protocol)}</span></p>
                <p>${experiment.description}</p>
                <button onclick="steamcity.showExperimentDetail('${experiment.id}')" class="popup-button">
                    Voir les détails
                </button>
            </div>
        `
    }

    /**
     * Supprime tous les marqueurs de la carte
     */
    clearMarkers() {
        if (!this.map) return

        this.markers.forEach(({ marker }) => {
            this.map.removeLayer(marker)
        })
        this.markers = []
    }

    /**
     * Ajuste la vue pour voir tous les marqueurs
     * @param {Array<Array<number>>} bounds - Tableau de coordonnées [lat, lng]
     */
    fitBounds(bounds) {
        if (!this.map || bounds.length === 0) return

        if (bounds.length === 1) {
            // Single marker - center with reasonable zoom
            this.map.setView(bounds[0], 10)
        } else {
            // Multiple markers - fit bounds
            const group = new L.featureGroup(this.markers.map(m => m.marker))
            this.map.fitBounds(group.getBounds(), {
                padding: [20, 20],
                maxZoom: 10
            })
        }
    }

    /**
     * Centre la carte sur les marqueurs visibles
     */
    centerOnVisibleMarkers() {
        if (!this.map || this.markers.length === 0) {
            console.warn('No markers to center on')
            return
        }

        // If only one marker, center on it with a reasonable zoom
        if (this.markers.length === 1) {
            const marker = this.markers[0].marker
            this.map.setView(marker.getLatLng(), 10)
            return
        }

        // For multiple markers, fit bounds
        const group = new L.featureGroup(this.markers.map(m => m.marker))
        this.map.fitBounds(group.getBounds(), {
            padding: [20, 20],
            maxZoom: 10
        })
    }

    /**
     * Filtre les marqueurs par protocole
     * @param {string|null} protocol - Clé du protocole à filtrer (null = tous)
     * @param {Array<Object>} experiments - Liste complète des expériences
     * @param {Object} options - Options (getProtocolLabel function)
     */
    filterByProtocol(protocol, experiments, options = {}) {
        if (!this.map) return

        this.activeProtocolFilter = protocol
        this.clearMarkers()

        const filteredExperiments = protocol
            ? experiments.filter(exp => exp.protocol === protocol)
            : experiments

        this.addMarkers(filteredExperiments, options)
        this.updateLegendState()
    }

    /**
     * Crée la légende interactive de la carte
     * @param {Object} protocols - Mapping des protocoles {key, label}
     * @param {Function} getProtocolLabel - Fonction pour obtenir le label d'un protocole
     */
    createLegend(protocols, getProtocolLabel) {
        const legend = document.getElementById(this.legendId)
        if (!legend) {
            console.warn(`Legend container #${this.legendId} not found`)
            return
        }

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
        `

        legend.innerHTML = legendHTML

        console.log('✅ Map legend created')
    }

    /**
     * Met à jour l'état visuel de la légende
     */
    updateLegendState() {
        const legend = document.getElementById(this.legendId)
        if (!legend) return

        // Update active states
        legend.querySelectorAll('.legend-item.clickable').forEach(item => {
            const protocolKey = item.getAttribute('data-protocol')
            const isActive = (protocolKey === '' && this.activeProtocolFilter === null) ||
                           (protocolKey === this.activeProtocolFilter)

            if (isActive) {
                item.classList.add('active')
            } else {
                item.classList.remove('active')
            }
        })
    }

    /**
     * Attache les event listeners à la légende
     * @param {Function} onLegendClick - Callback lors du clic sur un élément de légende
     */
    bindLegendEvents(onLegendClick) {
        const legend = document.getElementById(this.legendId)
        if (!legend) return

        legend.querySelectorAll('.legend-item.clickable').forEach(item => {
            item.addEventListener('click', (e) => {
                const protocolKey = e.currentTarget.getAttribute('data-protocol')
                if (onLegendClick) {
                    onLegendClick(protocolKey || null)
                }
            })
        })
    }

    /**
     * Rafraîchit la carte (utile après un redimensionnement)
     */
    refresh() {
        if (this.map) {
            this.map.invalidateSize()
        }
    }

    /**
     * Obtient l'instance Leaflet de la carte
     * @returns {L.Map|null}
     */
    getMapInstance() {
        return this.map
    }

    /**
     * Obtient tous les marqueurs actuellement affichés
     * @returns {Array<Object>}
     */
    getMarkers() {
        return this.markers
    }

    /**
     * Détruit la carte et nettoie les ressources
     */
    destroy() {
        if (this.map) {
            this.clearMarkers()
            this.map.remove()
            this.map = null
            console.log('✅ Map destroyed')
        }
    }
}