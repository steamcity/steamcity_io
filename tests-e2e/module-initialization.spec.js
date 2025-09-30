import { test, expect } from '@playwright/test'

/**
 * Tests E2E pour vérifier l'initialisation correcte des modules
 * Ces tests détectent les problèmes de timing et d'ordre d'initialisation
 */
test.describe('Module Initialization - Timing and Order', () => {
    test.beforeEach(async ({ page }) => {
        // Capturer les erreurs JavaScript
        page.on('pageerror', error => {
            console.error('❌ JavaScript Error:', error.message)
        })

        // Capturer les erreurs de console
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('❌ Console Error:', msg.text())
            }
        })
    })

    test('should load page without JavaScript errors', async ({ page }) => {
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text())
        })

        await page.goto('http://localhost:8080')
        await page.waitForTimeout(3000) // Attendre le chargement complet

        // Vérifier qu'il n'y a pas d'erreurs
        expect(errors.length).toBe(0)
    })

    test('should expose SteamCityPlatform class globally', async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)

        const classExists = await page.evaluate(() => {
            return typeof window.SteamCityPlatform === 'function'
        })

        expect(classExists).toBe(true)
    })

    test('should create steamcity instance with authManager and apiService', async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)

        const instanceCheck = await page.evaluate(() => {
            return {
                steamcityExists: !!window.steamcity,
                hasAuthManager: !!window.steamcity?.authManager,
                hasApiService: !!window.steamcity?.apiService,
                authManagerType: typeof window.steamcity?.authManager,
                apiServiceType: typeof window.steamcity?.apiService
            }
        })

        expect(instanceCheck.steamcityExists).toBe(true)
        expect(instanceCheck.hasAuthManager).toBe(true)
        expect(instanceCheck.hasApiService).toBe(true)
        expect(instanceCheck.authManagerType).toBe('object')
        expect(instanceCheck.apiServiceType).toBe('object')
    })

    test('should expose authManager globally via window', async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)

        const authManagerCheck = await page.evaluate(() => {
            return {
                exists: window.authManager !== null && window.authManager !== undefined,
                hasGetAuthState: typeof window.authManager?.getAuthState === 'function',
                hasShowLoginModal: typeof window.authManager?.showLoginModal === 'function',
                hasHandleLogin: typeof window.authManager?.handleLogin === 'function'
            }
        })

        expect(authManagerCheck.exists).toBe(true)
        expect(authManagerCheck.hasGetAuthState).toBe(true)
        expect(authManagerCheck.hasShowLoginModal).toBe(true)
        expect(authManagerCheck.hasHandleLogin).toBe(true)
    })

    test('should expose apiService globally via window', async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)

        const apiServiceCheck = await page.evaluate(() => {
            return {
                exists: window.apiService !== null && window.apiService !== undefined,
                hasFetchExperiments: typeof window.apiService?.fetchExperiments === 'function',
                hasFetchSensors: typeof window.apiService?.fetchSensors === 'function',
                hasFetchMeasurements: typeof window.apiService?.fetchMeasurements === 'function',
                hasHealthCheck: typeof window.apiService?.healthCheck === 'function'
            }
        })

        expect(apiServiceCheck.exists).toBe(true)
        expect(apiServiceCheck.hasFetchExperiments).toBe(true)
        expect(apiServiceCheck.hasFetchSensors).toBe(true)
        expect(apiServiceCheck.hasFetchMeasurements).toBe(true)
        expect(apiServiceCheck.hasHealthCheck).toBe(true)
    })

    test('should display success messages in console', async ({ page }) => {
        const consoleMessages = []
        page.on('console', msg => consoleMessages.push(msg.text()))

        await page.goto('http://localhost:8080')
        await page.waitForTimeout(3000)

        // Vérifier les messages de succès
        const hasModulesMessage = consoleMessages.some(msg =>
            msg.includes('DataVisualizationManager intégrés avec succès')
        )
        const hasAppStartedMessage = consoleMessages.some(msg =>
            msg.includes('Application SteamCity démarrée')
        )

        expect(hasModulesMessage).toBe(true)
        expect(hasAppStartedMessage).toBe(true)
    })

    test('should show visual confirmation badge on page load', async ({ page }) => {
        await page.goto('http://localhost:8080')

        // Le badge devrait apparaître
        const badge = page.locator('#module-debug')
        await expect(badge).toBeVisible({ timeout: 2000 })
        await expect(badge).toContainText('DataViz chargés')

        // Le badge devrait disparaître après 3 secondes
        await page.waitForTimeout(3500)
        await expect(badge).not.toBeVisible()
    })

    test('should initialize in correct order without race conditions', async ({ page }) => {
        const initOrder = []

        page.on('console', msg => {
            const text = msg.text()
            if (text.includes('AuthManager') || text.includes('ApiService') || text.includes('Application')) {
                initOrder.push(text)
            }
        })

        await page.goto('http://localhost:8080')
        await page.waitForTimeout(3000)

        // Vérifier l'ordre d'initialisation
        expect(initOrder.length).toBeGreaterThan(0)

        // Le message d'intégration devrait venir avant le message de démarrage
        const integrationIndex = initOrder.findIndex(msg => msg.includes('intégrés avec succès'))
        const startedIndex = initOrder.findIndex(msg => msg.includes('Application SteamCity démarrée'))

        expect(integrationIndex).toBeGreaterThanOrEqual(0)
        expect(startedIndex).toBeGreaterThanOrEqual(0)
        expect(integrationIndex).toBeLessThan(startedIndex)
    })

    test('should have apiService functional and able to call API', async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)

        const apiResult = await page.evaluate(async () => {
            try {
                const health = await window.apiService.healthCheck()
                return {
                    success: true,
                    status: health.status,
                    hasVersion: !!health.version
                }
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                }
            }
        })

        expect(apiResult.success).toBe(true)
        expect(apiResult.status).toBe('OK')
        expect(apiResult.hasVersion).toBe(true)
    })

    test('should prevent TypeError on authManager.getAuthState()', async ({ page }) => {
        const errors = []
        page.on('pageerror', error => {
            if (error.message.includes('getAuthState')) {
                errors.push(error.message)
            }
        })

        await page.goto('http://localhost:8080')
        await page.waitForTimeout(3000)

        // Vérifier qu'il n'y a pas d'erreur sur getAuthState
        expect(errors.length).toBe(0)
    })

    test('should have patching mode enabled before script.js loads', async ({ page }) => {
        await page.goto('http://localhost:8080')

        // Vérifier que le flag de patching a été défini
        const patchingMode = await page.evaluate(() => {
            return window.__STEAMCITY_PATCHING_MODE__
        })

        expect(patchingMode).toBe(true)
    })

    test('should not create duplicate instances', async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(3000)

        const instanceCheck = await page.evaluate(() => {
            // Vérifier qu'il n'y a qu'une seule instance de steamcity
            // et qu'il n'y a pas de duplications de modales ou de gestionnaires
            return {
                steamcityExists: !!window.steamcity,
                hasAuthManager: !!window.steamcity?.authManager,
                hasApiService: !!window.steamcity?.apiService,
                authManagerGlobal: window.authManager === window.steamcity?.authManager,
                apiServiceGlobal: window.apiService === window.steamcity?.apiService,
                loginModalsCount: document.querySelectorAll('#login-modal').length
            }
        })

        expect(instanceCheck.steamcityExists).toBe(true)
        expect(instanceCheck.hasAuthManager).toBe(true)
        expect(instanceCheck.hasApiService).toBe(true)
        expect(instanceCheck.authManagerGlobal).toBe(true)
        expect(instanceCheck.apiServiceGlobal).toBe(true)
        expect(instanceCheck.loginModalsCount).toBe(1)
    })
})

test.describe('Module Initialization - Error Recovery', () => {
    test('should handle missing authManager gracefully in init()', async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)

        // Simuler un appel à init sans authManager (ne devrait pas crasher)
        const testResult = await page.evaluate(() => {
            try {
                // Créer une instance temporaire pour tester
                const tempInstance = Object.create(window.steamcity)
                tempInstance.authManager = null

                // Cette fonction devrait return early sans erreur
                const initFunction = window.steamcity.init.bind(tempInstance)
                initFunction()

                return { success: true }
            } catch (error) {
                return { success: false, error: error.message }
            }
        })

        expect(testResult.success).toBe(true)
    })

    test('should recover from script.js load failure', async ({ page }) => {
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text())
        })

        // Charger la page normalement
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(3000)

        // Vérifier qu'il n'y a pas d'erreur de chargement de script.js
        const hasScriptError = errors.some(err =>
            err.includes('script.js') && err.includes('Erreur')
        )

        expect(hasScriptError).toBe(false)
    })
})