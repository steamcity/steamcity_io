import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RouterManager } from '../public/js/router-manager.js'

describe('RouterManager', () => {
    let routerManager
    let mockCallbacks

    beforeEach(() => {
        // Reset URL
        window.location.hash = ''

        // Create mock callbacks
        mockCallbacks = {
            onViewChange: vi.fn(),
            onExperimentDetail: vi.fn(),
            onSensorDetail: vi.fn(),
            onDataView: vi.fn()
        }

        routerManager = new RouterManager(mockCallbacks)
    })

    afterEach(() => {
        if (routerManager) {
            routerManager.destroy()
        }
        window.location.hash = ''
    })

    describe('Constructor', () => {
        it('should create a RouterManager instance', () => {
            expect(routerManager).toBeInstanceOf(RouterManager)
        })

        it('should initialize with null state', () => {
            expect(routerManager.currentView).toBeNull()
            expect(routerManager.currentId).toBeNull()
            expect(routerManager.urlParams).toEqual({})
        })

        it('should accept callbacks', () => {
            expect(routerManager.onViewChange).toBe(mockCallbacks.onViewChange)
            expect(routerManager.onExperimentDetail).toBe(mockCallbacks.onExperimentDetail)
        })
    })

    describe('parseUrlParams', () => {
        it('should parse simple path', () => {
            const result = routerManager.parseUrlParams('map')
            expect(result.parts).toEqual(['map'])
            expect(result.params).toEqual({})
        })

        it('should parse path with ID', () => {
            const result = routerManager.parseUrlParams('experiments/exp-001')
            expect(result.parts).toEqual(['experiments', 'exp-001'])
            expect(result.params).toEqual({})
        })

        it('should parse path with query params', () => {
            const result = routerManager.parseUrlParams('experiments?status=completed&protocol=environmental')
            expect(result.parts).toEqual(['experiments'])
            expect(result.params).toEqual({
                status: 'completed',
                protocol: 'environmental'
            })
        })

        it('should parse path with ID and query params', () => {
            const result = routerManager.parseUrlParams('data/exp-001?period=7d&type=temperature')
            expect(result.parts).toEqual(['data', 'exp-001'])
            expect(result.params).toEqual({
                period: '7d',
                type: 'temperature'
            })
        })

        it('should handle empty hash', () => {
            const result = routerManager.parseUrlParams('')
            expect(result.parts).toEqual([])
            expect(result.params).toEqual({})
        })
    })

    describe('updateUrl', () => {
        let pushStateSpy

        beforeEach(() => {
            pushStateSpy = vi.spyOn(history, 'pushState')
        })

        afterEach(() => {
            pushStateSpy.mockRestore()
        })

        it('should update URL for simple view', () => {
            routerManager.updateUrl('map')
            expect(pushStateSpy).toHaveBeenCalledWith(
                { view: 'map', id: null, queryParams: null },
                '',
                '#/map'
            )
            expect(routerManager.currentView).toBe('map')
            expect(routerManager.currentId).toBeNull()
        })

        it('should update URL with ID', () => {
            routerManager.updateUrl('experiments', 'exp-001')
            expect(pushStateSpy).toHaveBeenCalledWith(
                { view: 'experiments', id: 'exp-001', queryParams: null },
                '',
                '#/experiments/exp-001'
            )
            expect(routerManager.currentView).toBe('experiments')
            expect(routerManager.currentId).toBe('exp-001')
        })

        it('should update URL with query params', () => {
            routerManager.updateUrl('experiments', null, { status: 'active', protocol: 'energy' })
            expect(pushStateSpy).toHaveBeenCalledWith(
                expect.objectContaining({ view: 'experiments' }),
                '',
                '#/experiments?status=active&protocol=energy'
            )
        })

        it('should update URL with ID and query params', () => {
            routerManager.updateUrl('data', 'exp-001', { period: '7d' })
            expect(pushStateSpy).toHaveBeenCalledWith(
                expect.objectContaining({ view: 'data', id: 'exp-001' }),
                '',
                '#/data/exp-001?period=7d'
            )
        })

        it('should filter out null/undefined/empty query params', () => {
            routerManager.updateUrl('map', null, { a: 'value', b: null, c: undefined, d: '' })
            expect(pushStateSpy).toHaveBeenCalledWith(
                expect.anything(),
                '',
                '#/map?a=value'
            )
        })
    })

    describe('handleRoute', () => {
        it('should route to map view by default', () => {
            window.location.hash = ''
            routerManager.handleRoute(false)
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('map', false)
            expect(routerManager.currentView).toBe('map')
        })

        it('should route to map view', () => {
            window.location.hash = '#/map'
            routerManager.handleRoute(false)
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('map', false)
        })

        it('should route to experiments list', () => {
            window.location.hash = '#/experiments'
            routerManager.handleRoute(false)
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('experiments', false)
        })

        it('should route to experiment detail', () => {
            window.location.hash = '#/experiments/exp-001'
            routerManager.handleRoute(false)
            expect(mockCallbacks.onExperimentDetail).toHaveBeenCalledWith('exp-001', false)
            expect(routerManager.currentId).toBe('exp-001')
        })

        it('should route to sensors view', () => {
            window.location.hash = '#/sensors'
            routerManager.handleRoute(false)
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('sensors', false)
        })

        it('should route to sensor detail', () => {
            window.location.hash = '#/sensors/sensor-123'
            routerManager.handleRoute(false)
            expect(mockCallbacks.onSensorDetail).toHaveBeenCalledWith('sensor-123', false)
        })

        it('should route to data view', () => {
            window.location.hash = '#/data'
            routerManager.handleRoute(false)
            expect(mockCallbacks.onDataView).toHaveBeenCalledWith(null, false)
        })

        it('should route to data view with experiment', () => {
            window.location.hash = '#/data/exp-001'
            routerManager.handleRoute(false)
            expect(mockCallbacks.onDataView).toHaveBeenCalledWith('exp-001', false)
        })

        it('should parse and store URL params', () => {
            window.location.hash = '#/experiments?status=active&protocol=energy'
            routerManager.handleRoute(false)
            expect(routerManager.urlParams).toEqual({
                status: 'active',
                protocol: 'energy'
            })
        })

        it('should redirect invalid routes to map', () => {
            // Mock navigate to prevent infinite loop in JSDOM
            // (JSDOM doesn't update location.hash on pushState, causing recursion)
            const navigateSpy = vi.spyOn(routerManager, 'navigate').mockImplementation((view, id, queryParams) => {
                // Update state directly without triggering handleRoute
                routerManager.currentView = view
                routerManager.currentId = id || null
                routerManager.urlParams = queryParams || {}
                // Call the callback
                if (view === 'map') {
                    mockCallbacks.onViewChange('map', false)
                }
            })

            window.location.hash = '#/invalid-route'
            routerManager.handleRoute(false)

            // navigate should be called with 'map' to redirect invalid route
            expect(navigateSpy).toHaveBeenCalledWith('map')
            expect(routerManager.currentView).toBe('map')

            navigateSpy.mockRestore()
        })
    })

    describe('navigate', () => {
        let pushStateSpy

        beforeEach(() => {
            pushStateSpy = vi.spyOn(history, 'pushState')
        })

        afterEach(() => {
            pushStateSpy.mockRestore()
        })

        it('should navigate to a view', () => {
            window.location.hash = '#/experiments'
            routerManager.navigate('experiments')
            expect(pushStateSpy).toHaveBeenCalled()
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('experiments', false)
        })

        it('should navigate to a detail view', () => {
            window.location.hash = '#/experiments/exp-001'
            routerManager.navigate('experiments', 'exp-001')
            expect(pushStateSpy).toHaveBeenCalled()
            expect(mockCallbacks.onExperimentDetail).toHaveBeenCalledWith('exp-001', false)
        })

        it('should navigate with query params', () => {
            window.location.hash = '#/data/exp-001?period=30d'
            routerManager.navigate('data', 'exp-001', { period: '30d' })
            expect(pushStateSpy).toHaveBeenCalled()
        })
    })

    describe('getCurrentRoute', () => {
        it('should return current route info', () => {
            routerManager.updateUrl('experiments', 'exp-001', { status: 'active' })
            const route = routerManager.getCurrentRoute()
            expect(route).toEqual({
                view: 'experiments',
                id: 'exp-001',
                params: { status: 'active' }
            })
        })
    })

    describe('URL params management', () => {
        let pushStateSpy

        beforeEach(() => {
            pushStateSpy = vi.spyOn(history, 'pushState')
            routerManager.updateUrl('experiments', null, { status: 'active', protocol: 'energy' })
        })

        afterEach(() => {
            pushStateSpy.mockRestore()
        })

        it('should get all URL params', () => {
            const params = routerManager.getUrlParams()
            expect(params).toEqual({ status: 'active', protocol: 'energy' })
        })

        it('should get specific URL param', () => {
            expect(routerManager.getUrlParam('status')).toBe('active')
            expect(routerManager.getUrlParam('protocol')).toBe('energy')
        })

        it('should return default value for missing param', () => {
            expect(routerManager.getUrlParam('missing', 'default')).toBe('default')
        })

        it('should update a URL param', () => {
            pushStateSpy.mockClear()
            routerManager.updateUrlParam('status', 'completed')
            expect(pushStateSpy).toHaveBeenCalledWith(
                expect.anything(),
                '',
                expect.stringContaining('status=completed')
            )
        })

        it('should remove a URL param', () => {
            pushStateSpy.mockClear()
            routerManager.removeUrlParam('status')
            const lastCall = pushStateSpy.mock.calls[pushStateSpy.mock.calls.length - 1]
            const url = lastCall[2]
            expect(url).not.toContain('status')
            expect(url).toContain('protocol=energy')
        })
    })

    describe('Getters', () => {
        beforeEach(() => {
            routerManager.updateUrl('experiments', 'exp-001')
        })

        it('should get current view', () => {
            expect(routerManager.getCurrentView()).toBe('experiments')
        })

        it('should get current ID', () => {
            expect(routerManager.getCurrentId()).toBe('exp-001')
        })
    })

    describe('Event listeners', () => {
        it('should handle hashchange event', () => {
            routerManager.init()
            window.location.hash = '#/sensors'
            window.dispatchEvent(new Event('hashchange'))
            expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('sensors', true)
        })

        it('should clean up event listeners on destroy', () => {
            routerManager.init()
            routerManager.destroy()
            // Just verify destroy doesn't throw
            expect(true).toBe(true)
        })
    })

    describe('Regression tests for integration bugs', () => {
        beforeEach(() => {
            // Reset URL
            window.location.hash = ''

            mockCallbacks = {
                onViewChange: vi.fn(),
                onExperimentDetail: vi.fn(),
                onSensorDetail: vi.fn(),
                onDataView: vi.fn()
            }

            routerManager = new RouterManager(mockCallbacks)
        })

        afterEach(() => {
            if (routerManager) {
                routerManager.destroy()
            }
            window.location.hash = ''
        })

        describe('Bug: Experiment detail navigation', () => {
            it('should call onExperimentDetail when navigating to experiment detail', () => {
                window.location.hash = '#/experiments/exp-001'
                routerManager.handleRoute(false)

                expect(mockCallbacks.onExperimentDetail).toHaveBeenCalledWith('exp-001', false)
                expect(mockCallbacks.onViewChange).not.toHaveBeenCalled()
                expect(routerManager.currentView).toBe('experiments')
                expect(routerManager.currentId).toBe('exp-001')
            })

            it('should preserve experiment ID in URL when using navigate', () => {
                const pushStateSpy = vi.spyOn(history, 'pushState')

                // Manually set hash since JSDOM doesn't update it on pushState
                window.location.hash = '#/experiments/exp-002'
                routerManager.navigate('experiments', 'exp-002')

                expect(pushStateSpy).toHaveBeenCalledWith(
                    expect.objectContaining({ view: 'experiments', id: 'exp-002' }),
                    '',
                    '#/experiments/exp-002'
                )
                // navigate() calls handleRoute(false) which should trigger the callback
                expect(mockCallbacks.onExperimentDetail).toHaveBeenCalledWith('exp-002', false)
                expect(routerManager.currentView).toBe('experiments')
                expect(routerManager.currentId).toBe('exp-002')

                pushStateSpy.mockRestore()
            })
        })

        describe('Bug: Sensor detail URL preservation', () => {
            it('should preserve sensor ID in URL when navigating to sensor detail', () => {
                const pushStateSpy = vi.spyOn(history, 'pushState')

                routerManager.navigate('sensors', 'sensor-123')

                expect(pushStateSpy).toHaveBeenCalledWith(
                    expect.objectContaining({ view: 'sensors', id: 'sensor-123' }),
                    '',
                    '#/sensors/sensor-123'
                )

                pushStateSpy.mockRestore()
            })

            it('should preserve sensor ID with period query parameter', () => {
                const pushStateSpy = vi.spyOn(history, 'pushState')

                routerManager.navigate('sensors', 'sensor-123', { period: '30d' })

                expect(pushStateSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        view: 'sensors',
                        id: 'sensor-123',
                        queryParams: { period: '30d' }
                    }),
                    '',
                    '#/sensors/sensor-123?period=30d'
                )

                pushStateSpy.mockRestore()
            })

            it('should update period parameter without losing sensor ID', () => {
                const pushStateSpy = vi.spyOn(history, 'pushState')

                // First set the URL to establish sensor context
                routerManager.updateUrl('sensors', 'sensor-123', {})
                pushStateSpy.mockClear()

                // Update period parameter - should keep sensor-123
                routerManager.updateUrlParam('period', '7d')

                const lastCall = pushStateSpy.mock.calls[pushStateSpy.mock.calls.length - 1]
                const url = lastCall[2]
                expect(url).toContain('sensor-123')
                expect(url).toContain('period=7d')

                pushStateSpy.mockRestore()
            })
        })

        describe('Bug: Navigation to data view with experiment', () => {
            it('should call onDataView with experiment ID', () => {
                window.location.hash = '#/data/exp-005'
                routerManager.handleRoute(false)

                expect(mockCallbacks.onDataView).toHaveBeenCalledWith('exp-005', false)
                expect(routerManager.currentView).toBe('data')
                expect(routerManager.currentId).toBe('exp-005')
            })

            it('should navigate to data view from sensor with experiment ID', () => {
                const pushStateSpy = vi.spyOn(history, 'pushState')

                // Manually set hash since JSDOM doesn't update it on pushState
                window.location.hash = '#/data/exp-005'
                routerManager.navigate('data', 'exp-005')

                expect(pushStateSpy).toHaveBeenCalledWith(
                    expect.objectContaining({ view: 'data', id: 'exp-005' }),
                    '',
                    '#/data/exp-005'
                )
                expect(mockCallbacks.onDataView).toHaveBeenCalledWith('exp-005', false)
                expect(routerManager.currentView).toBe('data')
                expect(routerManager.currentId).toBe('exp-005')

                pushStateSpy.mockRestore()
            })
        })

        describe('Bug: Query parameters persistence', () => {
            it('should parse and store query parameters from URL', () => {
                window.location.hash = '#/experiments/exp-001?status=active&protocol=energy'
                routerManager.handleRoute(false)

                expect(routerManager.urlParams).toEqual({
                    status: 'active',
                    protocol: 'energy'
                })
                expect(routerManager.getUrlParam('status')).toBe('active')
                expect(routerManager.getUrlParam('protocol')).toBe('energy')
            })

            it('should maintain query parameters when updating URL', () => {
                const pushStateSpy = vi.spyOn(history, 'pushState')

                // Set initial URL with parameters
                routerManager.updateUrl('data', 'exp-001', { period: '7d', type: 'temperature' })

                expect(pushStateSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        view: 'data',
                        id: 'exp-001',
                        queryParams: { period: '7d', type: 'temperature' }
                    }),
                    '',
                    expect.stringContaining('period=7d')
                )

                pushStateSpy.mockRestore()
            })
        })

        describe('Bug: Multiple navigation calls', () => {
            it('should handle rapid navigation without race conditions', () => {
                const pushStateSpy = vi.spyOn(history, 'pushState')

                // Simulate rapid clicks - manually set hash for each since JSDOM doesn't update it
                window.location.hash = '#/experiments/exp-001'
                routerManager.navigate('experiments', 'exp-001')

                window.location.hash = '#/experiments/exp-002'
                routerManager.navigate('experiments', 'exp-002')

                window.location.hash = '#/experiments/exp-003'
                routerManager.navigate('experiments', 'exp-003')

                // Should have called pushState 3 times
                expect(pushStateSpy).toHaveBeenCalledTimes(3)

                // Final state should be exp-003
                expect(routerManager.currentView).toBe('experiments')
                expect(routerManager.currentId).toBe('exp-003')

                pushStateSpy.mockRestore()
            })

            it('should handle navigation between different views', () => {
                // Manually set hash for each navigate since JSDOM doesn't update it on pushState
                window.location.hash = '#/experiments'
                routerManager.navigate('experiments')
                expect(routerManager.currentView).toBe('experiments')
                expect(routerManager.currentId).toBeNull()

                window.location.hash = '#/sensors/sensor-001'
                routerManager.navigate('sensors', 'sensor-001')
                expect(routerManager.currentView).toBe('sensors')
                expect(routerManager.currentId).toBe('sensor-001')

                window.location.hash = '#/data/exp-001'
                routerManager.navigate('data', 'exp-001')
                expect(routerManager.currentView).toBe('data')
                expect(routerManager.currentId).toBe('exp-001')

                window.location.hash = '#/map'
                routerManager.navigate('map')
                expect(routerManager.currentView).toBe('map')
                expect(routerManager.currentId).toBeNull()
            })
        })

        describe('Bug: Back button navigation', () => {
            it('should handle popstate event correctly', () => {
                routerManager.init()

                // Navigate to experiments list
                window.location.hash = '#/experiments'
                routerManager.handleRoute(false)
                expect(routerManager.currentView).toBe('experiments')
                expect(routerManager.currentId).toBeNull()

                // Navigate to experiment detail
                window.location.hash = '#/experiments/exp-001'
                routerManager.handleRoute(false)
                expect(routerManager.currentView).toBe('experiments')
                expect(routerManager.currentId).toBe('exp-001')

                // Simulate back button (popstate) - goes back to list
                window.location.hash = '#/experiments'
                window.dispatchEvent(new PopStateEvent('popstate'))

                // Should be back on experiments list
                expect(routerManager.currentView).toBe('experiments')
                expect(routerManager.currentId).toBeNull()
            })
        })

        describe('Bug: Empty or invalid routes', () => {
            it('should handle empty hash by showing map', () => {
                window.location.hash = ''
                routerManager.handleRoute(false)

                expect(mockCallbacks.onViewChange).toHaveBeenCalledWith('map', false)
                expect(routerManager.currentView).toBe('map')
            })

            it('should redirect invalid routes to map', () => {
                // Mock navigate to prevent infinite loop in JSDOM
                // (JSDOM doesn't update location.hash on pushState, causing recursion)
                const navigateSpy = vi.spyOn(routerManager, 'navigate').mockImplementation((view, id, queryParams) => {
                    // Update state directly without triggering handleRoute
                    routerManager.currentView = view
                    routerManager.currentId = id || null
                    routerManager.urlParams = queryParams || {}
                    // Call the callback
                    if (view === 'map') {
                        mockCallbacks.onViewChange('map', false)
                    }
                })

                window.location.hash = '#/invalid-route-xyz'
                routerManager.handleRoute(false)

                expect(navigateSpy).toHaveBeenCalledWith('map')
                expect(routerManager.currentView).toBe('map')

                navigateSpy.mockRestore()
            })
        })
    })
})
