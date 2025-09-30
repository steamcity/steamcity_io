import { test, expect } from '@playwright/test'

/**
 * Tests E2E pour ExperimentsManager - Intégration basique
 */
test.describe('ExperimentsManager Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)
    })

    test('should expose experimentsManager globally', async ({ page }) => {
        const experimentsManagerCheck = await page.evaluate(() => {
            return {
                exists: window.experimentsManager !== null && window.experimentsManager !== undefined,
                hasLoadExperimentsList: typeof window.experimentsManager?.loadExperimentsList === 'function',
                hasFilterExperiments: typeof window.experimentsManager?.filterExperiments === 'function',
                hasCreateExperimentsLegend: typeof window.experimentsManager?.createExperimentsLegend === 'function',
                hasGetExperimentsWithSensors: typeof window.experimentsManager?.getExperimentsWithSensors === 'function'
            }
        })

        expect(experimentsManagerCheck.exists).toBe(true)
        expect(experimentsManagerCheck.hasLoadExperimentsList).toBe(true)
        expect(experimentsManagerCheck.hasFilterExperiments).toBe(true)
        expect(experimentsManagerCheck.hasCreateExperimentsLegend).toBe(true)
        expect(experimentsManagerCheck.hasGetExperimentsWithSensors).toBe(true)
    })

    test('should have experimentsManager integrated in steamcity instance', async ({ page }) => {
        const instanceCheck = await page.evaluate(() => {
            return {
                steamcityHasExperiments: !!window.steamcity?.experimentsManager,
                sameAsGlobal: window.steamcity?.experimentsManager === window.experimentsManager
            }
        })

        expect(instanceCheck.steamcityHasExperiments).toBe(true)
        expect(instanceCheck.sameAsGlobal).toBe(true)
    })

    test('should display success message for ExperimentsManager integration', async ({ page }) => {
        const consoleMessages = []
        page.on('console', msg => consoleMessages.push(msg.text()))

        await page.reload()
        await page.waitForTimeout(2000)

        const hasIntegrationMessage = consoleMessages.some(msg =>
            msg.includes('ExperimentsManager intégrés avec succès')
        )

        expect(hasIntegrationMessage).toBe(true)
    })

    test('should update visual confirmation badge', async ({ page }) => {
        const badge = page.locator('#module-debug')
        await expect(badge).toBeVisible({ timeout: 2000 })
        await expect(badge).toContainText('managers chargés')
    })

    test('should display experiments list after login', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to experiments view
        await page.click('#experiments-tab')
        await page.waitForTimeout(1000)

        // Check experiments list is visible
        const experimentsList = page.locator('#experiments-list')
        await expect(experimentsList).toBeVisible()

        // Check that experiments are displayed
        const experimentCards = page.locator('.experiment-card')
        const cardsCount = await experimentCards.count()
        expect(cardsCount).toBeGreaterThan(0)
    })

    test('should display experiments legend', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to experiments view
        await page.click('#experiments-tab')
        await page.waitForTimeout(1000)

        // Check legend exists (may be hidden but should be in DOM)
        const legend = page.locator('#experiments-legend')
        const legendCount = await legend.count()
        expect(legendCount).toBeGreaterThan(0)

        // Check legend has items
        const legendItems = await legend.locator('.legend-item').count()
        expect(legendItems).toBeGreaterThan(0)
    })

    test('should filter experiments by protocol', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to experiments view
        await page.click('#experiments-tab')
        await page.waitForTimeout(1000)

        // Get initial count
        const initialCount = await page.locator('.experiment-card').count()

        // Click on environmental protocol filter (legend is hidden, use programmatic click)
        await page.evaluate(() => {
            document.querySelector('#experiments-legend [data-protocol="environmental"]').click()
        })
        await page.waitForTimeout(500)

        // Count after filter (should be less or equal)
        const filteredCount = await page.locator('.experiment-card').count()
        expect(filteredCount).toBeLessThanOrEqual(initialCount)
    })

    test('should reset filter when clicking "Tous les clusters"', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to experiments view
        await page.click('#experiments-tab')
        await page.waitForTimeout(1000)

        // Get initial count
        const initialCount = await page.locator('.experiment-card').count()

        // Apply filter (legend is hidden, use programmatic click)
        await page.evaluate(() => {
            document.querySelector('#experiments-legend [data-protocol="environmental"]').click()
        })
        await page.waitForTimeout(500)

        // Reset filter
        await page.evaluate(() => {
            document.querySelector('#experiments-legend [data-protocol=""]').click()
        })
        await page.waitForTimeout(500)

        // Count should be back to initial
        const resetCount = await page.locator('.experiment-card').count()
        expect(resetCount).toBe(initialCount)
    })

    test('should navigate to experiment detail', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to experiments view
        await page.click('#experiments-tab')
        await page.waitForTimeout(1000)

        // Click on first experiment
        await page.click('.experiment-card:first-child')
        await page.waitForTimeout(1000)

        // Check detail view is displayed
        const detailView = page.locator('#experiment-detail-view')
        await expect(detailView).toHaveClass(/active/)

        // Check detail title is displayed
        const detailTitle = page.locator('#experiment-detail-title')
        await expect(detailTitle).toBeVisible()
    })

    test('should display sensor indicator for experiments with data', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to experiments view
        await page.click('#experiments-tab')
        await page.waitForTimeout(1000)

        // Check if any experiments have sensor indicator
        const experimentsWithSensors = await page.locator('.experiment-card.has-sensors').count()

        // At least some experiments should have sensors
        expect(experimentsWithSensors).toBeGreaterThan(0)
    })

    test('should not have JavaScript errors during experiments operations', async ({ page }) => {
        const errors = []
        page.on('pageerror', error => errors.push(error.message))

        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to experiments
        await page.click('#experiments-tab')
        await page.waitForTimeout(500)

        // Apply filter (legend is hidden, use programmatic click)
        await page.evaluate(() => {
            document.querySelector('#experiments-legend [data-protocol="environmental"]').click()
        })
        await page.waitForTimeout(300)

        // Reset filter
        await page.evaluate(() => {
            document.querySelector('#experiments-legend [data-protocol=""]').click()
        })
        await page.waitForTimeout(300)

        // Click on experiment
        const firstExperiment = page.locator('.experiment-card:first-child')
        if (await firstExperiment.count() > 0) {
            await firstExperiment.click()
            await page.waitForTimeout(300)
        }

        // Check for errors
        expect(errors.length).toBe(0)
    })
})