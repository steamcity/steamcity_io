import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ViewManager } from '../public/js/view-manager.js'
import { JSDOM } from 'jsdom'

describe('ViewManager', () => {
    let viewManager
    let mockManagers
    let mockCallbacks
    let dom

    beforeEach(() => {
        // Setup JSDOM
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div class="nav-button" id="map-tab"></div>
                <div class="nav-button" id="experiments-tab"></div>
                <div class="nav-button" id="sensors-tab"></div>
                <div class="nav-button" id="data-tab"></div>

                <div class="view" id="map-view"></div>
                <div class="view" id="experiments-view"></div>
                <div class="view" id="experiment-detail-view"></div>
                <div class="view" id="sensors-view"></div>
                <div class="view" id="sensor-detail-view"></div>
                <div class="view" id="data-view"></div>
            </body>
            </html>
        `)

        global.document = dom.window.document
        global.window = dom.window

        // Mock managers
        mockManagers = {
            mapManager: {
                getMapInstance: vi.fn(() => ({
                    invalidateSize: vi.fn()
                })),
                centerOnVisibleMarkers: vi.fn()
            },
            experimentsManager: {
                loadExperimentsList: vi.fn().mockResolvedValue(),
                loadExperimentDetails: vi.fn().mockResolvedValue()
            },
            sensorsManager: {
                loadSensorsView: vi.fn().mockResolvedValue(),
                showSensorDetails: vi.fn().mockResolvedValue()
            },
            dataVisualizationManager: {
                loadChartData: vi.fn().mockResolvedValue(),
                bindDataFilterEvents: vi.fn()
            }
        }

        // Mock callbacks
        mockCallbacks = {
            onViewChange: vi.fn()
        }

        // Create ViewManager instance
        viewManager = new ViewManager({
            ...mockManagers,
            ...mockCallbacks
        })
    })

    describe('Constructor', () => {
        it('should create instance with default values', () => {
            const vm = new ViewManager()
            expect(vm.currentView).toBeNull()
            expect(vm.selectedExperimentForData).toBeNull()
        })

        it('should store managers from config', () => {
            expect(viewManager.mapManager).toBe(mockManagers.mapManager)
            expect(viewManager.experimentsManager).toBe(mockManagers.experimentsManager)
            expect(viewManager.sensorsManager).toBe(mockManagers.sensorsManager)
            expect(viewManager.dataVisualizationManager).toBe(mockManagers.dataVisualizationManager)
        })
    })

    describe('showView', () => {
        it('should switch to map view', async () => {
            await viewManager.showView('map')

            expect(viewManager.currentView).toBe('map')
            expect(document.getElementById('map-view').classList.contains('active')).toBe(true)
            expect(document.getElementById('map-tab').classList.contains('active')).toBe(true)
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('map', true)
        })

        it('should switch to experiments view', async () => {
            await viewManager.showView('experiments')

            expect(viewManager.currentView).toBe('experiments')
            expect(document.getElementById('experiments-view').classList.contains('active')).toBe(true)
            expect(document.getElementById('experiments-tab').classList.contains('active')).toBe(true)
            expect(mockManagers.experimentsManager.loadExperimentsList).toHaveBeenCalledWith({
                withLegend: true,
                checkSensors: true
            })
        })

        it('should switch to sensors view', async () => {
            await viewManager.showView('sensors')

            expect(viewManager.currentView).toBe('sensors')
            expect(document.getElementById('sensors-view').classList.contains('active')).toBe(true)
            expect(document.getElementById('sensors-tab').classList.contains('active')).toBe(true)
            expect(mockManagers.sensorsManager.loadSensorsView).toHaveBeenCalled()
        })

        it('should switch to data view', async () => {
            viewManager.selectedExperimentForData = 'exp-001'
            await viewManager.showView('data')

            expect(viewManager.currentView).toBe('data')
            expect(document.getElementById('data-view').classList.contains('active')).toBe(true)
            expect(document.getElementById('data-tab').classList.contains('active')).toBe(true)
            expect(mockManagers.dataVisualizationManager.loadChartData).toHaveBeenCalledWith('exp-001')
            expect(mockManagers.dataVisualizationManager.bindDataFilterEvents).toHaveBeenCalled()
        })

        it('should hide other views when switching', async () => {
            // First show map
            await viewManager.showView('map')
            expect(document.getElementById('map-view').classList.contains('active')).toBe(true)

            // Then switch to experiments
            await viewManager.showView('experiments')
            expect(document.getElementById('map-view').classList.contains('active')).toBe(false)
            expect(document.getElementById('experiments-view').classList.contains('active')).toBe(true)
        })

        it('should update navigation buttons correctly', async () => {
            await viewManager.showView('map')
            expect(document.getElementById('map-tab').classList.contains('active')).toBe(true)
            expect(document.getElementById('experiments-tab').classList.contains('active')).toBe(false)

            await viewManager.showView('experiments')
            expect(document.getElementById('map-tab').classList.contains('active')).toBe(false)
            expect(document.getElementById('experiments-tab').classList.contains('active')).toBe(true)
        })

        it('should pass updateUrl option to onViewChange callback', async () => {
            await viewManager.showView('map', { updateUrl: false })
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('map', false)

            await viewManager.showView('experiments', { updateUrl: true })
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('experiments', true)
        })
    })

    describe('updateActiveNavButton', () => {
        it('should activate map button', () => {
            viewManager.updateActiveNavButton('map')
            expect(document.getElementById('map-tab').classList.contains('active')).toBe(true)
            expect(document.getElementById('experiments-tab').classList.contains('active')).toBe(false)
        })

        it('should deactivate other buttons', () => {
            // Activate map first
            document.getElementById('map-tab').classList.add('active')
            document.getElementById('data-tab').classList.add('active')

            // Update to experiments
            viewManager.updateActiveNavButton('experiments')

            expect(document.getElementById('map-tab').classList.contains('active')).toBe(false)
            expect(document.getElementById('data-tab').classList.contains('active')).toBe(false)
            expect(document.getElementById('experiments-tab').classList.contains('active')).toBe(true)
        })
    })

    describe('showExperimentDetail', () => {
        it('should show experiment detail view', async () => {
            const experiment = { id: 'exp-001', title: 'Test Experiment' }
            await viewManager.showExperimentDetail('exp-001', experiment, {})

            expect(viewManager.currentView).toBe('experiments')
            expect(document.getElementById('experiment-detail-view').classList.contains('active')).toBe(true)
            expect(document.getElementById('experiments-tab').classList.contains('active')).toBe(true)
            expect(mockManagers.experimentsManager.loadExperimentDetails).toHaveBeenCalledWith(experiment, {})
        })

        it('should hide other views', async () => {
            // First show map
            await viewManager.showView('map')
            expect(document.getElementById('map-view').classList.contains('active')).toBe(true)

            // Then show experiment detail
            const experiment = { id: 'exp-001' }
            await viewManager.showExperimentDetail('exp-001', experiment)

            expect(document.getElementById('map-view').classList.contains('active')).toBe(false)
            expect(document.getElementById('experiment-detail-view').classList.contains('active')).toBe(true)
        })
    })

    describe('showSensorDetail', () => {
        it('should show sensor detail view', async () => {
            await viewManager.showSensorDetail('sensor-001')

            expect(viewManager.currentView).toBe('sensors')
            expect(document.getElementById('sensor-detail-view').classList.contains('active')).toBe(true)
            expect(document.getElementById('sensors-tab').classList.contains('active')).toBe(true)
            expect(mockManagers.sensorsManager.showSensorDetails).toHaveBeenCalledWith('sensor-001', false)
        })

        it('should hide other views', async () => {
            // First show experiments
            await viewManager.showView('experiments')
            expect(document.getElementById('experiments-view').classList.contains('active')).toBe(true)

            // Then show sensor detail
            await viewManager.showSensorDetail('sensor-001')

            expect(document.getElementById('experiments-view').classList.contains('active')).toBe(false)
            expect(document.getElementById('sensor-detail-view').classList.contains('active')).toBe(true)
        })
    })

    describe('initializeMapView', () => {
        it('should refresh map when already initialized', async () => {
            await viewManager.initializeMapView()

            // Wait for setTimeout
            await new Promise(resolve => setTimeout(resolve, 100))

            expect(mockManagers.mapManager.getMapInstance).toHaveBeenCalled()
            expect(mockManagers.mapManager.centerOnVisibleMarkers).toHaveBeenCalled()
        })

        it('should handle missing mapManager gracefully', async () => {
            viewManager.mapManager = null
            await expect(viewManager.initializeMapView()).resolves.not.toThrow()
        })

        it('should handle null map instance', async () => {
            mockManagers.mapManager.getMapInstance.mockReturnValue(null)
            await expect(viewManager.initializeMapView()).resolves.not.toThrow()
        })
    })

    describe('setSelectedExperimentForData', () => {
        it('should set selected experiment', () => {
            viewManager.setSelectedExperimentForData('exp-001')
            expect(viewManager.selectedExperimentForData).toBe('exp-001')
        })

        it('should update to null', () => {
            viewManager.setSelectedExperimentForData('exp-001')
            viewManager.setSelectedExperimentForData(null)
            expect(viewManager.selectedExperimentForData).toBeNull()
        })
    })

    describe('getCurrentView', () => {
        it('should return null initially', () => {
            expect(viewManager.getCurrentView()).toBeNull()
        })

        it('should return current view after showView', async () => {
            await viewManager.showView('map')
            expect(viewManager.getCurrentView()).toBe('map')

            await viewManager.showView('experiments')
            expect(viewManager.getCurrentView()).toBe('experiments')
        })
    })

    describe('showExperimentsList', () => {
        it('should navigate to experiments view', async () => {
            await viewManager.showExperimentsList()

            expect(viewManager.currentView).toBe('experiments')
            expect(document.getElementById('experiments-view').classList.contains('active')).toBe(true)
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('experiments', true)
        })
    })

    describe('showSensorsList', () => {
        it('should navigate to sensors view', async () => {
            await viewManager.showSensorsList()

            expect(viewManager.currentView).toBe('sensors')
            expect(document.getElementById('sensors-view').classList.contains('active')).toBe(true)
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('sensors', true)
        })
    })

    describe('Error handling', () => {
        it('should handle missing view element gracefully', async () => {
            await expect(viewManager.showView('nonexistent')).resolves.not.toThrow()
        })

        it('should handle missing manager for experiments', async () => {
            viewManager.experimentsManager = null
            await expect(viewManager.initializeExperimentsView()).resolves.not.toThrow()
        })

        it('should handle missing manager for sensors', async () => {
            viewManager.sensorsManager = null
            await expect(viewManager.initializeSensorsView()).resolves.not.toThrow()
        })

        it('should handle missing manager for data', async () => {
            viewManager.dataVisualizationManager = null
            await expect(viewManager.initializeDataView()).resolves.not.toThrow()
        })
    })

    describe('Regression: View initialization callbacks', () => {
        it('should call onInitializeExperiments callback when showing experiments view', async () => {
            const onInitializeExperiments = vi.fn().mockResolvedValue()
            viewManager.onInitializeExperiments = onInitializeExperiments

            await viewManager.showView('experiments')

            expect(onInitializeExperiments).toHaveBeenCalled()
        })

        it('should call onInitializeSensors callback when showing sensors view', async () => {
            const onInitializeSensors = vi.fn().mockResolvedValue()
            viewManager.onInitializeSensors = onInitializeSensors

            await viewManager.showView('sensors')

            expect(onInitializeSensors).toHaveBeenCalled()
        })

        it('should call onInitializeMap callback when showing map view', async () => {
            const onInitializeMap = vi.fn().mockResolvedValue()
            viewManager.onInitializeMap = onInitializeMap

            await viewManager.showView('map')

            expect(onInitializeMap).toHaveBeenCalled()
        })

        it('should call onInitializeData callback when showing data view', async () => {
            const onInitializeData = vi.fn().mockResolvedValue()
            viewManager.onInitializeData = onInitializeData
            viewManager.setSelectedExperimentForData('exp-001')

            await viewManager.showView('data')

            expect(onInitializeData).toHaveBeenCalledWith('exp-001')
        })

        it('should fallback to manager methods if callbacks not provided', async () => {
            // Remove callback
            viewManager.onInitializeExperiments = null

            await viewManager.showView('experiments')

            // Should call manager method directly
            expect(mockManagers.experimentsManager.loadExperimentsList).toHaveBeenCalledWith({
                withLegend: true,
                checkSensors: true
            })
        })

        it('should not call manager method if callback is provided', async () => {
            const onInitializeExperiments = vi.fn().mockResolvedValue()
            viewManager.onInitializeExperiments = onInitializeExperiments

            // Clear previous calls
            mockManagers.experimentsManager.loadExperimentsList.mockClear()

            await viewManager.showView('experiments')

            // Should call callback, not manager method directly
            expect(onInitializeExperiments).toHaveBeenCalled()
            expect(mockManagers.experimentsManager.loadExperimentsList).not.toHaveBeenCalled()
        })
    })
})
