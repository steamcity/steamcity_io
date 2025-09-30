import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DataVisualizationManager } from '../public/js/data-visualization-manager.js'

// Mock Chart.js
global.Chart = vi.fn((canvas, config) => ({
    data: config.data,
    options: config.options,
    destroy: vi.fn(),
    update: vi.fn(),
    getDatasetMeta: vi.fn((index) => ({ hidden: false }))
}))

describe('DataVisualizationManager', () => {
    let manager
    let mockApiService

    beforeEach(() => {
        // Mock DOM elements
        document.body.innerHTML = `
            <canvas id="dataChart"></canvas>
            <div id="chart-container"></div>
            <div id="data-stats-panel">
                <div id="stats-by-sensor"></div>
                <div id="global-stats"></div>
            </div>
            <div id="main-chart"></div>
            <select id="sensor-type-select"></select>
        `

        // Mock ApiService
        mockApiService = {
            fetchMeasurements: vi.fn(),
            fetchSensorTypes: vi.fn()
        }

        manager = new DataVisualizationManager({
            apiService: mockApiService
        })
    })

    afterEach(() => {
        document.body.innerHTML = ''
        vi.clearAllMocks()
    })

    describe('Constructor', () => {
        it('should create instance with default config', () => {
            const mgr = new DataVisualizationManager()
            expect(mgr.apiService).toBeNull()
            expect(mgr.chart).toBeNull()
            expect(mgr.chartColors).toHaveLength(6)
        })

        it('should create instance with custom config', () => {
            const customManager = new DataVisualizationManager({
                apiService: mockApiService,
                chartColors: ['#000', '#fff']
            })

            expect(customManager.apiService).toBe(mockApiService)
            expect(customManager.chartColors).toEqual(['#000', '#fff'])
        })
    })

    describe('createMainChart()', () => {
        it('should create chart with measurements', () => {
            const measurements = [
                { sensor_type_id: 'type1', timestamp: '2024-01-01T10:00:00Z', value: '25.5' },
                { sensor_type_id: 'type1', timestamp: '2024-01-01T11:00:00Z', value: '26.0' },
                { sensor_type_id: 'type2', timestamp: '2024-01-01T10:00:00Z', value: '30.0' }
            ]

            const sensorTypesMap = {
                'type1': { id: 'type1', name: 'Temperature', icon: '🌡️' },
                'type2': { id: 'type2', name: 'Humidity', icon: '💧' }
            }

            const chart = manager.createMainChart(measurements, sensorTypesMap)

            expect(Chart).toHaveBeenCalled()
            expect(manager.chart).not.toBeNull()
        })

        it('should handle empty measurements', () => {
            const chart = manager.createMainChart([], {})

            expect(chart).toBeNull()
            expect(manager.chart).toBeNull()
        })

        it('should destroy existing chart before creating new one', () => {
            const measurements = [
                { sensor_type_id: 'type1', timestamp: '2024-01-01T10:00:00Z', value: '25.5' }
            ]
            const sensorTypesMap = {
                'type1': { id: 'type1', name: 'Temperature', icon: '🌡️' }
            }

            // Create first chart
            manager.createMainChart(measurements, sensorTypesMap)
            const firstChart = manager.chart

            // Create second chart
            manager.createMainChart(measurements, sensorTypesMap)

            expect(firstChart.destroy).toHaveBeenCalled()
        })

        it('should warn if canvas not found', () => {
            document.body.innerHTML = '' // Remove canvas
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            const chart = manager.createMainChart([{ sensor_type_id: 'type1', timestamp: '2024-01-01T10:00:00Z', value: '25' }], {})

            expect(consoleSpy).toHaveBeenCalledWith('Canvas #dataChart not found')
            expect(chart).toBeNull()
            consoleSpy.mockRestore()
        })
    })

    describe('createExperimentChart()', () => {
        it('should create experiment chart successfully', async () => {
            const experimentId = 'exp1'
            const container = document.createElement('div')
            container.id = 'chart-container'

            mockApiService.fetchMeasurements.mockResolvedValue([
                { sensor_type_id: 'type1', timestamp: '2024-01-01T10:00:00Z', value: '25.5' }
            ])

            mockApiService.fetchSensorTypes.mockResolvedValue([
                { id: 'type1', name: 'Temperature', icon: '🌡️' }
            ])

            await manager.createExperimentChart(experimentId, container, '24h')

            expect(mockApiService.fetchMeasurements).toHaveBeenCalledWith({
                experimentId: 'exp1',
                period: '24h',
                limit: 200
            })
            expect(Chart).toHaveBeenCalled()
        })

        it('should handle no measurements', async () => {
            const container = document.createElement('div')
            mockApiService.fetchMeasurements.mockResolvedValue([])

            await manager.createExperimentChart('exp1', container)

            expect(container.innerHTML).toContain('Aucune donnée de mesure disponible')
        })

        it('should handle errors', async () => {
            const container = document.createElement('div')
            mockApiService.fetchMeasurements.mockRejectedValue(new Error('API Error'))

            await manager.createExperimentChart('exp1', container)

            expect(container.innerHTML).toContain('Erreur lors du chargement des graphiques')
        })
    })

    describe('calculateAndDisplayStats()', () => {
        beforeEach(() => {
            mockApiService.fetchSensorTypes.mockResolvedValue([
                { id: 'type1', name: 'Temperature', icon: '🌡️' },
                { id: 'type2', name: 'Humidity', icon: '💧' }
            ])
        })

        it('should calculate and display stats', async () => {
            const measurements = [
                { sensor_type_id: 'type1', timestamp: '2024-01-01T10:00:00Z', value: '25.5' },
                { sensor_type_id: 'type1', timestamp: '2024-01-01T11:00:00Z', value: '26.0' },
                { sensor_type_id: 'type2', timestamp: '2024-01-01T10:00:00Z', value: '60.0' }
            ]

            await manager.calculateAndDisplayStats(measurements)

            const statsPanel = document.getElementById('data-stats-panel')
            expect(statsPanel.style.display).toBe('block')

            const statsBySensor = document.getElementById('stats-by-sensor')
            expect(statsBySensor.children.length).toBeGreaterThan(0)
        })

        it('should hide stats panel for empty measurements', async () => {
            await manager.calculateAndDisplayStats([])

            const statsPanel = document.getElementById('data-stats-panel')
            expect(statsPanel.style.display).toBe('none')
        })

        it('should warn if containers not found', async () => {
            document.getElementById('data-stats-panel').remove()
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            await manager.calculateAndDisplayStats([{ sensor_type_id: 'type1', value: '25' }])

            expect(consoleSpy).toHaveBeenCalledWith('Stats containers not found')
            consoleSpy.mockRestore()
        })
    })

    describe('calculateMedian()', () => {
        it('should calculate median for odd-length array', () => {
            expect(manager.calculateMedian([1, 2, 3, 4, 5])).toBe(3)
        })

        it('should calculate median for even-length array', () => {
            expect(manager.calculateMedian([1, 2, 3, 4])).toBe(2.5)
        })

        it('should return 0 for empty array', () => {
            expect(manager.calculateMedian([])).toBe(0)
        })

        it('should work with single value', () => {
            expect(manager.calculateMedian([42])).toBe(42)
        })
    })

    describe('getTimeUnit()', () => {
        it('should return correct time unit for 24h', () => {
            expect(manager.getTimeUnit('24h')).toBe('hour')
        })

        it('should return correct time unit for 7d', () => {
            expect(manager.getTimeUnit('7d')).toBe('day')
        })

        it('should return correct time unit for 30d', () => {
            expect(manager.getTimeUnit('30d')).toBe('day')
        })

        it('should return default time unit for unknown period', () => {
            expect(manager.getTimeUnit('unknown')).toBe('day')
        })
    })

    describe('getPeriodLabel()', () => {
        it('should return correct label for 24h', () => {
            expect(manager.getPeriodLabel('24h')).toBe('Dernières 24h')
        })

        it('should return correct label for 7d', () => {
            expect(manager.getPeriodLabel('7d')).toBe('7 derniers jours')
        })

        it('should return correct label for 30d', () => {
            expect(manager.getPeriodLabel('30d')).toBe('30 derniers jours')
        })

        it('should return period itself for unknown period', () => {
            expect(manager.getPeriodLabel('custom')).toBe('custom')
        })
    })

    describe('clearDataDisplay()', () => {
        it('should clear chart and stats', () => {
            // Create a chart first
            manager.chart = {
                destroy: vi.fn()
            }

            manager.clearDataDisplay()

            expect(manager.chart).toBeNull()

            const statsPanel = document.getElementById('data-stats-panel')
            expect(statsPanel.style.display).toBe('none')

            const sensorSelect = document.getElementById('sensor-type-select')
            expect(sensorSelect.innerHTML).toContain('Choisir un type de capteur')
        })
    })

    describe('createCustomLegend()', () => {
        it('should create custom legend for chart', () => {
            const mockChart = {
                data: {
                    datasets: [
                        { label: 'Dataset 1', borderColor: '#667eea' },
                        { label: 'Dataset 2', borderColor: '#27ae60' }
                    ]
                },
                getDatasetMeta: vi.fn(() => ({ hidden: false }))
            }

            manager.createCustomLegend(mockChart, 'chart-container')

            const container = document.getElementById('chart-container')
            const legend = container.querySelector('.custom-legend')
            expect(legend).not.toBeNull()
            expect(legend.children.length).toBe(2)
        })

        it('should handle missing container', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            manager.createCustomLegend({ data: { datasets: [] } }, 'nonexistent')

            expect(consoleSpy).toHaveBeenCalledWith('Container not found:', 'nonexistent')
            consoleSpy.mockRestore()
        })

        it('should remove existing legend before creating new one', () => {
            const mockChart = {
                data: { datasets: [{ label: 'Dataset', borderColor: '#000' }] },
                getDatasetMeta: vi.fn(() => ({ hidden: false }))
            }

            manager.createCustomLegend(mockChart, 'chart-container')
            const firstLegend = document.querySelector('.custom-legend')

            manager.createCustomLegend(mockChart, 'chart-container')
            const legends = document.querySelectorAll('.custom-legend')

            expect(legends.length).toBe(1)
        })
    })

    describe('calculateGlobalStats()', () => {
        it('should calculate global statistics', () => {
            const measurements = [
                { timestamp: '2024-01-01T10:00:00Z', sensor_type_id: 'type1', value: '25' },
                { timestamp: '2024-01-02T10:00:00Z', sensor_type_id: 'type2', value: '30' }
            ]

            const stats = manager.calculateGlobalStats(measurements, 2)

            expect(stats.totalMeasurements).toBe(2)
            expect(stats.sensorTypes).toBe(2)
            expect(stats.dateRange.start).toBeInstanceOf(Date)
            expect(stats.dateRange.end).toBeInstanceOf(Date)
        })

        it('should handle empty measurements', () => {
            const stats = manager.calculateGlobalStats([], 0)

            expect(stats.totalMeasurements).toBe(0)
            expect(stats.sensorTypes).toBe(0)
            expect(stats.dateRange.start).toBeNull()
            expect(stats.dateRange.end).toBeNull()
        })
    })

    describe('Utility methods', () => {
        it('getChartInstance() should return chart', () => {
            manager.chart = { id: 'test' }
            expect(manager.getChartInstance()).toBe(manager.chart)
        })

        it('destroy() should clean up chart', () => {
            manager.chart = {
                destroy: vi.fn()
            }

            manager.destroy()

            expect(manager.chart).toBeNull()
        })
    })
})