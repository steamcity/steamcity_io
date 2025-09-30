import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ExperimentsManager } from '../public/js/experiments-manager.js'

describe('ExperimentsManager', () => {
    let experimentsManager
    let mockExperiments
    let mockApiService
    let mockProtocolColors
    let mockGetProtocolLabel
    let mockGetProtocolIcon

    beforeEach(() => {
        // Setup mock data
        mockExperiments = [
            {
                id: 'exp1',
                title: 'Test Experiment 1',
                description: 'Description 1',
                city: 'Paris',
                school: 'School A',
                protocol: 'environmental',
                status: 'active'
            },
            {
                id: 'exp2',
                title: 'Test Experiment 2',
                description: 'Description 2',
                city: 'Lyon',
                school: 'School B',
                protocol: 'energy',
                status: 'completed'
            }
        ]

        mockProtocolColors = {
            environmental: '#27ae60',
            energy: '#f39c12',
            other: '#95a5a6'
        }

        mockGetProtocolLabel = vi.fn((protocol) => {
            const labels = {
                environmental: 'Environnement',
                energy: 'Énergie'
            }
            return labels[protocol] || protocol
        })

        mockGetProtocolIcon = vi.fn((protocol) => {
            const icons = {
                environmental: '🌱',
                energy: '⚡'
            }
            return icons[protocol] || '📊'
        })

        mockApiService = {
            fetchMeasurements: vi.fn(),
            fetchSensorDevices: vi.fn(),
            fetchSensorTypes: vi.fn()
        }

        // Create instance
        experimentsManager = new ExperimentsManager({
            experiments: mockExperiments,
            protocolColors: mockProtocolColors,
            getProtocolLabel: mockGetProtocolLabel,
            getProtocolIcon: mockGetProtocolIcon,
            apiService: mockApiService
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Constructor', () => {
        it('should initialize with provided experiments', () => {
            expect(experimentsManager.experiments).toEqual(mockExperiments)
        })

        it('should initialize with default empty experiments', () => {
            const manager = new ExperimentsManager()
            expect(manager.experiments).toEqual([])
        })

        it('should initialize protocol colors', () => {
            expect(experimentsManager.protocolColors).toEqual(mockProtocolColors)
        })

        it('should initialize with no active filter', () => {
            expect(experimentsManager.activeExperimentFilter).toBeNull()
        })

        it('should initialize with null cache', () => {
            expect(experimentsManager.experimentsWithSensorsCache).toBeNull()
        })
    })

    describe('createExperimentCard()', () => {
        it('should create experiment card with correct structure', () => {
            const mockCard = { className: '', innerHTML: '', addEventListener: vi.fn() }
            document.createElement = vi.fn(() => mockCard)

            const card = experimentsManager.createExperimentCard(mockExperiments[0], [])

            expect(document.createElement).toHaveBeenCalledWith('div')
            expect(card.className).toContain('experiment-card')
            expect(card.className).toContain('environmental')
            expect(card.innerHTML).toContain('Test Experiment 1')
            expect(card.innerHTML).toContain('Description 1')
            expect(card.innerHTML).toContain('Paris')
        })

        it('should add sensor indicator for experiments with data', () => {
            const mockCard = { className: '', innerHTML: '', addEventListener: vi.fn() }
            document.createElement = vi.fn(() => mockCard)

            const card = experimentsManager.createExperimentCard(mockExperiments[0], ['exp1'])

            expect(card.className).toContain('has-sensors')
            expect(card.innerHTML).toContain('📊')
            expect(card.innerHTML).toContain('Données de capteurs disponibles')
        })

        it('should not add sensor indicator for experiments without data', () => {
            const mockCard = { className: '', innerHTML: '', addEventListener: vi.fn() }
            document.createElement = vi.fn(() => mockCard)

            const card = experimentsManager.createExperimentCard(mockExperiments[0], [])

            expect(card.className).not.toContain('has-sensors')
            expect(card.innerHTML).not.toContain('📊')
        })

        it('should call onExperimentClick when card is clicked', () => {
            const mockCallback = vi.fn()
            experimentsManager.onExperimentClick = mockCallback

            const mockCard = { className: '', innerHTML: '', addEventListener: vi.fn() }
            document.createElement = vi.fn(() => mockCard)

            experimentsManager.createExperimentCard(mockExperiments[0], [])

            // Simulate click
            const clickHandler = mockCard.addEventListener.mock.calls[0][1]
            clickHandler()

            expect(mockCallback).toHaveBeenCalledWith('exp1')
        })
    })

    describe('getExperimentsWithSensors()', () => {
        it('should fetch experiments with sensor data', async () => {
            mockApiService.fetchMeasurements.mockResolvedValue([
                { experiment_id: 'exp1', value: 25 },
                { experiment_id: 'exp2', value: 30 },
                { experiment_id: 'exp1', value: 26 }
            ])

            const result = await experimentsManager.getExperimentsWithSensors()

            expect(mockApiService.fetchMeasurements).toHaveBeenCalledWith({ limit: 1000 })
            expect(result).toEqual(['exp1', 'exp2'])
        })

        it('should return empty array when no measurements', async () => {
            mockApiService.fetchMeasurements.mockResolvedValue([])

            const result = await experimentsManager.getExperimentsWithSensors()

            expect(result).toEqual([])
        })

        it('should handle API errors gracefully', async () => {
            mockApiService.fetchMeasurements.mockRejectedValue(new Error('API Error'))

            const result = await experimentsManager.getExperimentsWithSensors()

            expect(result).toEqual([])
        })

        it('should use cache on subsequent calls', async () => {
            mockApiService.fetchMeasurements.mockResolvedValue([
                { experiment_id: 'exp1', value: 25 }
            ])

            // First call
            const result1 = await experimentsManager.getExperimentsWithSensors()
            // Second call
            const result2 = await experimentsManager.getExperimentsWithSensors()

            expect(mockApiService.fetchMeasurements).toHaveBeenCalledTimes(1)
            expect(result1).toEqual(result2)
        })

        it('should return empty array when apiService is null', async () => {
            experimentsManager.apiService = null

            const result = await experimentsManager.getExperimentsWithSensors()

            expect(result).toEqual([])
        })
    })

    describe('loadExperimentsList()', () => {
        it('should warn when container not found', async () => {
            document.getElementById = vi.fn(() => null)
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            await experimentsManager.loadExperimentsList()

            expect(consoleWarnSpy).toHaveBeenCalledWith('Container #experiments-list not found')
            consoleWarnSpy.mockRestore()
        })

        it('should load experiments list successfully', async () => {
            const mockContainer = { innerHTML: '', appendChild: vi.fn() }
            document.getElementById = vi.fn(() => mockContainer)
            document.createElement = vi.fn(() => ({ className: '', innerHTML: '', addEventListener: vi.fn() }))

            mockApiService.fetchMeasurements.mockResolvedValue([])
            experimentsManager.createExperimentsLegend = vi.fn()

            await experimentsManager.loadExperimentsList()

            expect(mockContainer.innerHTML).toBe('')
            expect(mockContainer.appendChild).toHaveBeenCalledTimes(2) // 2 experiments
        })

        it('should skip legend creation when withLegend is false', async () => {
            const mockContainer = { innerHTML: '', appendChild: vi.fn() }
            document.getElementById = vi.fn(() => mockContainer)
            document.createElement = vi.fn(() => ({ className: '', innerHTML: '', addEventListener: vi.fn() }))

            mockApiService.fetchMeasurements.mockResolvedValue([])
            experimentsManager.createExperimentsLegend = vi.fn()

            await experimentsManager.loadExperimentsList({ withLegend: false })

            expect(experimentsManager.createExperimentsLegend).not.toHaveBeenCalled()
        })

        it('should skip sensor checking when checkSensors is false', async () => {
            const mockContainer = { innerHTML: '', appendChild: vi.fn() }
            document.getElementById = vi.fn(() => mockContainer)
            document.createElement = vi.fn(() => ({ className: '', innerHTML: '', addEventListener: vi.fn() }))

            experimentsManager.getExperimentsWithSensors = vi.fn()

            await experimentsManager.loadExperimentsList({ checkSensors: false, withLegend: false })

            expect(experimentsManager.getExperimentsWithSensors).not.toHaveBeenCalled()
        })
    })

    describe('filterExperiments()', () => {
        it('should filter experiments by protocol', async () => {
            const mockContainer = { innerHTML: '', appendChild: vi.fn() }
            document.getElementById = vi.fn(() => mockContainer)
            document.createElement = vi.fn(() => ({ className: '', innerHTML: '', addEventListener: vi.fn() }))

            mockApiService.fetchMeasurements.mockResolvedValue([])

            await experimentsManager.filterExperiments('environmental')

            expect(mockContainer.appendChild).toHaveBeenCalledTimes(1) // Only 1 environmental
        })

        it('should show all experiments when protocol is null', async () => {
            const mockContainer = { innerHTML: '', appendChild: vi.fn() }
            document.getElementById = vi.fn(() => mockContainer)
            document.createElement = vi.fn(() => ({ className: '', innerHTML: '', addEventListener: vi.fn() }))

            mockApiService.fetchMeasurements.mockResolvedValue([])

            await experimentsManager.filterExperiments(null)

            expect(mockContainer.appendChild).toHaveBeenCalledTimes(2) // All experiments
        })

        it('should return early when container not found', async () => {
            document.getElementById = vi.fn(() => null)

            await experimentsManager.filterExperiments('energy')

            // No error should be thrown
            expect(document.getElementById).toHaveBeenCalledWith('experiments-list')
        })
    })

    describe('createExperimentsLegend()', () => {
        it('should create legend with all protocols', () => {
            const mockLegend = { innerHTML: '', querySelectorAll: vi.fn(() => []) }
            document.getElementById = vi.fn(() => mockLegend)

            experimentsManager.createExperimentsLegend()

            expect(mockLegend.innerHTML).toContain('Tous les clusters')
            expect(mockLegend.innerHTML).toContain('Environnement')
            expect(mockLegend.innerHTML).toContain('Énergie')
            expect(mockLegend.innerHTML).toContain('#27ae60')
            expect(mockLegend.innerHTML).toContain('#f39c12')
        })

        it('should mark active filter in legend', () => {
            experimentsManager.activeExperimentFilter = 'energy'

            const mockLegend = { innerHTML: '', querySelectorAll: vi.fn(() => []) }
            document.getElementById = vi.fn(() => mockLegend)

            experimentsManager.createExperimentsLegend()

            expect(mockLegend.innerHTML).toContain('data-protocol="energy"')
            // Active class should be set via string manipulation
        })

        it('should warn when legend container not found', () => {
            document.getElementById = vi.fn(() => null)
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            experimentsManager.createExperimentsLegend()

            expect(consoleWarnSpy).toHaveBeenCalledWith('Legend container #experiments-legend not found')
            consoleWarnSpy.mockRestore()
        })
    })

    describe('filterExperimentsByLegend()', () => {
        it('should update active filter and refresh list', async () => {
            experimentsManager.filterExperiments = vi.fn()
            experimentsManager.updateExperimentsLegendState = vi.fn()

            await experimentsManager.filterExperimentsByLegend('energy')

            expect(experimentsManager.activeExperimentFilter).toBe('energy')
            expect(experimentsManager.filterExperiments).toHaveBeenCalledWith('energy')
            expect(experimentsManager.updateExperimentsLegendState).toHaveBeenCalled()
        })

        it('should set filter to null for empty string', async () => {
            experimentsManager.filterExperiments = vi.fn()
            experimentsManager.updateExperimentsLegendState = vi.fn()

            await experimentsManager.filterExperimentsByLegend('')

            expect(experimentsManager.activeExperimentFilter).toBeNull()
        })
    })

    describe('updateExperimentsLegendState()', () => {
        it('should update legend item active states', () => {
            const mockItems = [
                { getAttribute: vi.fn(() => ''), classList: { toggle: vi.fn() } },
                { getAttribute: vi.fn(() => 'energy'), classList: { toggle: vi.fn() } }
            ]
            const mockLegend = { querySelectorAll: vi.fn(() => mockItems) }
            document.getElementById = vi.fn(() => mockLegend)

            experimentsManager.activeExperimentFilter = 'energy'
            experimentsManager.updateExperimentsLegendState()

            expect(mockItems[0].classList.toggle).toHaveBeenCalledWith('active', false)
            expect(mockItems[1].classList.toggle).toHaveBeenCalledWith('active', true)
        })

        it('should return early when legend not found', () => {
            document.getElementById = vi.fn(() => null)

            experimentsManager.updateExperimentsLegendState()

            // No error should be thrown
            expect(document.getElementById).toHaveBeenCalledWith('experiments-legend')
        })
    })

    describe('loadExperimentDetails()', () => {
        it('should load experiment details successfully', async () => {
            const mockExperiment = mockExperiments[0]
            const mockElements = {
                title: { textContent: '' },
                info: { innerHTML: '' },
                sensors: { innerHTML: '' },
                methodology: { innerHTML: '' },
                hypotheses: { innerHTML: '' },
                conclusions: { innerHTML: '' }
            }

            document.getElementById = vi.fn((id) => {
                const map = {
                    'experiment-detail-title': mockElements.title,
                    'experiment-info': mockElements.info,
                    'experiment-sensors': mockElements.sensors,
                    'experiment-methodology': mockElements.methodology,
                    'experiment-hypotheses': mockElements.hypotheses,
                    'experiment-conclusions': mockElements.conclusions
                }
                return map[id]
            })

            mockApiService.fetchSensorDevices.mockResolvedValue([])
            mockApiService.fetchSensorTypes.mockResolvedValue([])

            await experimentsManager.loadExperimentDetails(mockExperiment)

            expect(mockElements.title.textContent).toBe('Test Experiment 1')
            expect(mockElements.info.innerHTML).toContain('Paris')
            expect(mockElements.info.innerHTML).toContain('School A')
        })

        it('should warn when no experiment provided', async () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            await experimentsManager.loadExperimentDetails(null)

            expect(consoleWarnSpy).toHaveBeenCalledWith('No experiment provided')
            consoleWarnSpy.mockRestore()
        })

        it('should call applyClusterColor callback when provided', async () => {
            const mockApplyColor = vi.fn()
            const mockExperiment = mockExperiments[0]

            document.getElementById = vi.fn(() => ({ textContent: '', innerHTML: '' }))
            mockApiService.fetchSensorDevices.mockResolvedValue([])
            mockApiService.fetchSensorTypes.mockResolvedValue([])

            await experimentsManager.loadExperimentDetails(mockExperiment, {
                applyClusterColor: mockApplyColor
            })

            expect(mockApplyColor).toHaveBeenCalledWith('#27ae60')
        })
    })

    describe('Utility methods', () => {
        it('setExperiments() should update experiments and clear cache', () => {
            experimentsManager.experimentsWithSensorsCache = ['exp1']

            const newExperiments = [{ id: 'exp3', title: 'New Exp' }]
            experimentsManager.setExperiments(newExperiments)

            expect(experimentsManager.experiments).toEqual(newExperiments)
            expect(experimentsManager.experimentsWithSensorsCache).toBeNull()
        })

        it('getExperimentById() should return experiment when found', () => {
            const result = experimentsManager.getExperimentById('exp1')

            expect(result).toEqual(mockExperiments[0])
        })

        it('getExperimentById() should return null when not found', () => {
            const result = experimentsManager.getExperimentById('nonexistent')

            expect(result).toBeNull()
        })

        it('resetFilters() should clear active filter', () => {
            experimentsManager.activeExperimentFilter = 'energy'
            experimentsManager.updateExperimentsLegendState = vi.fn()

            experimentsManager.resetFilters()

            expect(experimentsManager.activeExperimentFilter).toBeNull()
            expect(experimentsManager.updateExperimentsLegendState).toHaveBeenCalled()
        })
    })
})