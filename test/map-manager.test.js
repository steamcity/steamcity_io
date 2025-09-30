import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MapManager } from '../public/js/map-manager.js'

// Mock Leaflet
global.L = {
    map: vi.fn(() => ({
        setView: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        invalidateSize: vi.fn(),
        fitBounds: vi.fn(),
        removeLayer: vi.fn()
    })),
    tileLayer: vi.fn(() => ({
        addTo: vi.fn()
    })),
    circleMarker: vi.fn((latLng, options) => ({
        addTo: vi.fn().mockReturnThis(),
        bindPopup: vi.fn(),
        getLatLng: vi.fn(() => latLng)
    })),
    featureGroup: vi.fn((markers) => ({
        getBounds: vi.fn(() => 'mock-bounds')
    }))
}

describe('MapManager', () => {
    let mapManager
    let mockContainer

    beforeEach(() => {
        // Mock DOM elements
        mockContainer = document.createElement('div')
        mockContainer.id = 'map'
        document.body.appendChild(mockContainer)

        const mockLegend = document.createElement('div')
        mockLegend.id = 'map-legend'
        document.body.appendChild(mockLegend)

        // Create instance
        mapManager = new MapManager({
            containerId: 'map',
            center: [48.8566, 2.3522], // Paris
            zoom: 10,
            protocolColors: {
                environmental: '#27ae60',
                energy: '#f39c12',
                mobility: '#3498db',
                governance: '#e74c3c',
                technology: '#9b59b6',
                other: '#95a5a6'
            }
        })
    })

    afterEach(() => {
        document.body.innerHTML = ''
        vi.clearAllMocks()
    })

    describe('Constructor', () => {
        it('should create instance with default config', () => {
            const manager = new MapManager()
            expect(manager.containerId).toBe('map')
            expect(manager.center).toEqual([46.2276, 2.2137])
            expect(manager.zoom).toBe(6)
            expect(manager.map).toBeNull()
            expect(manager.markers).toEqual([])
        })

        it('should create instance with custom config', () => {
            const customManager = new MapManager({
                containerId: 'custom-map',
                center: [51.5074, -0.1278], // London
                zoom: 12,
                protocolColors: { test: '#000' }
            })

            expect(customManager.containerId).toBe('custom-map')
            expect(customManager.center).toEqual([51.5074, -0.1278])
            expect(customManager.zoom).toBe(12)
            expect(customManager.protocolColors.test).toBe('#000')
        })
    })

    describe('initialize()', () => {
        it('should initialize Leaflet map', async () => {
            await mapManager.initialize()

            expect(L.map).toHaveBeenCalledWith('map')
            expect(L.tileLayer).toHaveBeenCalled()
            expect(mapManager.map).not.toBeNull()
        })

        it('should throw error if container not found', async () => {
            const badManager = new MapManager({ containerId: 'nonexistent' })

            await expect(badManager.initialize()).rejects.toThrow('Map container #nonexistent not found')
        })

        it('should warn if already initialized', async () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            await mapManager.initialize()
            await mapManager.initialize()

            expect(consoleSpy).toHaveBeenCalledWith('Map already initialized')
            consoleSpy.mockRestore()
        })
    })

    describe('addMarkers()', () => {
        beforeEach(async () => {
            await mapManager.initialize()
        })

        it('should add markers for experiments', () => {
            const experiments = [
                {
                    id: 'exp1',
                    title: 'Test Experiment 1',
                    protocol: 'environmental',
                    protocol_name: 'Test Protocol',
                    city: 'Paris',
                    school: 'Test School',
                    description: 'Test description',
                    location: { coordinates: [2.3522, 48.8566] }
                },
                {
                    id: 'exp2',
                    title: 'Test Experiment 2',
                    protocol: 'energy',
                    protocol_name: 'Energy Protocol',
                    city: 'Lyon',
                    school: 'School 2',
                    description: 'Energy test',
                    location: { coordinates: [4.8357, 45.7640] }
                }
            ]

            mapManager.addMarkers(experiments, { fitBounds: false })

            expect(mapManager.markers.length).toBe(2)
            expect(L.circleMarker).toHaveBeenCalledTimes(2)
        })

        it('should skip experiments without location', () => {
            const experiments = [
                { id: 'exp1', title: 'Test 1' }, // No location
                {
                    id: 'exp2',
                    title: 'Test 2',
                    protocol: 'energy',
                    location: { coordinates: [2.3522, 48.8566] }
                }
            ]

            mapManager.addMarkers(experiments, { fitBounds: false })

            expect(mapManager.markers.length).toBe(1)
        })

        it('should use protocol colors', () => {
            const experiments = [
                {
                    id: 'exp1',
                    title: 'Environmental Test',
                    protocol: 'environmental',
                    location: { coordinates: [2.3522, 48.8566] }
                }
            ]

            mapManager.addMarkers(experiments, { fitBounds: false })

            expect(L.circleMarker).toHaveBeenCalledWith(
                [48.8566, 2.3522],
                expect.objectContaining({
                    fillColor: '#27ae60',
                    radius: 8
                })
            )
        })

        it('should use default color for unknown protocol', () => {
            const experiments = [
                {
                    id: 'exp1',
                    title: 'Unknown Protocol',
                    protocol: 'unknown',
                    location: { coordinates: [2.3522, 48.8566] }
                }
            ]

            mapManager.addMarkers(experiments, { fitBounds: false })

            expect(L.circleMarker).toHaveBeenCalledWith(
                [48.8566, 2.3522],
                expect.objectContaining({
                    fillColor: '#95a5a6' // other color
                })
            )
        })

        it('should warn if map not initialized', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const uninitializedManager = new MapManager()

            uninitializedManager.addMarkers([])

            expect(consoleSpy).toHaveBeenCalledWith('Map not initialized, call initialize() first')
            consoleSpy.mockRestore()
        })
    })

    describe('clearMarkers()', () => {
        beforeEach(async () => {
            await mapManager.initialize()
        })

        it('should clear all markers', () => {
            const experiments = [
                {
                    id: 'exp1',
                    title: 'Test',
                    protocol: 'environmental',
                    location: { coordinates: [2.3522, 48.8566] }
                }
            ]

            mapManager.addMarkers(experiments, { fitBounds: false })
            expect(mapManager.markers.length).toBe(1)

            mapManager.clearMarkers()
            expect(mapManager.markers.length).toBe(0)
        })
    })

    describe('centerOnVisibleMarkers()', () => {
        beforeEach(async () => {
            await mapManager.initialize()
        })

        it('should warn if no markers', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            mapManager.centerOnVisibleMarkers()

            expect(consoleSpy).toHaveBeenCalledWith('No markers to center on')
            consoleSpy.mockRestore()
        })

        it('should center on single marker', () => {
            const experiments = [
                {
                    id: 'exp1',
                    title: 'Test',
                    protocol: 'environmental',
                    location: { coordinates: [2.3522, 48.8566] }
                }
            ]

            mapManager.addMarkers(experiments, { fitBounds: false })
            mapManager.centerOnVisibleMarkers()

            expect(mapManager.map.setView).toHaveBeenCalled()
        })

        it('should fit bounds for multiple markers', () => {
            const experiments = [
                {
                    id: 'exp1',
                    title: 'Test 1',
                    protocol: 'environmental',
                    location: { coordinates: [2.3522, 48.8566] }
                },
                {
                    id: 'exp2',
                    title: 'Test 2',
                    protocol: 'energy',
                    location: { coordinates: [4.8357, 45.7640] }
                }
            ]

            mapManager.addMarkers(experiments, { fitBounds: false })
            mapManager.centerOnVisibleMarkers()

            expect(mapManager.map.fitBounds).toHaveBeenCalled()
        })
    })

    describe('filterByProtocol()', () => {
        beforeEach(async () => {
            await mapManager.initialize()
        })

        it('should filter markers by protocol', () => {
            const experiments = [
                {
                    id: 'exp1',
                    title: 'Environmental Test',
                    protocol: 'environmental',
                    location: { coordinates: [2.3522, 48.8566] }
                },
                {
                    id: 'exp2',
                    title: 'Energy Test',
                    protocol: 'energy',
                    location: { coordinates: [4.8357, 45.7640] }
                }
            ]

            mapManager.filterByProtocol('environmental', experiments, { fitBounds: false })

            expect(mapManager.markers.length).toBe(1)
            expect(mapManager.markers[0].experiment.protocol).toBe('environmental')
        })

        it('should show all markers when protocol is null', () => {
            const experiments = [
                {
                    id: 'exp1',
                    title: 'Test 1',
                    protocol: 'environmental',
                    location: { coordinates: [2.3522, 48.8566] }
                },
                {
                    id: 'exp2',
                    title: 'Test 2',
                    protocol: 'energy',
                    location: { coordinates: [4.8357, 45.7640] }
                }
            ]

            mapManager.filterByProtocol(null, experiments, { fitBounds: false })

            expect(mapManager.markers.length).toBe(2)
        })

        it('should update active filter', () => {
            const experiments = []

            mapManager.filterByProtocol('mobility', experiments)
            expect(mapManager.activeProtocolFilter).toBe('mobility')

            mapManager.filterByProtocol(null, experiments)
            expect(mapManager.activeProtocolFilter).toBeNull()
        })
    })

    describe('createLegend()', () => {
        it('should create legend HTML', () => {
            const protocols = [
                { key: 'environmental', label: '🌱 Environnement' },
                { key: 'energy', label: '⚡ Énergie' }
            ]

            mapManager.createLegend(protocols, (p) => p)

            const legend = document.getElementById('map-legend')
            expect(legend.innerHTML).toContain('Tous les clusters')
            expect(legend.innerHTML).toContain('environmental')
            expect(legend.innerHTML).toContain('energy')
        })

        it('should mark active protocol in legend', () => {
            mapManager.activeProtocolFilter = 'energy'

            const protocols = [
                { key: 'environmental', label: 'Environnement' },
                { key: 'energy', label: 'Énergie' }
            ]

            mapManager.createLegend(protocols, (p) => p)

            const legend = document.getElementById('map-legend')
            const energyItem = legend.querySelector('[data-protocol="energy"]')
            expect(energyItem.classList.contains('active')).toBe(true)
        })

        it('should warn if legend container not found', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const noLegendManager = new MapManager({ legendId: 'nonexistent' })

            noLegendManager.createLegend([], () => {})

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })
    })

    describe('updateLegendState()', () => {
        beforeEach(() => {
            const protocols = [
                { key: 'environmental', label: 'Environnement' },
                { key: 'energy', label: 'Énergie' }
            ]
            mapManager.createLegend(protocols, (p) => p)
        })

        it('should update active state', () => {
            mapManager.activeProtocolFilter = 'energy'
            mapManager.updateLegendState()

            const legend = document.getElementById('map-legend')
            const energyItem = legend.querySelector('[data-protocol="energy"]')
            const envItem = legend.querySelector('[data-protocol="environmental"]')

            expect(energyItem.classList.contains('active')).toBe(true)
            expect(envItem.classList.contains('active')).toBe(false)
        })

        it('should activate "all" when filter is null', () => {
            mapManager.activeProtocolFilter = null
            mapManager.updateLegendState()

            const legend = document.getElementById('map-legend')
            const allItem = legend.querySelector('[data-protocol=""]')

            expect(allItem.classList.contains('active')).toBe(true)
        })
    })

    describe('bindLegendEvents()', () => {
        it('should bind click events to legend items', () => {
            const protocols = [
                { key: 'environmental', label: 'Environnement' }
            ]
            mapManager.createLegend(protocols, (p) => p)

            const mockCallback = vi.fn()
            mapManager.bindLegendEvents(mockCallback)

            const legend = document.getElementById('map-legend')
            const item = legend.querySelector('[data-protocol="environmental"]')
            item.click()

            expect(mockCallback).toHaveBeenCalledWith('environmental')
        })

        it('should pass null for "all" option', () => {
            const protocols = []
            mapManager.createLegend(protocols, (p) => p)

            const mockCallback = vi.fn()
            mapManager.bindLegendEvents(mockCallback)

            const legend = document.getElementById('map-legend')
            const allItem = legend.querySelector('[data-protocol=""]')
            allItem.click()

            expect(mockCallback).toHaveBeenCalledWith(null)
        })
    })

    describe('Utility methods', () => {
        beforeEach(async () => {
            await mapManager.initialize()
        })

        it('getMapInstance() should return map', () => {
            expect(mapManager.getMapInstance()).toBe(mapManager.map)
        })

        it('getMarkers() should return markers array', () => {
            expect(mapManager.getMarkers()).toBe(mapManager.markers)
        })

        it('refresh() should invalidate map size', () => {
            mapManager.refresh()
            expect(mapManager.map.invalidateSize).toHaveBeenCalled()
        })

        it('destroy() should clean up map', () => {
            mapManager.destroy()
            expect(mapManager.map).toBeNull()
        })
    })
})