import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SensorsManager } from '../public/js/sensors-manager.js'

describe('SensorsManager', () => {
    let sensorsManager
    let mockApiService
    let mockDataVizManager
    let mockProtocolColors
    let mockGetProtocolLabel
    let mockExperiments
    let mockUpdateUrl
    let mockShowView
    let mockShowExperimentDetail
    let fetchMock

    beforeEach(() => {
        // Setup mock experiments
        mockExperiments = [
            {
                id: 'exp1',
                title: 'Test Experiment 1',
                city: 'Paris',
                protocol: 'environmental'
            },
            {
                id: 'exp2',
                title: 'Test Experiment 2',
                city: 'Lyon',
                protocol: 'energy'
            }
        ]

        // Mock API service
        mockApiService = {
            fetchMeasurements: vi.fn(),
            fetchSensorDevices: vi.fn(),
            fetchSensorTypes: vi.fn()
        }

        // Mock data visualization manager
        mockDataVizManager = {
            createChart: vi.fn(),
            updateChart: vi.fn()
        }

        // Mock protocol utilities
        mockProtocolColors = {
            environmental: '#27ae60',
            energy: '#f39c12'
        }

        mockGetProtocolLabel = vi.fn((protocol) => {
            const labels = {
                environmental: 'Environnement',
                energy: 'Énergie'
            }
            return labels[protocol] || protocol
        })

        // Mock callbacks
        mockUpdateUrl = vi.fn()
        mockShowView = vi.fn()
        mockShowExperimentDetail = vi.fn()

        // Mock global fetch
        fetchMock = vi.fn()
        global.fetch = fetchMock

        // Mock Chart.js
        global.Chart = vi.fn(() => ({
            destroy: vi.fn(),
            update: vi.fn()
        }))
        global.Chart.getChart = vi.fn(() => null)

        // Create instance
        sensorsManager = new SensorsManager({
            apiService: mockApiService,
            dataVizManager: mockDataVizManager,
            protocolColors: mockProtocolColors,
            getProtocolLabel: mockGetProtocolLabel,
            experiments: mockExperiments,
            updateUrl: mockUpdateUrl,
            showView: mockShowView,
            showExperimentDetail: mockShowExperimentDetail,
            urlParams: {}
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Constructor', () => {
        it('should initialize with provided configuration', () => {
            expect(sensorsManager.apiService).toBe(mockApiService)
            expect(sensorsManager.dataVizManager).toBe(mockDataVizManager)
            expect(sensorsManager.protocolColors).toBe(mockProtocolColors)
            expect(sensorsManager.getProtocolLabel).toBe(mockGetProtocolLabel)
            expect(sensorsManager.experiments).toEqual(mockExperiments)
            expect(sensorsManager.updateUrl).toBe(mockUpdateUrl)
            expect(sensorsManager.showView).toBe(mockShowView)
            expect(sensorsManager.showExperimentDetail).toBe(mockShowExperimentDetail)
        })

        it('should initialize with default empty urlParams', () => {
            const manager = new SensorsManager({
                apiService: mockApiService,
                dataVizManager: mockDataVizManager,
                experiments: mockExperiments
            })
            expect(manager.urlParams).toEqual({})
        })

        it('should initialize state properties', () => {
            expect(sensorsManager.currentSensor).toBeNull()
            expect(sensorsManager.sensorDetailChart).toBeNull()
            expect(sensorsManager.selectedExperimentForData).toBeNull()
        })
    })

    describe('loadSensorsView()', () => {
        it('should populate filters, bind events, apply URL params, and load sensors', async () => {
            sensorsManager.populateSensorsFilters = vi.fn()
            sensorsManager.bindSensorsFilterEvents = vi.fn()
            sensorsManager.applySensorsUrlParams = vi.fn()
            sensorsManager.applySensorsFilters = vi.fn()

            await sensorsManager.loadSensorsView()

            expect(sensorsManager.populateSensorsFilters).toHaveBeenCalled()
            expect(sensorsManager.bindSensorsFilterEvents).toHaveBeenCalled()
            expect(sensorsManager.applySensorsUrlParams).toHaveBeenCalled()
            expect(sensorsManager.applySensorsFilters).toHaveBeenCalled()
        })
    })

    describe('applySensorsUrlParams()', () => {
        it('should return early when urlParams is empty', () => {
            sensorsManager.urlParams = {}
            document.getElementById = vi.fn()

            sensorsManager.applySensorsUrlParams()

            expect(document.getElementById).not.toHaveBeenCalled()
        })

        it('should apply experiment URL parameter', () => {
            const mockElement = { value: '' }
            const mockAdditionalFilters = { style: { display: '' } }
            const mockFilterInput = { placeholder: '' }
            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-experiment-filter') return mockElement
                if (id === 'sensors-additional-filters') return mockAdditionalFilters
                if (id === 'sensors-filter-input') return mockFilterInput
                return null
            })
            sensorsManager.urlParams = { experiment: 'exp1' }
            sensorsManager.updateSensorsFilterCount = vi.fn()

            sensorsManager.applySensorsUrlParams()

            expect(mockElement.value).toBe('exp1')
        })

        it('should apply status URL parameter', () => {
            const mockElement = { value: '' }
            const mockAdditionalFilters = { style: { display: '' } }
            const mockFilterInput = { placeholder: '' }
            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-status-filter') return mockElement
                if (id === 'sensors-additional-filters') return mockAdditionalFilters
                if (id === 'sensors-filter-input') return mockFilterInput
                return null
            })
            sensorsManager.urlParams = { status: 'active' }
            sensorsManager.updateSensorsFilterCount = vi.fn()

            sensorsManager.applySensorsUrlParams()

            expect(mockElement.value).toBe('active')
        })

        it('should apply type URL parameter', () => {
            const mockElement = { value: '' }
            const mockAdditionalFilters = { style: { display: '' } }
            const mockFilterInput = { placeholder: '' }
            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-type-filter') return mockElement
                if (id === 'sensors-additional-filters') return mockAdditionalFilters
                if (id === 'sensors-filter-input') return mockFilterInput
                return null
            })
            sensorsManager.urlParams = { type: 'temperature' }
            sensorsManager.updateSensorsFilterCount = vi.fn()

            sensorsManager.applySensorsUrlParams()

            expect(mockElement.value).toBe('temperature')
        })

        it('should decode URI components', () => {
            const mockElement = { value: '' }
            const mockAdditionalFilters = { style: { display: '' } }
            const mockFilterInput = { placeholder: '' }
            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-experiment-filter') return mockElement
                if (id === 'sensors-additional-filters') return mockAdditionalFilters
                if (id === 'sensors-filter-input') return mockFilterInput
                return null
            })
            sensorsManager.urlParams = { experiment: 'Test%20Experiment' }
            sensorsManager.updateSensorsFilterCount = vi.fn()

            sensorsManager.applySensorsUrlParams()

            expect(mockElement.value).toBe('Test Experiment')
        })

        it('should show advanced filters when active filters exist', () => {
            const mockFilter = { value: '' }
            const mockAdditionalFilters = { style: { display: 'none' } }
            const mockFilterInput = { placeholder: '' }

            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-experiment-filter') return mockFilter
                if (id === 'sensors-additional-filters') return mockAdditionalFilters
                if (id === 'sensors-filter-input') return mockFilterInput
                return null
            })

            sensorsManager.urlParams = { experiment: 'exp1' }
            sensorsManager.updateSensorsFilterCount = vi.fn()

            sensorsManager.applySensorsUrlParams()

            expect(mockAdditionalFilters.style.display).toBe('block')
            expect(mockFilterInput.placeholder).toBe('Filtres avancés activés - ajustez les options ci-dessous')
        })

        it('should handle null element gracefully', () => {
            document.getElementById = vi.fn(() => null)
            sensorsManager.urlParams = { experiment: 'exp1' }
            sensorsManager.updateSensorsFilterCount = vi.fn()

            expect(() => sensorsManager.applySensorsUrlParams()).not.toThrow()
        })
    })

    describe('populateSensorsFilters()', () => {
        it('should populate experiments filter', async () => {
            const mockSelect = {
                children: [{ value: '' }],
                removeChild: vi.fn(),
                appendChild: vi.fn()
            }
            document.getElementById = vi.fn(() => mockSelect)
            document.createElement = vi.fn(() => ({ value: '', textContent: '' }))
            sensorsManager.populateSensorTypesFilter = vi.fn()

            await sensorsManager.populateSensorsFilters()

            expect(mockSelect.appendChild).toHaveBeenCalledTimes(2) // 2 experiments
        })

        it('should create option elements for each experiment', async () => {
            const mockSelect = {
                children: [{ value: '' }],
                removeChild: vi.fn(),
                appendChild: vi.fn()
            }
            const mockOption = { value: '', textContent: '' }
            document.getElementById = vi.fn(() => mockSelect)
            document.createElement = vi.fn(() => mockOption)
            sensorsManager.populateSensorTypesFilter = vi.fn()

            await sensorsManager.populateSensorsFilters()

            expect(document.createElement).toHaveBeenCalledWith('option')
            expect(mockSelect.appendChild).toHaveBeenCalledWith(mockOption)
        })

        it('should call populateSensorTypesFilter', async () => {
            document.getElementById = vi.fn(() => null)
            sensorsManager.populateSensorTypesFilter = vi.fn()

            await sensorsManager.populateSensorsFilters()

            expect(sensorsManager.populateSensorTypesFilter).toHaveBeenCalled()
        })

        it('should handle missing experiment filter element', async () => {
            document.getElementById = vi.fn(() => null)
            sensorsManager.populateSensorTypesFilter = vi.fn()

            await expect(sensorsManager.populateSensorsFilters()).resolves.not.toThrow()
        })
    })

    describe('populateSensorTypesFilter()', () => {
        it('should fetch and populate sensor types', async () => {
            const mockSelect = {
                children: [{ value: '' }],
                removeChild: vi.fn(),
                appendChild: vi.fn()
            }
            const mockOption = { value: '', textContent: '' }

            document.getElementById = vi.fn(() => mockSelect)
            document.createElement = vi.fn(() => mockOption)

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    data: [
                        { sensor_type_id: 'temperature' },
                        { sensor_type_id: 'humidity' },
                        { sensor_type_id: 'temperature' } // Duplicate
                    ]
                })
            })

            await sensorsManager.populateSensorTypesFilter()

            expect(fetchMock).toHaveBeenCalledWith('/api/sensors/devices')
            expect(mockSelect.appendChild).toHaveBeenCalledTimes(2) // Unique types only
        })

        it('should handle API error gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            fetchMock.mockRejectedValue(new Error('API Error'))

            await expect(sensorsManager.populateSensorTypesFilter()).resolves.not.toThrow()
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error populating sensor types filter:',
                expect.any(Error)
            )

            consoleErrorSpy.mockRestore()
        })

        it('should handle unsuccessful API response', async () => {
            document.getElementById = vi.fn(() => null)
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: false })
            })

            await expect(sensorsManager.populateSensorTypesFilter()).resolves.not.toThrow()
        })
    })

    describe('applySensorsFilters()', () => {
        it('should return early when container not found', async () => {
            document.getElementById = vi.fn(() => null)

            await sensorsManager.applySensorsFilters()

            expect(fetchMock).not.toHaveBeenCalled()
        })

        it('should show loading message', async () => {
            const mockContainer = { innerHTML: '' }
            document.getElementById = vi.fn(() => mockContainer)
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: [] })
            })
            sensorsManager.showNoSensorsMessage = vi.fn()
            sensorsManager.updateSensorsFilterCount = vi.fn()

            await sensorsManager.applySensorsFilters()

            expect(mockContainer.innerHTML).toContain('Chargement des capteurs...')
        })

        it('should fetch sensors with experiment filter', async () => {
            const mockContainer = { innerHTML: '' }
            const mockExperimentFilter = { value: 'exp1' }

            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-container') return mockContainer
                if (id === 'sensors-experiment-filter') return mockExperimentFilter
                return { value: '' }
            })

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: [] })
            })

            sensorsManager.showNoSensorsMessage = vi.fn()
            sensorsManager.updateSensorsFilterCount = vi.fn()

            await sensorsManager.applySensorsFilters()

            expect(fetchMock).toHaveBeenCalledWith('/api/sensors/devices?experimentId=exp1')
        })

        it('should filter by status', async () => {
            const mockContainer = { innerHTML: '' }
            const mockStatusFilter = { value: 'active' }

            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-container') return mockContainer
                if (id === 'sensors-status-filter') return mockStatusFilter
                return { value: '' }
            })

            const mockSensors = [
                { id: 'sensor1', status: 'active' },
                { id: 'sensor2', status: 'offline' }
            ]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: mockSensors })
            })

            sensorsManager.displaySensors = vi.fn()
            sensorsManager.updateSensorsFilterCount = vi.fn()

            await sensorsManager.applySensorsFilters()

            expect(sensorsManager.displaySensors).toHaveBeenCalledWith([mockSensors[0]])
        })

        it('should filter by type', async () => {
            const mockContainer = { innerHTML: '' }
            const mockTypeFilter = { value: 'temperature' }

            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-container') return mockContainer
                if (id === 'sensors-type-filter') return mockTypeFilter
                return { value: '' }
            })

            const mockSensors = [
                { id: 'sensor1', type: 'temperature' },
                { id: 'sensor2', type: 'humidity' }
            ]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: mockSensors })
            })

            sensorsManager.displaySensors = vi.fn()
            sensorsManager.updateSensorsFilterCount = vi.fn()

            await sensorsManager.applySensorsFilters()

            expect(sensorsManager.displaySensors).toHaveBeenCalledWith([mockSensors[0]])
        })

        it('should show no sensors message when no results', async () => {
            const mockContainer = { innerHTML: '' }
            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-container') return mockContainer
                return { value: '' }
            })

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: [] })
            })

            sensorsManager.showNoSensorsMessage = vi.fn()
            sensorsManager.updateSensorsFilterCount = vi.fn()

            await sensorsManager.applySensorsFilters()

            expect(sensorsManager.showNoSensorsMessage).toHaveBeenCalledWith(
                'Aucun capteur ne correspond aux critères de filtrage.'
            )
        })

        it('should handle API error', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            const mockContainer = { innerHTML: '' }
            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-container') return mockContainer
                return { value: '' }
            })

            fetchMock.mockRejectedValue(new Error('API Error'))
            sensorsManager.showNoSensorsMessage = vi.fn()

            await sensorsManager.applySensorsFilters()

            expect(sensorsManager.showNoSensorsMessage).toHaveBeenCalledWith(
                'Impossible de charger les capteurs. Veuillez réessayer.'
            )

            consoleErrorSpy.mockRestore()
        })

        it('should handle unsuccessful API response', async () => {
            const mockContainer = { innerHTML: '' }
            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-container') return mockContainer
                return { value: '' }
            })

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: false })
            })

            sensorsManager.showNoSensorsMessage = vi.fn()
            sensorsManager.updateSensorsFilterCount = vi.fn()

            await sensorsManager.applySensorsFilters()

            expect(sensorsManager.showNoSensorsMessage).toHaveBeenCalledWith(
                'Erreur lors du chargement des capteurs.'
            )
        })
    })

    describe('displaySensors()', () => {
        it('should return early when container not found', async () => {
            document.getElementById = vi.fn(() => null)
            const sensors = [{ id: 'sensor1' }]

            await sensorsManager.displaySensors(sensors)

            expect(fetchMock).not.toHaveBeenCalled()
        })

        it('should clear container and display sensors', async () => {
            const mockContainer = { innerHTML: '', appendChild: vi.fn() }
            const mockCard = document.createElement('div')

            document.getElementById = vi.fn(() => mockContainer)
            sensorsManager.getLastSensorMeasurement = vi.fn().mockResolvedValue(null)
            sensorsManager.createSensorDeviceCard = vi.fn(() => mockCard)

            const sensors = [
                { id: 'sensor1', name: 'Sensor 1' },
                { id: 'sensor2', name: 'Sensor 2' }
            ]

            await sensorsManager.displaySensors(sensors)

            expect(mockContainer.innerHTML).toBe('')
            expect(mockContainer.appendChild).toHaveBeenCalledTimes(2)
        })

        it('should enrich sensors with measurements', async () => {
            const mockContainer = { innerHTML: '', appendChild: vi.fn() }
            document.getElementById = vi.fn(() => mockContainer)

            const mockMeasurement = { value: 22.5, timestamp: '2025-01-01' }
            sensorsManager.getLastSensorMeasurement = vi.fn().mockResolvedValue(mockMeasurement)
            sensorsManager.createSensorDeviceCard = vi.fn(() => document.createElement('div'))

            const sensors = [{ id: 'sensor1' }]

            await sensorsManager.displaySensors(sensors)

            expect(sensorsManager.createSensorDeviceCard).toHaveBeenCalledWith({
                id: 'sensor1',
                lastMeasurement: mockMeasurement
            })
        })
    })

    describe('showNoSensorsMessage()', () => {
        it('should display no sensors message', () => {
            const mockContainer = { innerHTML: '' }
            document.getElementById = vi.fn(() => mockContainer)

            sensorsManager.showNoSensorsMessage('Test message')

            expect(mockContainer.innerHTML).toContain('Aucun capteur trouvé')
            expect(mockContainer.innerHTML).toContain('Test message')
            expect(mockContainer.innerHTML).toContain('📡')
        })

        it('should handle missing container', () => {
            document.getElementById = vi.fn(() => null)

            expect(() => sensorsManager.showNoSensorsMessage('Test')).not.toThrow()
        })
    })

    describe('showSensorDetails()', () => {
        it('should display sensor details successfully', async () => {
            const mockSensor = {
                id: 'sensor1',
                name: 'Test Sensor',
                sensor_type_id: 'temperature',
                status: 'active',
                experiment_id: 'exp1'
            }

            sensorsManager.getSensorById = vi.fn().mockResolvedValue(mockSensor)
            sensorsManager.populateSensorInfo = vi.fn()
            sensorsManager.populateSensorDetails = vi.fn()
            sensorsManager.loadSensorChart = vi.fn()
            sensorsManager.getLastSensorMeasurement = vi.fn().mockResolvedValue(null)

            const mockView = { classList: { remove: vi.fn(), add: vi.fn() } }
            const mockDetailView = { classList: { remove: vi.fn(), add: vi.fn() } }
            const mockTab = { classList: { remove: vi.fn(), add: vi.fn() } }
            const mockTitle = { textContent: '' }
            const mockBackButton = { onclick: null }
            const mockOpenDataBtn = { onclick: null }

            document.querySelectorAll = vi.fn((selector) => {
                if (selector === '.view') return [mockView, mockDetailView]
                if (selector === '.nav-button') return [mockTab]
                if (selector.includes('.time-filter-btn')) return []
                return []
            })

            document.getElementById = vi.fn((id) => {
                if (id === 'sensor-detail-view') return mockDetailView
                if (id === 'sensors-tab') return mockTab
                if (id === 'sensor-detail-title') return mockTitle
                if (id === 'back-to-sensors') return mockBackButton
                if (id === 'open-sensor-in-data-view-header') return mockOpenDataBtn
                return null
            })

            document.querySelector = vi.fn(() => null)

            await sensorsManager.showSensorDetails('sensor1')

            expect(sensorsManager.getSensorById).toHaveBeenCalledWith('sensor1')
            expect(sensorsManager.currentSensor).toBe(mockSensor)
            expect(sensorsManager.populateSensorInfo).toHaveBeenCalledWith(mockSensor)
            expect(sensorsManager.populateSensorDetails).toHaveBeenCalled()
            expect(sensorsManager.loadSensorChart).toHaveBeenCalledWith('sensor1', '24h')
        })

        it('should handle sensor not found', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            sensorsManager.getSensorById = vi.fn().mockResolvedValue(null)

            await sensorsManager.showSensorDetails('nonexistent')

            expect(consoleErrorSpy).toHaveBeenCalledWith('Sensor not found:', 'nonexistent')
            consoleErrorSpy.mockRestore()
        })

        it('should update URL when requested', async () => {
            const mockSensor = { id: 'sensor1', sensor_type_id: 'temperature', experiment_id: 'exp1' }
            sensorsManager.getSensorById = vi.fn().mockResolvedValue(mockSensor)
            sensorsManager.populateSensorInfo = vi.fn()
            sensorsManager.populateSensorDetails = vi.fn()
            sensorsManager.loadSensorChart = vi.fn()
            sensorsManager.getLastSensorMeasurement = vi.fn().mockResolvedValue(null)

            document.querySelectorAll = vi.fn(() => [])
            document.getElementById = vi.fn(() => ({ textContent: '', onclick: null, classList: { remove: vi.fn(), add: vi.fn() } }))
            document.querySelector = vi.fn(() => null)

            await sensorsManager.showSensorDetails('sensor1', true)

            expect(mockUpdateUrl).toHaveBeenCalledWith('sensors', 'sensor1', {})
        })

        it('should not update URL when not requested', async () => {
            const mockSensor = { id: 'sensor1', sensor_type_id: 'temperature', experiment_id: 'exp1' }
            sensorsManager.getSensorById = vi.fn().mockResolvedValue(mockSensor)
            sensorsManager.populateSensorInfo = vi.fn()
            sensorsManager.populateSensorDetails = vi.fn()
            sensorsManager.loadSensorChart = vi.fn()
            sensorsManager.getLastSensorMeasurement = vi.fn().mockResolvedValue(null)

            document.querySelectorAll = vi.fn(() => [])
            document.getElementById = vi.fn(() => ({ textContent: '', onclick: null, classList: { remove: vi.fn(), add: vi.fn() } }))
            document.querySelector = vi.fn(() => null)

            await sensorsManager.showSensorDetails('sensor1', false)

            expect(mockUpdateUrl).not.toHaveBeenCalled()
        })
    })

    describe('getSensorById()', () => {
        it('should fetch sensor by id', async () => {
            const mockSensor = { id: 'sensor1', name: 'Test Sensor' }
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: mockSensor })
            })

            const result = await sensorsManager.getSensorById('sensor1')

            expect(fetchMock).toHaveBeenCalledWith('/api/sensors/devices/sensor1')
            expect(result).toEqual(mockSensor)
        })

        it('should return null when sensor not found', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 404
            })

            const result = await sensorsManager.getSensorById('nonexistent')

            expect(result).toBeNull()
        })

        it('should handle API error gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            fetchMock.mockRejectedValue(new Error('Network error'))

            const result = await sensorsManager.getSensorById('sensor1')

            expect(result).toBeNull()
            expect(consoleErrorSpy).toHaveBeenCalled()
            consoleErrorSpy.mockRestore()
        })
    })

    describe('loadSensorChart()', () => {
        it('should load chart with measurements', async () => {
            const mockMeasurements = [
                { timestamp: '2025-01-01T10:00:00Z', value: 22.5 },
                { timestamp: '2025-01-01T11:00:00Z', value: 23.0 }
            ]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: mockMeasurements, total: 2 })
            })

            sensorsManager.createSensorDetailChart = vi.fn()

            await sensorsManager.loadSensorChart('sensor1', '24h')

            expect(fetchMock).toHaveBeenCalledWith('/api/sensors/measurements?sensorId=sensor1&period=24h&limit=50')
            expect(sensorsManager.createSensorDetailChart).toHaveBeenCalledWith(
                mockMeasurements,
                '24h',
                'sensor1',
                2
            )
        })

        it('should adjust limit based on period', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: [] })
            })

            await sensorsManager.loadSensorChart('sensor1', '7d')
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('limit=168'))

            await sensorsManager.loadSensorChart('sensor1', '30d')
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('limit=360'))

            await sensorsManager.loadSensorChart('sensor1', 'all')
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('limit=1000'))
        })

        it('should clear chart when no data', async () => {
            const mockChart = { destroy: vi.fn() }
            sensorsManager.sensorDetailChart = mockChart

            const mockCanvas = {}
            document.getElementById = vi.fn(() => mockCanvas)
            global.Chart.getChart = vi.fn(() => ({ destroy: vi.fn() }))

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: [] })
            })

            await sensorsManager.loadSensorChart('sensor1', '24h')

            expect(mockChart.destroy).toHaveBeenCalled()
            expect(sensorsManager.sensorDetailChart).toBeNull()
        })

        it('should handle API error gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            fetchMock.mockRejectedValue(new Error('API Error'))

            await expect(sensorsManager.loadSensorChart('sensor1', '24h')).resolves.not.toThrow()
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading sensor chart:', expect.any(Error))

            consoleErrorSpy.mockRestore()
        })
    })

    describe('updateSensorsFilterCount()', () => {
        it('should display count when filters active', () => {
            const mockFilterCount = { textContent: '', style: { display: 'none' } }
            const mockExperimentFilter = { value: 'exp1' }
            const mockStatusFilter = { value: 'active' }
            const mockTypeFilter = { value: '' }

            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-filter-count') return mockFilterCount
                if (id === 'sensors-experiment-filter') return mockExperimentFilter
                if (id === 'sensors-status-filter') return mockStatusFilter
                if (id === 'sensors-type-filter') return mockTypeFilter
                return null
            })

            sensorsManager.updateSensorsFilterCount()

            expect(mockFilterCount.textContent).toBe('2 filtres actifs')
            expect(mockFilterCount.style.display).toBe('inline-block')
        })

        it('should display singular form when one filter active', () => {
            const mockFilterCount = { textContent: '', style: { display: 'none' } }
            const mockExperimentFilter = { value: 'exp1' }
            const mockStatusFilter = { value: '' }
            const mockTypeFilter = { value: '' }

            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-filter-count') return mockFilterCount
                if (id === 'sensors-experiment-filter') return mockExperimentFilter
                if (id === 'sensors-status-filter') return mockStatusFilter
                if (id === 'sensors-type-filter') return mockTypeFilter
                return null
            })

            sensorsManager.updateSensorsFilterCount()

            expect(mockFilterCount.textContent).toBe('1 filtre actif')
        })

        it('should hide count when no filters active', () => {
            const mockFilterCount = { textContent: '', style: { display: 'inline-block' } }
            const mockFilter = { value: '' }

            document.getElementById = vi.fn((id) => {
                if (id === 'sensors-filter-count') return mockFilterCount
                return mockFilter
            })

            sensorsManager.updateSensorsFilterCount()

            expect(mockFilterCount.style.display).toBe('none')
        })

        it('should handle missing elements gracefully', () => {
            document.getElementById = vi.fn(() => null)

            expect(() => sensorsManager.updateSensorsFilterCount()).not.toThrow()
        })
    })

    describe('Utility methods', () => {
        describe('getSensorIcon()', () => {
            it('should return correct icon for known types', () => {
                expect(sensorsManager.getSensorIcon('temperature')).toBe('🌡️')
                expect(sensorsManager.getSensorIcon('humidity')).toBe('💧')
                expect(sensorsManager.getSensorIcon('co2')).toBe('💨')
            })

            it('should return default icon for unknown types', () => {
                expect(sensorsManager.getSensorIcon('unknown')).toBe('📡')
            })
        })

        describe('getSensorTypeName()', () => {
            it('should return French names for types', () => {
                expect(sensorsManager.getSensorTypeName('temperature')).toBe('Température')
                expect(sensorsManager.getSensorTypeName('humidity')).toBe('Humidité')
            })

            it('should return type id for unknown types', () => {
                expect(sensorsManager.getSensorTypeName('unknown')).toBe('unknown')
            })
        })

        describe('formatSensorType()', () => {
            it('should format sensor type names', () => {
                expect(sensorsManager.formatSensorType('temperature')).toBe('Capteur de température')
                expect(sensorsManager.formatSensorType('co2')).toBe('Capteur CO2')
            })

            it('should handle unknown types', () => {
                expect(sensorsManager.formatSensorType('unknown')).toBe('Capteur unknown')
            })

            it('should handle null type', () => {
                expect(sensorsManager.formatSensorType(null)).toBe('Type inconnu')
            })
        })

        describe('getSensorUnit()', () => {
            it('should return correct units', () => {
                expect(sensorsManager.getSensorUnit('temperature')).toBe('°C')
                expect(sensorsManager.getSensorUnit('humidity')).toBe('%')
                expect(sensorsManager.getSensorUnit('co2')).toBe('ppm')
            })

            it('should return empty string for types without units', () => {
                expect(sensorsManager.getSensorUnit('motion')).toBe('')
                expect(sensorsManager.getSensorUnit(null)).toBe('')
            })
        })

        describe('formatSensorLocation()', () => {
            it('should format building and room', () => {
                const location = { building: 'Building A', room: 'Room 101' }
                expect(sensorsManager.formatSensorLocation(location)).toBe('Building A, Room 101')
            })

            it('should format building only', () => {
                const location = { building: 'Building A' }
                expect(sensorsManager.formatSensorLocation(location)).toBe('Building A')
            })

            it('should format description', () => {
                const location = { description: 'Main entrance' }
                expect(sensorsManager.formatSensorLocation(location)).toBe('Main entrance')
            })

            it('should format coordinates', () => {
                const location = { latitude: 48.8566, longitude: 2.3522 }
                expect(sensorsManager.formatSensorLocation(location)).toBe('48.8566, 2.3522')
            })

            it('should handle string location', () => {
                expect(sensorsManager.formatSensorLocation('Main Hall')).toBe('Main Hall')
            })

            it('should return default for null', () => {
                expect(sensorsManager.formatSensorLocation(null)).toBe('Emplacement non spécifié')
            })
        })

        describe('formatLastMeasurement()', () => {
            it('should return "Maintenant" for recent measurements', () => {
                const now = new Date().toISOString()
                expect(sensorsManager.formatLastMeasurement(now)).toBe('Maintenant')
            })

            it('should format minutes ago', () => {
                const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
                expect(sensorsManager.formatLastMeasurement(tenMinutesAgo)).toBe('Il y a 10 min')
            })

            it('should format hours ago', () => {
                const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                expect(sensorsManager.formatLastMeasurement(twoHoursAgo)).toBe('Il y a 2 h')
            })

            it('should format days ago', () => {
                const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
                expect(sensorsManager.formatLastMeasurement(threeDaysAgo)).toBe('Il y a 3 jours')
            })

            it('should return "Jamais" for null', () => {
                expect(sensorsManager.formatLastMeasurement(null)).toBe('Jamais')
            })
        })

        describe('getPeriodLabel()', () => {
            it('should return correct labels', () => {
                expect(sensorsManager.getPeriodLabel('24h')).toBe('Dernières 24h')
                expect(sensorsManager.getPeriodLabel('7d')).toBe('Derniers 7 jours')
                expect(sensorsManager.getPeriodLabel('30d')).toBe('Derniers 30 jours')
                expect(sensorsManager.getPeriodLabel('all')).toBe('Toutes les données')
            })

            it('should return default for unknown period', () => {
                expect(sensorsManager.getPeriodLabel('unknown')).toBe('Période inconnue')
            })
        })
    })

    describe('getLastSensorMeasurement()', () => {
        it('should fetch last measurement', async () => {
            const mockMeasurement = { value: 22.5, timestamp: '2025-01-01' }
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: [mockMeasurement] })
            })

            const result = await sensorsManager.getLastSensorMeasurement('sensor1')

            expect(fetchMock).toHaveBeenCalledWith('/api/sensors/measurements?sensorId=sensor1&limit=1')
            expect(result).toEqual(mockMeasurement)
        })

        it('should return null when no measurements', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: [] })
            })

            const result = await sensorsManager.getLastSensorMeasurement('sensor1')

            expect(result).toBeNull()
        })

        it('should handle API error gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            fetchMock.mockRejectedValue(new Error('API Error'))

            const result = await sensorsManager.getLastSensorMeasurement('sensor1')

            expect(result).toBeNull()
            expect(consoleErrorSpy).toHaveBeenCalled()
            consoleErrorSpy.mockRestore()
        })
    })

    describe('openDataView()', () => {
        it('should set experiment and show data view', () => {
            sensorsManager.openDataView('exp1')

            expect(sensorsManager.selectedExperimentForData).toBe('exp1')
            expect(mockShowView).toHaveBeenCalledWith('data')
        })

        it('should handle null experiment', () => {
            sensorsManager.openDataView(null)

            expect(sensorsManager.selectedExperimentForData).toBeNull()
            expect(mockShowView).not.toHaveBeenCalled()
        })
    })

    describe('openSensorInDataView()', () => {
        it('should set experiment and show data view with URL update', () => {
            sensorsManager.openSensorInDataView('exp1')

            expect(sensorsManager.selectedExperimentForData).toBe('exp1')
            expect(mockShowView).toHaveBeenCalledWith('data', false)
            expect(mockUpdateUrl).toHaveBeenCalledWith('data', 'exp1', {})
        })
    })
})