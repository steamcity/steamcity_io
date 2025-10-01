/**
 * DataVisualizationManager - Gestion des graphiques et visualisations de données
 *
 * Ce module centralise toute la logique de visualisation des données de capteurs :
 * - Création de graphiques Chart.js (ligne temporelle)
 * - Gestion des légendes personnalisées
 * - Calcul et affichage des statistiques
 * - Filtrage par type de capteur, période, qualité
 * - Gestion des contrôles temporels
 *
 * @module DataVisualizationManager
 */

export class DataVisualizationManager {
    /**
     * Crée une instance de DataVisualizationManager
     * @param {Object} config - Configuration du gestionnaire
     * @param {Object} config.apiService - Instance d'ApiService pour les appels API
     * @param {Object} config.chartColors - Couleurs par défaut pour les graphiques
     */
    constructor(config = {}) {
        this.apiService = config.apiService || null
        this.chartColors = config.chartColors || [
            '#667eea', '#27ae60', '#f39c12',
            '#e74c3c', '#9b59b6', '#34495e'
        ]

        // Instance de graphique Chart.js actuelle
        this.chart = null

        // Valeurs en attente pour les filtres
        this.pendingSensorTypeValue = null
        this.urlParams = null
    }

    /**
     * Crée un graphique miniature pour une expérience (dans la vue détail)
     * @param {string} experimentId - ID de l'expérience
     * @param {HTMLElement} container - Conteneur pour le graphique
     * @param {string} period - Période à afficher ('24h', '7d', '30d', 'all')
     * @returns {Promise<void>}
     */
    async createExperimentChart(experimentId, container, period = '24h') {
        console.log(`Creating chart for experiment ${experimentId} with period ${period}`)

        if (!this.apiService) {
            console.error('ApiService not initialized')
            if (container) {
                container.innerHTML = '<p>Erreur: Service API non initialisé</p>'
            }
            return
        }

        const canvas = document.createElement('canvas')
        canvas.id = 'experiment-mini-chart'
        container.innerHTML = ''
        container.appendChild(canvas)

        try {
            // Get measurements for this experiment with time period
            const measurements = await this.apiService.fetchMeasurements({
                experimentId,
                period,
                limit: 200
            })

            console.log(`Received ${measurements ? measurements.length : 0} measurements`)

            if (!measurements || measurements.length === 0) {
                container.innerHTML = '<p>Aucune donnée de mesure disponible</p>'
                return
            }

            // Get sensor types for labels
            const sensorTypes = await this.apiService.fetchSensorTypes()
            const sensorTypesMap = {}
            sensorTypes.forEach(type => {
                sensorTypesMap[type.id] = type
            })

            // Group measurements by sensor type
            const groupedData = {}
            measurements.forEach(measurement => {
                if (!groupedData[measurement.sensor_type_id]) {
                    groupedData[measurement.sensor_type_id] = []
                }
                groupedData[measurement.sensor_type_id].push(measurement)
            })

            // Create datasets (limit to 3 types for readability)
            const datasets = Object.keys(groupedData).slice(0, 3).map((typeId, index) => {
                const sensorType = sensorTypesMap[typeId]
                const typeMeasurements = groupedData[typeId].sort(
                    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
                )

                return {
                    label: sensorType ? `${sensorType.icon} ${sensorType.name}` : typeId,
                    data: typeMeasurements.map(m => ({
                        x: new Date(m.timestamp),
                        y: parseFloat(m.value)
                    })),
                    borderColor: this.chartColors[index],
                    backgroundColor: this.chartColors[index] + '20',
                    fill: false,
                    tension: 0.4
                }
            })

            new Chart(canvas, {
                type: 'line',
                data: { datasets },
                options: this._getExperimentChartOptions(period, measurements.length)
            })

        } catch (error) {
            console.error('Error creating experiment chart:', error)
            container.innerHTML = '<p>Erreur lors du chargement des graphiques</p>'
        }
    }

    /**
     * Génère les options pour un graphique d'expérience
     * @private
     */
    _getExperimentChartOptions(period, totalPoints) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: this.getTimeUnit(period),
                        displayFormats: {
                            'minute': 'HH:mm',
                            'hour': 'HH:mm',
                            'day': 'dd/MM'
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
            plugins: {
                title: {
                    display: true,
                    text: `Évolution des mesures (${this.getPeriodLabel(period)} - ${totalPoints} points)`
                },
                legend: {
                    display: true,
                    position: 'top',
                    onClick: this._handleLegendClick.bind(this),
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15,
                        generateLabels: this._generateLegendLabels.bind(this)
                    }
                }
            }
        }
    }

    /**
     * Gère le clic sur un élément de légende
     * @private
     */
    _handleLegendClick(e, legendItem, legend) {
        const index = legendItem.datasetIndex
        const chart = legend.chart
        const meta = chart.getDatasetMeta(index)

        // Toggle visibility
        meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : !meta.hidden

        // Update chart
        chart.update()
    }

    /**
     * Génère les labels de légende avec styles personnalisés
     * @private
     */
    _generateLegendLabels(chart) {
        return chart.data.datasets.map((dataset, index) => {
            const meta = chart.getDatasetMeta(index)
            const isHidden = meta && meta.hidden

            return {
                text: dataset.label,
                fillStyle: isHidden ? dataset.borderColor + '40' : dataset.borderColor,
                strokeStyle: isHidden ? dataset.borderColor + '40' : dataset.borderColor,
                fontColor: isHidden ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.8)',
                lineWidth: isHidden ? 1 : 2,
                pointStyle: 'circle',
                hidden: false,
                datasetIndex: index
            }
        })
    }

    /**
     * Crée le graphique principal dans la vue Data
     * @param {Array<Object>} measurements - Mesures à afficher
     * @param {Object} sensorTypesMap - Mapping des types de capteurs
     * @returns {Chart} Instance du graphique créé
     */
    createMainChart(measurements, sensorTypesMap) {
        const canvas = document.getElementById('dataChart')
        if (!canvas) {
            console.warn('Canvas #dataChart not found')
            return null
        }

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy()
            this.chart = null
        }

        if (measurements.length === 0) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
            }
            return null
        }

        // Group measurements by sensor type
        const groupedData = {}
        measurements.forEach(measurement => {
            if (!groupedData[measurement.sensor_type_id]) {
                groupedData[measurement.sensor_type_id] = []
            }
            groupedData[measurement.sensor_type_id].push(measurement)
        })

        // Create datasets
        const datasets = Object.keys(groupedData).map((typeId, index) => {
            const sensorType = sensorTypesMap[typeId]
            const typeMeasurements = groupedData[typeId].sort(
                (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
            )

            return {
                label: sensorType ? `${sensorType.icon} ${sensorType.name}` : typeId,
                data: typeMeasurements.map(m => ({
                    x: new Date(m.timestamp),
                    y: parseFloat(m.value)
                })),
                borderColor: this.chartColors[index % this.chartColors.length],
                backgroundColor: this.chartColors[index % this.chartColors.length] + '20',
                fill: false,
                tension: 0.4
            }
        })

        this.chart = new Chart(canvas, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Valeur'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Évolution des données de capteurs'
                    },
                    legend: {
                        display: false
                    }
                }
            }
        })

        // Create custom legend for data view with a small delay
        setTimeout(() => {
            if (this.chart && this.chart.data.datasets.length > 0) {
                this.createCustomLegend(this.chart, 'chart-container')
            }
        }, 100)

        return this.chart
    }

    /**
     * Crée une légende personnalisée pour le graphique
     * @param {Chart} chart - Instance Chart.js
     * @param {string} containerId - ID du conteneur parent
     */
    createCustomLegend(chart, containerId) {
        const container = document.getElementById(containerId)
        if (!container) {
            console.error('Container not found:', containerId)
            return
        }

        // Remove existing legend
        const existingLegend = container.querySelector('.custom-legend')
        if (existingLegend) {
            existingLegend.remove()
        }

        const legendDiv = document.createElement('div')
        legendDiv.className = 'custom-legend'

        chart.data.datasets.forEach((dataset, index) => {
            const meta = chart.getDatasetMeta(index)
            const isHidden = meta && meta.hidden

            const item = document.createElement('div')
            item.className = `legend-item${isHidden ? ' hidden' : ''}`
            item.dataset.index = index

            const colorBox = document.createElement('div')
            colorBox.className = 'legend-color-box'
            colorBox.style.backgroundColor = dataset.borderColor

            const label = document.createElement('span')
            label.className = 'legend-label'
            label.textContent = dataset.label

            item.appendChild(colorBox)
            item.appendChild(label)

            item.addEventListener('click', () => {
                const meta = chart.getDatasetMeta(index)
                meta.hidden = !meta.hidden
                chart.update()
                this.updateCustomLegendStyles(chart, legendDiv)
            })

            legendDiv.appendChild(item)
        })

        container.appendChild(legendDiv)
    }

    /**
     * Met à jour les styles de la légende personnalisée
     * @param {Chart} chart - Instance Chart.js
     * @param {HTMLElement} legendContainer - Conteneur de la légende
     */
    updateCustomLegendStyles(chart, legendContainer) {
        chart.data.datasets.forEach((dataset, index) => {
            const meta = chart.getDatasetMeta(index)
            const item = legendContainer.querySelector(`[data-index="${index}"]`)

            if (item) {
                if (meta.hidden) {
                    item.classList.add('hidden')
                } else {
                    item.classList.remove('hidden')
                }
            }
        })
    }

    /**
     * Calcule et affiche les statistiques pour les mesures
     * @param {Array<Object>} measurements - Mesures à analyser
     */
    async calculateAndDisplayStats(measurements) {
        const statsPanel = document.getElementById('data-stats-panel')
        const statsBySensorContainer = document.getElementById('stats-by-sensor')

        if (!statsPanel || !statsBySensorContainer) {
            console.warn('Stats containers not found')
            return
        }

        if (!measurements || measurements.length === 0) {
            statsPanel.style.display = 'none'
            return
        }

        statsPanel.style.display = 'block'
        statsBySensorContainer.innerHTML = ''

        // Group measurements by sensor type
        const groupedData = {}
        measurements.forEach(measurement => {
            if (!groupedData[measurement.sensor_type_id]) {
                groupedData[measurement.sensor_type_id] = []
            }
            groupedData[measurement.sensor_type_id].push(measurement)
        })

        // Get sensor types
        const sensorTypes = await this.apiService.fetchSensorTypes()
        const sensorTypesMap = {}
        sensorTypes.forEach(type => {
            sensorTypesMap[type.id] = type
        })

        // Create stats section for each sensor type
        Object.keys(groupedData).forEach((typeId, index) => {
            const sensorType = sensorTypesMap[typeId]
            const typeMeasurements = groupedData[typeId]
            const color = this.chartColors[index % this.chartColors.length]

            this.createSensorStatsSection(
                statsBySensorContainer,
                sensorType,
                typeMeasurements,
                color
            )
        })

        // Calculate and display global stats
        const globalStats = this.calculateGlobalStats(measurements, Object.keys(groupedData).length)
        this._displayGlobalStats(globalStats)
    }

    /**
     * Crée une section de statistiques pour un type de capteur
     * @param {HTMLElement} container - Conteneur parent
     * @param {Object} sensorType - Type de capteur
     * @param {Array<Object>} measurements - Mesures du capteur
     * @param {string} color - Couleur associée
     */
    createSensorStatsSection(container, sensorType, measurements, color) {
        const values = measurements.map(m => parseFloat(m.value)).filter(v => !isNaN(v))

        if (values.length === 0) return

        const min = Math.min(...values)
        const max = Math.max(...values)
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length
        const median = this.calculateMedian(values.sort((a, b) => a - b))

        const section = document.createElement('div')
        section.className = 'sensor-stats-section'
        section.style.borderLeftColor = color

        section.innerHTML = `
            <h4 style="color: ${color}">
                ${sensorType ? `${sensorType.icon} ${sensorType.name}` : 'Capteur inconnu'}
            </h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Minimum</span>
                    <span class="stat-value">${min.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Maximum</span>
                    <span class="stat-value">${max.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Moyenne</span>
                    <span class="stat-value">${avg.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Médiane</span>
                    <span class="stat-value">${median.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Mesures</span>
                    <span class="stat-value">${measurements.length}</span>
                </div>
            </div>
        `

        container.appendChild(section)
    }

    /**
     * Calcule les statistiques globales
     * @param {Array<Object>} measurements - Toutes les mesures
     * @param {number} sensorTypeCount - Nombre de types de capteurs
     * @returns {Object} Statistiques globales
     */
    calculateGlobalStats(measurements, sensorTypeCount) {
        const qualities = measurements
            .map(m => m.quality?.score || m.quality || 1)
            .filter(q => !isNaN(q))

        const totalPoints = measurements.length
        const avgQuality = qualities.length > 0
            ? qualities.reduce((sum, q) => sum + q, 0) / qualities.length
            : null
        const timeRange = this._calculateTimeRange(measurements)

        return {
            totalMeasurements: totalPoints,
            sensorTypes: sensorTypeCount,
            avgQuality: avgQuality,
            timeRange: timeRange
        }
    }

    /**
     * Calcule la durée couverte par les mesures (format: "2j 5h")
     * @private
     */
    _calculateTimeRange(measurements) {
        if (measurements.length === 0) return 'N/A'

        const timestamps = measurements.map(m => new Date(m.timestamp)).sort((a, b) => a - b)
        const oldest = timestamps[0]
        const newest = timestamps[timestamps.length - 1]

        const diffMs = newest - oldest
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

        if (diffDays > 0) {
            return `${diffDays}j ${diffHours}h`
        } else if (diffHours > 0) {
            return `${diffHours}h`
        } else {
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
            return `${diffMinutes}min`
        }
    }

    /**
     * Affiche les statistiques globales
     * @private
     */
    _displayGlobalStats(stats) {
        // Update individual stat elements
        this._updateStatElement('stat-total-points', stats.totalMeasurements.toLocaleString())
        this._updateStatElement('stat-time-range', stats.timeRange)
        this._updateStatElement('stat-avg-quality', stats.avgQuality ? `${(stats.avgQuality * 100).toFixed(1)}%` : 'N/A')
        this._updateStatElement('stat-sensor-types', stats.sensorTypes.toString())
    }

    /**
     * Met à jour un élément de statistique
     * @private
     */
    _updateStatElement(elementId, value) {
        const element = document.getElementById(elementId)
        if (element) {
            element.textContent = value
        }
    }

    /**
     * Calcule la médiane d'un tableau de valeurs triées
     * @param {Array<number>} sortedValues - Valeurs triées
     * @returns {number} Médiane
     */
    calculateMedian(sortedValues) {
        if (sortedValues.length === 0) return 0

        const mid = Math.floor(sortedValues.length / 2)

        if (sortedValues.length % 2 === 0) {
            return (sortedValues[mid - 1] + sortedValues[mid]) / 2
        }

        return sortedValues[mid]
    }

    /**
     * Obtient l'unité de temps pour Chart.js selon la période
     * @param {string} period - Période ('24h', '7d', '30d', 'all')
     * @returns {string} Unité de temps ('minute', 'hour', 'day')
     */
    getTimeUnit(period) {
        const units = {
            '24h': 'hour',
            '7d': 'day',
            '30d': 'day',
            'all': 'day'
        }
        return units[period] || 'day'
    }

    /**
     * Obtient le label d'une période
     * @param {string} period - Période ('24h', '7d', '30d', 'all')
     * @returns {string} Label lisible
     */
    getPeriodLabel(period) {
        const labels = {
            '24h': 'Dernières 24h',
            '7d': '7 derniers jours',
            '30d': '30 derniers jours',
            'all': 'Toute la période'
        }
        return labels[period] || period
    }

    /**
     * Nettoie l'affichage des données (graphique et stats)
     */
    clearDataDisplay() {
        // Clear the chart
        const chartContainer = document.getElementById('main-chart')
        if (chartContainer) {
            chartContainer.innerHTML = '<p style="text-align: center; margin-top: 2rem; color: #666;">Sélectionnez une expérience pour voir les données</p>'
        }

        // Clear the statistics panel
        const statsPanel = document.getElementById('data-stats-panel')
        if (statsPanel) {
            statsPanel.style.display = 'none'
        }

        // Clear sensor type options
        const sensorTypeSelect = document.getElementById('sensor-type-select')
        if (sensorTypeSelect) {
            sensorTypeSelect.innerHTML = '<option value="">Choisir un type de capteur</option>'
        }

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy()
            this.chart = null
        }
    }

    /**
     * Obtient l'instance de graphique actuelle
     * @returns {Chart|null}
     */
    getChartInstance() {
        return this.chart
    }

    /**
     * Détruit le graphique et nettoie les ressources
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy()
            this.chart = null
        }
    }

    /**
     * Crée une légende personnalisée pour le graphique
     * @param {Chart} chart - Instance Chart.js
     * @param {string} containerId - ID du conteneur parent
     */
    createCustomLegend(chart, containerId) {
        const container = document.getElementById(containerId)
        if (!container) {
            console.error('Container not found:', containerId)
            return
        }

        // Remove existing legend
        const existingLegend = container.querySelector('.custom-chart-legend')
        if (existingLegend) {
            existingLegend.remove()
        }

        // Create legend container
        const legendContainer = document.createElement('div')
        legendContainer.className = 'custom-chart-legend'
        legendContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            margin-top: 0.5rem;
        `

        // Create legend items
        chart.data.datasets.forEach((dataset, index) => {
            const legendItem = document.createElement('div')
            legendItem.className = 'custom-legend-item'
            legendItem.style.cssText = `
                display: flex;
                align-items: center;
                padding: 0.5rem 1rem;
                border-radius: calc(var(--border-radius) / 2);
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: var(--glass-blur);
                border: 1px solid rgba(0, 0, 0, 0.1);
                cursor: pointer;
                transition: var(--transition);
                font-size: 0.9rem;
                font-weight: 500;
                margin: 0.25rem;
                user-select: none;
            `

            // Color indicator
            const colorBox = document.createElement('span')
            colorBox.style.cssText = `
                display: inline-block;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background-color: ${dataset.borderColor};
                margin-right: 0.5rem;
                flex-shrink: 0;
            `

            // Label text
            const labelText = document.createElement('span')
            labelText.textContent = dataset.label

            legendItem.appendChild(colorBox)
            legendItem.appendChild(labelText)

            // Click handler
            legendItem.addEventListener('click', () => {
                const meta = chart.getDatasetMeta(index)
                meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : !meta.hidden
                chart.update()
                this.updateCustomLegendStyles(chart, legendContainer)
            })

            // Hover effects
            legendItem.addEventListener('mouseenter', () => {
                if (!chart.getDatasetMeta(index).hidden) {
                    legendItem.style.background = '#f8f9fa'
                    legendItem.style.transform = 'translateY(-1px)'
                    legendItem.style.border = '1px solid rgba(102, 126, 234, 0.3)'
                    legendItem.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                }
            })

            legendItem.addEventListener('mouseleave', () => {
                if (!chart.getDatasetMeta(index).hidden) {
                    legendItem.style.background = 'rgba(255, 255, 255, 0.9)'
                    legendItem.style.transform = 'none'
                    legendItem.style.border = '1px solid rgba(0, 0, 0, 0.1)'
                    legendItem.style.boxShadow = 'none'
                }
            })

            legendContainer.appendChild(legendItem)
        })

        // Insert legend at the beginning of the container
        container.insertBefore(legendContainer, container.firstChild)

        // Wrap canvas in a fixed-height container if not already wrapped
        const canvas = container.querySelector('canvas')
        if (canvas && !canvas.parentElement.classList.contains('chart-canvas-wrapper')) {
            const canvasWrapper = document.createElement('div')
            canvasWrapper.className = 'chart-canvas-wrapper'
            canvasWrapper.style.cssText = `
                position: relative;
                height: 400px;
                width: 100%;
            `
            canvas.parentElement.insertBefore(canvasWrapper, canvas)
            canvasWrapper.appendChild(canvas)
        }

        // Initial update of legend styles
        this.updateCustomLegendStyles(chart, legendContainer)
    }

    /**
     * Met à jour les styles de la légende personnalisée
     * @param {Chart} chart - Instance Chart.js
     * @param {HTMLElement} legendContainer - Conteneur de la légende
     */
    updateCustomLegendStyles(chart, legendContainer) {
        const legendItems = legendContainer.querySelectorAll('.custom-legend-item')
        legendItems.forEach((item, index) => {
            const meta = chart.getDatasetMeta(index)
            const isHidden = meta && meta.hidden

            if (isHidden) {
                item.style.opacity = '0.4'
                item.style.background = 'rgba(255, 255, 255, 0.5)'
                item.style.transform = 'none'
                item.style.boxShadow = 'none'
            } else {
                item.style.opacity = '1'
                item.style.background = 'rgba(255, 255, 255, 0.9)'
            }
        })
    }
}