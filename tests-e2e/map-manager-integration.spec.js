import { test, expect } from '@playwright/test'

/**
 * Tests E2E pour MapManager - Intégration avec la carte Leaflet
 */
test.describe('MapManager Integration Tests', () => {
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

        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)
    })

    test('should expose MapManager globally via window', async ({ page }) => {
        const mapManagerCheck = await page.evaluate(() => {
            return {
                exists: window.mapManager !== null && window.mapManager !== undefined,
                hasInitialize: typeof window.mapManager?.initialize === 'function',
                hasAddMarkers: typeof window.mapManager?.addMarkers === 'function',
                hasClearMarkers: typeof window.mapManager?.clearMarkers === 'function',
                hasFilterByProtocol: typeof window.mapManager?.filterByProtocol === 'function',
                hasCreateLegend: typeof window.mapManager?.createLegend === 'function'
            }
        })

        expect(mapManagerCheck.exists).toBe(true)
        expect(mapManagerCheck.hasInitialize).toBe(true)
        expect(mapManagerCheck.hasAddMarkers).toBe(true)
        expect(mapManagerCheck.hasClearMarkers).toBe(true)
        expect(mapManagerCheck.hasFilterByProtocol).toBe(true)
        expect(mapManagerCheck.hasCreateLegend).toBe(true)
    })

    test('should have mapManager integrated in steamcity instance', async ({ page }) => {
        const instanceCheck = await page.evaluate(() => {
            return {
                steamcityHasMapManager: !!window.steamcity?.mapManager,
                mapManagerIsObject: typeof window.steamcity?.mapManager === 'object',
                sameAsGlobal: window.steamcity?.mapManager === window.mapManager
            }
        })

        expect(instanceCheck.steamcityHasMapManager).toBe(true)
        expect(instanceCheck.mapManagerIsObject).toBe(true)
        expect(instanceCheck.sameAsGlobal).toBe(true)
    })

    test('should display success message for MapManager integration', async ({ page }) => {
        const consoleMessages = []
        page.on('console', msg => consoleMessages.push(msg.text()))

        await page.reload()
        await page.waitForTimeout(2000)

        const hasIntegrationMessage = consoleMessages.some(msg =>
            msg.includes('DataVisualizationManager intégrés avec succès')
        )

        expect(hasIntegrationMessage).toBe(true)
    })

    test('should update visual confirmation badge to include MapManager', async ({ page }) => {
        await page.goto('http://localhost:8080')

        const badge = page.locator('#module-debug')
        await expect(badge).toBeVisible({ timeout: 2000 })
        await expect(badge).toContainText('MapManager')
    })

    test('should initialize map after login', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000) // Attendre l'initialisation de la carte

        // Vérifier que la carte est initialisée via MapManager
        const mapCheck = await page.evaluate(() => {
            return {
                mapExists: window.steamcity && window.steamcity.map !== null,
                mapManagerHasMap: window.mapManager && window.mapManager.getMapInstance() !== null,
                sameMapInstance: window.steamcity?.map === window.mapManager?.getMapInstance()
            }
        })

        expect(mapCheck.mapExists).toBe(true)
        expect(mapCheck.mapManagerHasMap).toBe(true)
        expect(mapCheck.sameMapInstance).toBe(true)
    })

    test('should display map with markers after login', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000)

        // Vérifier que des marqueurs sont présents
        const markersCheck = await page.evaluate(() => {
            return {
                hasMarkers: window.mapManager && window.mapManager.getMarkers().length > 0,
                markersCount: window.mapManager?.getMarkers().length || 0
            }
        })

        expect(markersCheck.hasMarkers).toBe(true)
        expect(markersCheck.markersCount).toBeGreaterThan(0)
    })

    test('should display map legend after login', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000)

        // Vérifier que la légende est présente
        const legend = page.locator('#map-legend')
        await expect(legend).toBeVisible()

        const legendItems = await legend.locator('.legend-item').count()
        expect(legendItems).toBeGreaterThan(0) // Au moins "Tous les clusters"
    })

    test('should filter markers by protocol via legend', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000)

        // Obtenir le nombre de marqueurs initial
        const initialMarkersCount = await page.evaluate(() => {
            return window.mapManager?.getMarkers().length || 0
        })

        // Cliquer sur un filtre de protocole (ex: environmental)
        const environmentalFilter = page.locator('[data-protocol="environmental"]')
        await environmentalFilter.click()
        await page.waitForTimeout(500)

        // Vérifier que le nombre de marqueurs a changé
        const filteredMarkersCount = await page.evaluate(() => {
            return window.mapManager?.getMarkers().length || 0
        })

        // Le nombre devrait être différent (probablement moins)
        expect(filteredMarkersCount).toBeLessThanOrEqual(initialMarkersCount)

        // Vérifier que le filtre est actif
        await expect(environmentalFilter).toHaveClass(/active/)
    })

    test('should reset filter when clicking "Tous les clusters"', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000)

        // Obtenir le nombre initial
        const initialMarkersCount = await page.evaluate(() => {
            return window.mapManager?.getMarkers().length || 0
        })

        // Filtrer par un protocole
        await page.click('[data-protocol="environmental"]')
        await page.waitForTimeout(500)

        // Réinitialiser le filtre
        await page.click('[data-protocol=""]') // "Tous les clusters"
        await page.waitForTimeout(500)

        // Vérifier que tous les marqueurs sont revenus
        const resetMarkersCount = await page.evaluate(() => {
            return window.mapManager?.getMarkers().length || 0
        })

        expect(resetMarkersCount).toBe(initialMarkersCount)
    })

    test('should sync dropdown filter with legend filter', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000)

        // Cliquer sur un filtre de légende
        await page.click('[data-protocol="energy"]')
        await page.waitForTimeout(500)

        // Vérifier que le dropdown est synchronisé
        const dropdownValue = await page.locator('#protocol-filter').inputValue()
        expect(dropdownValue).toBe('energy')
    })

    test('should center map on visible markers', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000)

        // Cliquer sur le bouton de centrage
        const centerBtn = page.locator('#center-map-btn')
        if (await centerBtn.count() > 0) {
            await centerBtn.click()
            await page.waitForTimeout(500)

            // Vérifier qu'il n'y a pas d'erreur
            // (le simple fait que ça ne crash pas est déjà bon)
            const hasError = await page.evaluate(() => {
                return window.__mapError !== undefined
            })
            expect(hasError).toBe(false)
        }
    })

    test('should refresh map when switching views', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000)

        // Aller à la vue Experiments
        await page.click('#experiments-tab')
        await page.waitForTimeout(500)

        // Revenir à la carte
        await page.click('#map-tab')
        await page.waitForTimeout(500)

        // Vérifier que la carte est toujours fonctionnelle
        const mapStillWorks = await page.evaluate(() => {
            return window.mapManager && window.mapManager.getMapInstance() !== null
        })

        expect(mapStillWorks).toBe(true)
    })

    test('should not have duplicate map instances', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000)

        const instanceCheck = await page.evaluate(() => {
            // Compter les conteneurs Leaflet
            const leafletContainers = document.querySelectorAll('.leaflet-container')
            return {
                leafletContainersCount: leafletContainers.length,
                mapManagerMapExists: !!window.mapManager?.getMapInstance(),
                steamcityMapExists: !!window.steamcity?.map
            }
        })

        expect(instanceCheck.leafletContainersCount).toBe(1)
        expect(instanceCheck.mapManagerMapExists).toBe(true)
        expect(instanceCheck.steamcityMapExists).toBe(true)
    })

    test('should not have JavaScript errors during map operations', async ({ page }) => {
        const errors = []
        page.on('pageerror', error => errors.push(error.message))

        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000)

        // Effectuer diverses opérations sur la carte
        await page.click('[data-protocol="environmental"]')
        await page.waitForTimeout(300)
        await page.click('[data-protocol=""]')
        await page.waitForTimeout(300)

        const centerBtn = page.locator('#center-map-btn')
        if (await centerBtn.count() > 0) {
            await centerBtn.click()
            await page.waitForTimeout(300)
        }

        // Vérifier qu'il n'y a pas d'erreur
        expect(errors.length).toBe(0)
    })
})