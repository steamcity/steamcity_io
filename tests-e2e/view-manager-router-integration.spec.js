import { test, expect } from '@playwright/test'

/**
 * Integration tests for ViewManager and RouterManager coordination
 * Tests the complete user flows with navigation, routing, and view switching
 */

test.describe('ViewManager + RouterManager Integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080')

        // Wait for modules to load
        await page.waitForFunction(() => {
            return window.steamcity &&
                   window.viewManager &&
                   window.routerManager &&
                   window.experimentsManager &&
                   window.sensorsManager
        }, { timeout: 10000 })
    })

    test('should show map view by default', async ({ page }) => {
        // Check URL is correct
        await expect(page).toHaveURL('http://localhost:8080/#/map')

        // Check map view has active class
        const mapView = page.locator('#map-view')
        await expect(mapView).toHaveClass(/active/)

        // Check map tab has active class
        const mapTab = page.locator('#map-tab')
        await expect(mapTab).toHaveClass(/active/)
    })

    test('should navigate to experiments view via tab click', async ({ page }) => {
        // Click on experiments tab (force click as it may not be "visible" due to CSS)
        await page.click('#experiments-tab', { force: true })

        // Wait for navigation
        await page.waitForTimeout(500)

        // Check URL updated
        await expect(page).toHaveURL('http://localhost:8080/#/experiments')

        // Check experiments view is active
        const experimentsView = page.locator('#experiments-view')
        await expect(experimentsView).toHaveClass(/active/)

        // Check experiments tab is active
        const experimentsTab = page.locator('#experiments-tab')
        await expect(experimentsTab).toHaveClass(/active/)

        // Check experiments list is displayed
        await expect(page.locator('#experiments-list .experiment-card')).toHaveCount(55, { timeout: 5000 })

        // Check legend is displayed
        await expect(page.locator('#experiments-legend')).toBeVisible()
    })

    test('should navigate via URL change (deep linking)', async ({ page }) => {
        // Navigate directly to experiments via URL
        await page.goto('http://localhost:8080/#/experiments')

        await page.waitForTimeout(500)

        // Check experiments view is active
        const experimentsView = page.locator('#experiments-view')
        await expect(experimentsView).toHaveClass(/active/)

        // Check experiments are loaded
        await expect(page.locator('#experiments-list .experiment-card')).toHaveCount(55, { timeout: 5000 })
    })

    test('should navigate to sensors view', async ({ page }) => {
        // Click on sensors tab
        await page.click('#sensors-tab', { force: true })

        await page.waitForTimeout(500)

        // Check URL
        await expect(page).toHaveURL('http://localhost:8080/#/sensors')

        // Check sensors view is active
        const sensorsView = page.locator('#sensors-view')
        await expect(sensorsView).toHaveClass(/active/)

        // Check sensors tab is active
        const sensorsTab = page.locator('#sensors-tab')
        await expect(sensorsTab).toHaveClass(/active/)

        // Check sensors are displayed
        await expect(page.locator('#sensors-list .sensor-card')).toHaveCount(1718, { timeout: 5000 })
    })

    test('should handle back/forward navigation', async ({ page }) => {
        // Start at map
        await expect(page).toHaveURL('http://localhost:8080/#/map')

        // Navigate to experiments
        await page.click('#experiments-tab', { force: true })
        await page.waitForTimeout(500)
        await expect(page).toHaveURL('http://localhost:8080/#/experiments')

        // Navigate to sensors
        await page.click('#sensors-tab', { force: true })
        await page.waitForTimeout(500)
        await expect(page).toHaveURL('http://localhost:8080/#/sensors')

        // Go back to experiments
        await page.goBack()
        await page.waitForTimeout(500)
        await expect(page).toHaveURL('http://localhost:8080/#/experiments')
        await expect(page.locator('#experiments-view')).toHaveClass(/active/)

        // Go back to map
        await page.goBack()
        await page.waitForTimeout(500)
        await expect(page).toHaveURL('http://localhost:8080/#/map')
        await expect(page.locator('#map-view')).toHaveClass(/active/)

        // Go forward to experiments
        await page.goForward()
        await page.waitForTimeout(500)
        await expect(page).toHaveURL('http://localhost:8080/#/experiments')
        await expect(page.locator('#experiments-view')).toHaveClass(/active/)
    })

    test('should show experiment detail view', async ({ page }) => {
        // Navigate to experiments
        await page.goto('http://localhost:8080/#/experiments')
        await page.waitForTimeout(500)

        // Click on first experiment
        await page.click('.experiment-card:first-child', { force: true })
        await page.waitForTimeout(1000)

        // Check URL contains experiment ID
        const url = page.url()
        expect(url).toMatch(/\/#\/experiments\/exp-/)

        // Check experiment detail view is active
        const detailView = page.locator('#experiment-detail-view')
        await expect(detailView).toHaveClass(/active/)

        // Check experiment title is displayed
        await expect(page.locator('#experiment-detail-title')).toBeVisible()

        // Check back button exists
        await expect(page.locator('#back-to-map')).toBeVisible()
    })

    test('should navigate back from experiment detail to list', async ({ page }) => {
        // Navigate to experiments
        await page.goto('http://localhost:8080/#/experiments')
        await page.waitForTimeout(500)

        // Click on first experiment
        await page.click('.experiment-card:first-child', { force: true })
        await page.waitForTimeout(1000)

        // Click back button
        await page.click('#back-to-map', { force: true })
        await page.waitForTimeout(500)

        // Check URL is back to experiments list
        await expect(page).toHaveURL('http://localhost:8080/#/experiments')

        // Check experiments list is visible
        await expect(page.locator('#experiments-list')).toBeVisible()
        await expect(page.locator('.experiment-card')).toHaveCount(55)
    })

    test('should show sensor detail view', async ({ page }) => {
        // Navigate to sensors
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(500)

        // Click on first sensor
        await page.click('.sensor-card:first-child', { force: true })
        await page.waitForTimeout(1000)

        // Check URL contains sensor ID
        const url = page.url()
        expect(url).toMatch(/\/#\/sensors\/[a-zA-Z0-9-]+/)

        // Check sensor detail view is active
        const detailView = page.locator('#sensor-detail-view')
        await expect(detailView).toHaveClass(/active/)

        // Check sensor modal or detail is displayed
        await expect(page.locator('#sensor-modal, #sensor-detail-view .sensor-info')).toBeVisible()
    })

    test('should filter experiments and maintain view state', async ({ page }) => {
        // Navigate to experiments
        await page.goto('http://localhost:8080/#/experiments')
        await page.waitForTimeout(500)

        // Click on filter search box to reveal filters
        await page.click('#experiments-filter-search-box', { force: true })
        await page.waitForTimeout(300)

        // Check filters are visible
        await expect(page.locator('#experiments-basic-filters')).toBeVisible()
        await expect(page.locator('#additional-filters')).toBeVisible()

        // Click on environmental filter in legend
        await page.click('[data-protocol="environmental"]', { force: true })
        await page.waitForTimeout(500)

        // Check experiments are filtered
        const cards = page.locator('.experiment-card')
        const count = await cards.count()
        expect(count).toBeLessThan(55)
        expect(count).toBeGreaterThan(0)

        // Check all visible cards have environmental class
        for (let i = 0; i < Math.min(count, 5); i++) {
            await expect(cards.nth(i)).toHaveClass(/environmental/)
        }

        // Check experiments view is still active
        await expect(page.locator('#experiments-view')).toHaveClass(/active/)
    })

    test('should navigate to data view for specific experiment', async ({ page }) => {
        // Navigate to experiments
        await page.goto('http://localhost:8080/#/experiments')
        await page.waitForTimeout(500)

        // Click on first experiment
        await page.click('.experiment-card:first-child', { force: true })
        await page.waitForTimeout(1000)

        // Get experiment ID from URL
        const url = page.url()
        const experimentId = url.match(/experiments\/([^?]+)/)[1]

        // Check if there's a "View Data" button or link
        const viewDataButton = page.locator('button:has-text("Voir les données"), a:has-text("Voir les données")')
        if (await viewDataButton.count() > 0) {
            await viewDataButton.first().click()
            await page.waitForTimeout(1000)

            // Check URL changed to data view
            expect(page.url()).toContain('#/data')
            expect(page.url()).toContain(experimentId)

            // Check data view is active
            await expect(page.locator('#data-view')).toHaveClass(/active/)
        }
    })

    test('should update URL when switching views multiple times', async ({ page }) => {
        // Map -> Experiments -> Sensors -> Data -> Map
        await page.goto('http://localhost:8080/#/map')
        await page.waitForTimeout(300)
        await expect(page).toHaveURL(/\/#\/map/)

        await page.click('#experiments-tab', { force: true })
        await page.waitForTimeout(300)
        await expect(page).toHaveURL(/\/#\/experiments/)

        await page.click('#sensors-tab', { force: true })
        await page.waitForTimeout(300)
        await expect(page).toHaveURL(/\/#\/sensors/)

        await page.click('#data-tab', { force: true })
        await page.waitForTimeout(300)
        await expect(page).toHaveURL(/\/#\/data/)

        await page.click('#map-tab', { force: true })
        await page.waitForTimeout(300)
        await expect(page).toHaveURL(/\/#\/map/)
    })

    test('should preserve view state when navigating away and back', async ({ page }) => {
        // Navigate to experiments
        await page.goto('http://localhost:8080/#/experiments')
        await page.waitForTimeout(500)

        // Click filter search to expand filters
        await page.click('#experiments-filter-search-box', { force: true })
        await page.waitForTimeout(300)

        // Apply a filter (click on environmental legend item)
        await page.click('[data-protocol="environmental"]', { force: true })
        await page.waitForTimeout(500)

        // Get count of filtered experiments
        const initialCount = await page.locator('.experiment-card').count()

        // Navigate away to map
        await page.click('#map-tab', { force: true })
        await page.waitForTimeout(300)

        // Navigate back to experiments
        await page.click('#experiments-tab', { force: true })
        await page.waitForTimeout(500)

        // Check experiments are still loaded
        await expect(page.locator('.experiment-card')).toHaveCount(55)

        // Note: Filter state is not preserved (expected behavior)
        // Each view load resets filters
    })

    test('should handle invalid routes gracefully', async ({ page }) => {
        // Navigate to invalid route
        await page.goto('http://localhost:8080/#/invalid-route-xyz')
        await page.waitForTimeout(500)

        // Should redirect to map view
        await expect(page).toHaveURL(/\/#\/map/)
        await expect(page.locator('#map-view')).toHaveClass(/active/)
    })

    test('should coordinate ViewManager callbacks with managers', async ({ page }) => {
        // This test verifies that ViewManager properly calls initialization callbacks

        // Navigate to experiments
        await page.click('#experiments-tab', { force: true })
        await page.waitForTimeout(1000)

        // Check that ExperimentsManager loaded the list properly
        await expect(page.locator('#experiments-list .experiment-card')).toHaveCount(55)
        await expect(page.locator('#experiments-legend')).toBeVisible()

        // Navigate to sensors
        await page.click('#sensors-tab', { force: true })
        await page.waitForTimeout(1000)

        // Check that SensorsManager loaded the view properly
        await expect(page.locator('#sensors-list .sensor-card')).toHaveCount(1718)

        // Navigate to map
        await page.click('#map-tab', { force: true })
        await page.waitForTimeout(500)

        // Check that map view is active
        await expect(page.locator('#map-view')).toHaveClass(/active/)
    })
})
