import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ApiService } from '../public/js/api-service.js'

describe('ApiService', () => {
    let apiService
    let fetchMock

    beforeEach(() => {
        apiService = new ApiService('/api')

        // Mock global fetch
        fetchMock = vi.fn()
        global.fetch = fetchMock
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Initialization', () => {
        it('should initialize with default baseUrl', () => {
            const service = new ApiService()
            expect(service.baseUrl).toBe('/api')
        })

        it('should initialize with custom baseUrl', () => {
            const service = new ApiService('https://example.com/api')
            expect(service.baseUrl).toBe('https://example.com/api')
        })

        it('should have default headers', () => {
            expect(apiService.defaultHeaders).toEqual({
                'Content-Type': 'application/json'
            })
        })
    })

    describe('Error Handling', () => {
        it('should throw error on HTTP error response', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            })

            await expect(apiService.fetchExperiments()).rejects.toThrow('HTTP Error 404: Not Found')
        })

        it('should throw error on network failure', async () => {
            fetchMock.mockRejectedValue(new Error('Network error'))

            await expect(apiService.fetchExperiments()).rejects.toThrow('Network error')
        })

        it('should log errors to console', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            fetchMock.mockRejectedValue(new Error('Test error'))

            try {
                await apiService.fetchExperiments()
            } catch (e) {
                // Expected to throw
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('API Error'),
                expect.any(Error)
            )

            consoleErrorSpy.mockRestore()
        })
    })

    describe('fetchExperiments', () => {
        it('should fetch experiments successfully', async () => {
            const mockExperiments = [
                { id: 'exp1', name: 'Experiment 1' },
                { id: 'exp2', name: 'Experiment 2' }
            ]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockExperiments
            })

            const result = await apiService.fetchExperiments()

            expect(fetchMock).toHaveBeenCalledWith(
                '/api/experiments',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            )
            expect(result).toEqual(mockExperiments)
        })
    })

    describe('fetchExperimentById', () => {
        it('should fetch experiment by id', async () => {
            const mockExperiment = { id: 'exp1', name: 'Experiment 1' }

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockExperiment
            })

            const result = await apiService.fetchExperimentById('exp1')

            expect(fetchMock).toHaveBeenCalledWith(
                '/api/experiments/exp1',
                expect.any(Object)
            )
            expect(result).toEqual(mockExperiment)
        })
    })

    describe('fetchSensors', () => {
        it('should fetch sensors without params', async () => {
            const mockSensors = [{ id: 'sensor1' }]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockSensors
            })

            const result = await apiService.fetchSensors()

            expect(fetchMock).toHaveBeenCalledWith('/api/sensors', expect.any(Object))
            expect(result).toEqual(mockSensors)
        })

        it('should fetch sensors with params', async () => {
            const mockSensors = [{ id: 'sensor1' }]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockSensors
            })

            const result = await apiService.fetchSensors({ experimentId: 'exp1', limit: 10 })

            expect(fetchMock).toHaveBeenCalledWith(
                '/api/sensors?experimentId=exp1&limit=10',
                expect.any(Object)
            )
            expect(result).toEqual(mockSensors)
        })
    })

    describe('fetchSensorDevices', () => {
        it('should fetch sensor devices without params', async () => {
            const mockDevices = [{ id: 'device1' }]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockDevices
            })

            const result = await apiService.fetchSensorDevices()

            expect(fetchMock).toHaveBeenCalledWith('/api/sensors/devices', expect.any(Object))
            expect(result).toEqual(mockDevices)
        })

        it('should fetch sensor devices with params', async () => {
            const mockDevices = [{ id: 'device1' }]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockDevices
            })

            const result = await apiService.fetchSensorDevices({ experimentId: 'exp1' })

            expect(fetchMock).toHaveBeenCalledWith(
                '/api/sensors/devices?experimentId=exp1',
                expect.any(Object)
            )
            expect(result).toEqual(mockDevices)
        })
    })

    describe('fetchSensorById', () => {
        it('should fetch sensor by id', async () => {
            const mockSensor = { id: 'sensor1', type: 'temperature' }

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockSensor
            })

            const result = await apiService.fetchSensorById('sensor1')

            expect(fetchMock).toHaveBeenCalledWith('/api/sensors/devices/sensor1', expect.any(Object))
            expect(result).toEqual(mockSensor)
        })
    })

    describe('fetchSensorTypes', () => {
        it('should fetch sensor types', async () => {
            const mockTypes = ['temperature', 'humidity', 'co2']

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockTypes
            })

            const result = await apiService.fetchSensorTypes()

            expect(fetchMock).toHaveBeenCalledWith('/api/sensors/types', expect.any(Object))
            expect(result).toEqual(mockTypes)
        })
    })

    describe('fetchMeasurements', () => {
        it('should fetch measurements without params', async () => {
            const mockMeasurements = [{ value: 22.5, timestamp: '2025-01-01' }]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockMeasurements
            })

            const result = await apiService.fetchMeasurements()

            expect(fetchMock).toHaveBeenCalledWith('/api/sensors/measurements', expect.any(Object))
            expect(result).toEqual(mockMeasurements)
        })

        it('should fetch measurements with all params', async () => {
            const mockMeasurements = [{ value: 22.5 }]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockMeasurements
            })

            const params = {
                experimentId: 'exp1',
                sensorId: 'sensor1',
                period: '7d',
                limit: 1000,
                from: '2025-01-01',
                to: '2025-01-31'
            }

            const result = await apiService.fetchMeasurements(params)

            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/api/sensors/measurements?'),
                expect.any(Object)
            )

            const calledUrl = fetchMock.mock.calls[0][0]
            expect(calledUrl).toContain('experimentId=exp1')
            expect(calledUrl).toContain('sensorId=sensor1')
            expect(calledUrl).toContain('period=7d')
            expect(calledUrl).toContain('limit=1000')

            expect(result).toEqual(mockMeasurements)
        })

        it('should filter out null and undefined params', async () => {
            const mockMeasurements = [{ value: 22.5 }]

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockMeasurements
            })

            const params = {
                experimentId: 'exp1',
                sensorId: null,
                period: undefined,
                limit: 1000
            }

            await apiService.fetchMeasurements(params)

            const calledUrl = fetchMock.mock.calls[0][0]
            expect(calledUrl).toContain('experimentId=exp1')
            expect(calledUrl).toContain('limit=1000')
            expect(calledUrl).not.toContain('sensorId')
            expect(calledUrl).not.toContain('period')
        })
    })

    describe('fetchProtocols', () => {
        it('should fetch protocols', async () => {
            const mockProtocols = ['LoRaWAN', 'WiFi', 'Bluetooth']

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockProtocols
            })

            const result = await apiService.fetchProtocols()

            expect(fetchMock).toHaveBeenCalledWith('/api/protocols', expect.any(Object))
            expect(result).toEqual(mockProtocols)
        })
    })

    describe('uploadCSV', () => {
        it('should upload CSV file successfully', async () => {
            const mockFile = new File(['sensor,value\ntemp1,22.5'], 'data.csv', { type: 'text/csv' })
            const mockResponse = { success: true, count: 1 }

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            })

            const result = await apiService.uploadCSV(mockFile)

            expect(fetchMock).toHaveBeenCalledWith(
                '/api/sensors/upload-csv',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData)
                })
            )

            expect(result).toEqual(mockResponse)
        })

        it('should throw error on upload failure', async () => {
            const mockFile = new File(['data'], 'data.csv', { type: 'text/csv' })

            fetchMock.mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request'
            })

            await expect(apiService.uploadCSV(mockFile)).rejects.toThrow('Upload failed: 400 Bad Request')
        })
    })

    describe('healthCheck', () => {
        it('should perform health check', async () => {
            const mockHealth = { status: 'OK', version: '3.0.0' }

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockHealth
            })

            const result = await apiService.healthCheck()

            expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.any(Object))
            expect(result).toEqual(mockHealth)
        })
    })

    describe('buildUrl', () => {
        it('should build URL without params', () => {
            const url = apiService.buildUrl('/sensors')
            expect(url).toBe('/sensors')
        })

        it('should build URL with params', () => {
            const url = apiService.buildUrl('/sensors', { experimentId: 'exp1', limit: 10 })
            expect(url).toBe('/sensors?experimentId=exp1&limit=10')
        })

        it('should filter out null and undefined params', () => {
            const url = apiService.buildUrl('/sensors', {
                experimentId: 'exp1',
                sensorId: null,
                type: undefined,
                limit: 10
            })

            expect(url).toContain('experimentId=exp1')
            expect(url).toContain('limit=10')
            expect(url).not.toContain('sensorId')
            expect(url).not.toContain('type')
        })
    })
})