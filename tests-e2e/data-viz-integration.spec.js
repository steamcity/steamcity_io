import { test, expect } from '@playwright/test'

/**
 * Tests E2E pour DataVisualizationManager - Intégration basique
 */
test.describe('DataVisualizationManager Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)
    })

    test('should expose dataVizManager globally', async ({ page }) => {
        const dataVizCheck = await page.evaluate(() => {
            return {
                exists: window.dataVizManager !== null && window.dataVizManager !== undefined,
                hasCreateMainChart: typeof window.dataVizManager?.createMainChart === 'function',
                hasCalculateMedian: typeof window.dataVizManager?.calculateMedian === 'function',
                hasGetTimeUnit: typeof window.dataVizManager?.getTimeUnit === 'function'
            }
        })

        expect(dataVizCheck.exists).toBe(true)
        expect(dataVizCheck.hasCreateMainChart).toBe(true)
        expect(dataVizCheck.hasCalculateMedian).toBe(true)
        expect(dataVizCheck.hasGetTimeUnit).toBe(true)
    })

    test('should have dataVizManager integrated in steamcity instance', async ({ page }) => {
        const instanceCheck = await page.evaluate(() => {
            return {
                steamcityHasDataViz: !!window.steamcity?.dataVizManager,
                sameAsGlobal: window.steamcity?.dataVizManager === window.dataVizManager
            }
        })

        expect(instanceCheck.steamcityHasDataViz).toBe(true)
        expect(instanceCheck.sameAsGlobal).toBe(true)
    })

    test('should display success message for DataViz integration', async ({ page }) => {
        const consoleMessages = []
        page.on('console', msg => consoleMessages.push(msg.text()))

        await page.reload()
        await page.waitForTimeout(2000)

        const hasIntegrationMessage = consoleMessages.some(msg =>
            msg.includes('DataVisualizationManager intégrés avec succès')
        )

        expect(hasIntegrationMessage).toBe(true)
    })

    test('should update visual confirmation badge', async ({ page }) => {
        const badge = page.locator('#module-debug')
        await expect(badge).toBeVisible({ timeout: 2000 })
        await expect(badge).toContainText('DataViz')
    })

    test('should have data view accessible after login', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Accéder à la vue Data
        await page.click('#data-tab')
        await page.waitForTimeout(500)

        // Vérifier que la vue Data est active
        const dataView = page.locator('#data-view')
        await expect(dataView).toHaveClass(/active/)
    })

    test('should not have JavaScript errors during initialization', async ({ page }) => {
        const errors = []
        page.on('pageerror', error => errors.push(error.message))

        await page.goto('http://localhost:8080')
        await page.waitForTimeout(3000)

        expect(errors.length).toBe(0)
    })
})