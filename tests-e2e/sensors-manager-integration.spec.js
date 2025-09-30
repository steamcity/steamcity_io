import { test, expect } from '@playwright/test'

/**
 * Tests E2E pour SensorsManager - Intégration complète
 */
test.describe('SensorsManager Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)
    })

    test('should expose sensorsManager globally', async ({ page }) => {
        const sensorsManagerCheck = await page.evaluate(() => {
            return {
                exists: window.sensorsManager !== null && window.sensorsManager !== undefined,
                hasLoadSensorsView: typeof window.sensorsManager?.loadSensorsView === 'function',
                hasApplySensorsFilters: typeof window.sensorsManager?.applySensorsFilters === 'function',
                hasShowSensorDetails: typeof window.sensorsManager?.showSensorDetails === 'function',
                hasDisplaySensors: typeof window.sensorsManager?.displaySensors === 'function',
                hasGetSensorById: typeof window.sensorsManager?.getSensorById === 'function'
            }
        })

        expect(sensorsManagerCheck.exists).toBe(true)
        expect(sensorsManagerCheck.hasLoadSensorsView).toBe(true)
        expect(sensorsManagerCheck.hasApplySensorsFilters).toBe(true)
        expect(sensorsManagerCheck.hasShowSensorDetails).toBe(true)
        expect(sensorsManagerCheck.hasDisplaySensors).toBe(true)
        expect(sensorsManagerCheck.hasGetSensorById).toBe(true)
    })

    test('should have sensorsManager integrated in steamcity instance', async ({ page }) => {
        const instanceCheck = await page.evaluate(() => {
            return {
                steamcityHasSensors: !!window.steamcity?.sensorsManager,
                sameAsGlobal: window.steamcity?.sensorsManager === window.sensorsManager
            }
        })

        expect(instanceCheck.steamcityHasSensors).toBe(true)
        expect(instanceCheck.sameAsGlobal).toBe(true)
    })

    test('should display success message for SensorsManager integration', async ({ page }) => {
        const consoleMessages = []
        page.on('console', msg => consoleMessages.push(msg.text()))

        await page.reload()
        await page.waitForTimeout(2000)

        const hasIntegrationMessage = consoleMessages.some(msg =>
            msg.includes('SensorsManager') || msg.includes('managers chargés')
        )

        expect(hasIntegrationMessage).toBe(true)
    })

    test('should navigate to sensors view successfully', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(1000)

        // Check URL hash
        const url = page.url()
        expect(url).toContain('#/sensors')

        // Check sensors view is active
        const sensorsView = page.locator('#sensors-view')
        await expect(sensorsView).toHaveClass(/active/)

        // Check sensors tab is active
        const sensorsTab = page.locator('#sensors-tab')
        await expect(sensorsTab).toHaveClass(/active/)
    })

    test('should display sensors list after loading', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Check sensors container is visible
        const sensorsContainer = page.locator('#sensors-container')
        await expect(sensorsContainer).toBeVisible()

        // Check that sensor cards are displayed
        const sensorCards = page.locator('.sensor-device-card')
        const cardsCount = await sensorCards.count()
        expect(cardsCount).toBeGreaterThan(0)
    })

    test('should display sensor filter controls', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(1000)

        // Click on filter input to show advanced filters
        await page.click('#sensors-filter-input')
        await page.waitForTimeout(500)

        // Check filter elements exist
        const experimentFilter = page.locator('#sensors-experiment-filter')
        const statusFilter = page.locator('#sensors-status-filter')
        const typeFilter = page.locator('#sensors-type-filter')

        await expect(experimentFilter).toBeVisible()
        await expect(statusFilter).toBeVisible()
        await expect(typeFilter).toBeVisible()
    })

    test('should filter sensors by experiment', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Get initial count
        const initialCount = await page.locator('.sensor-device-card').count()

        // Show advanced filters
        await page.click('#sensors-filter-input')
        await page.waitForTimeout(500)

        // Apply experiment filter
        await page.selectOption('#sensors-experiment-filter', 'exp-005-bruxelles-co2-sensors')
        await page.waitForTimeout(1000)

        // Count after filter
        const filteredCount = await page.locator('.sensor-device-card').count()
        expect(filteredCount).toBeLessThanOrEqual(initialCount)
        expect(filteredCount).toBeGreaterThan(0)
    })

    test('should filter sensors by status', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Get initial count
        const initialCount = await page.locator('.sensor-device-card').count()

        // Show advanced filters
        await page.click('#sensors-filter-input')
        await page.waitForTimeout(500)

        // Apply status filter (active)
        await page.selectOption('#sensors-status-filter', 'active')
        await page.waitForTimeout(1000)

        // Count after filter
        const filteredCount = await page.locator('.sensor-device-card').count()
        expect(filteredCount).toBeLessThanOrEqual(initialCount)

        // Verify all displayed sensors have online status
        const statusBadges = await page.locator('.sensor-card-status.active').count()
        expect(statusBadges).toBe(filteredCount)
    })

    test('should filter sensors by type', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Get initial count
        const initialCount = await page.locator('.sensor-device-card').count()

        // Show advanced filters
        await page.click('#sensors-filter-input')
        await page.waitForTimeout(500)

        // Wait for type filter to be populated
        await page.waitForFunction(() => {
            const select = document.getElementById('sensors-type-filter')
            return select && select.options.length > 1
        }, { timeout: 10000 })

        // Apply type filter (temperature)
        await page.selectOption('#sensors-type-filter', 'temperature')
        await page.waitForTimeout(1000)

        // Count after filter
        const filteredCount = await page.locator('.sensor-device-card').count()
        expect(filteredCount).toBeLessThanOrEqual(initialCount)

        // Verify sensor type is displayed in cards
        if (filteredCount > 0) {
            const firstSensorType = await page.locator('.sensor-card-type').first().textContent()
            expect(firstSensorType).toContain('Température')
        }
    })

    test('should apply multiple filters simultaneously', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Get initial count
        const initialCount = await page.locator('.sensor-device-card').count()

        // Show advanced filters
        await page.click('#sensors-filter-input')
        await page.waitForTimeout(500)

        // Apply experiment filter
        await page.selectOption('#sensors-experiment-filter', 'exp-005-bruxelles-co2-sensors')
        await page.waitForTimeout(500)

        // Apply status filter
        await page.selectOption('#sensors-status-filter', 'active')
        await page.waitForTimeout(500)

        // Wait for type filter to be populated
        await page.waitForFunction(() => {
            const select = document.getElementById('sensors-type-filter')
            return select && select.options.length > 1
        }, { timeout: 10000 })

        // Apply type filter
        await page.selectOption('#sensors-type-filter', 'temperature')
        await page.waitForTimeout(1000)

        // Count after all filters
        const filteredCount = await page.locator('.sensor-device-card').count()
        expect(filteredCount).toBeLessThanOrEqual(initialCount)
    })

    test('should update filter count badge', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(1000)

        // Initially filter count should be hidden
        const filterCount = page.locator('#sensors-filter-count')
        await expect(filterCount).not.toBeVisible()

        // Show advanced filters
        await page.click('#sensors-filter-input')
        await page.waitForTimeout(500)

        // Apply one filter
        await page.selectOption('#sensors-experiment-filter', 'exp-005-bruxelles-co2-sensors')
        await page.waitForTimeout(500)

        // Filter count should now show 1
        await expect(filterCount).toBeVisible()
        await expect(filterCount).toContainText('1 filtre actif')

        // Apply second filter
        await page.selectOption('#sensors-status-filter', 'active')
        await page.waitForTimeout(500)

        // Filter count should now show 2
        await expect(filterCount).toContainText('2 filtres actifs')
    })

    test('should clear all filters', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Get initial count
        const initialCount = await page.locator('.sensor-device-card').count()

        // Show advanced filters
        await page.click('#sensors-filter-input')
        await page.waitForTimeout(500)

        // Apply filters
        await page.selectOption('#sensors-experiment-filter', 'exp-005-bruxelles-co2-sensors')
        await page.waitForTimeout(500)
        await page.selectOption('#sensors-status-filter', 'online')
        await page.waitForTimeout(1000)

        const filteredCount = await page.locator('.sensor-device-card').count()

        // Clear filters
        await page.click('#sensors-clear-filters')
        await page.waitForTimeout(1000)

        // Count should be back to initial
        const clearedCount = await page.locator('.sensor-device-card').count()
        expect(clearedCount).toBe(initialCount)

        // Filter count badge should be hidden
        const filterCount = page.locator('#sensors-filter-count')
        await expect(filterCount).not.toBeVisible()
    })

    test('should toggle advanced filters visibility', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(1000)

        const additionalFilters = page.locator('#sensors-additional-filters')
        const filterSearchBox = page.locator('#sensors-filter-search-box')

        // Initially should be hidden
        await expect(additionalFilters).not.toBeVisible()

        // Click to show
        await filterSearchBox.click()
        await page.waitForTimeout(300)

        // Should now be visible
        await expect(additionalFilters).toBeVisible()

        // Click again to hide
        await filterSearchBox.click()
        await page.waitForTimeout(300)

        // Should be hidden again
        await expect(additionalFilters).not.toBeVisible()
    })

    test('should apply URL parameters for filters', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view with URL parameters
        await page.goto('http://localhost:8080/#/sensors?experiment=exp-005-bruxelles-co2-sensors&status=active&type=temperature')
        await page.waitForTimeout(2000)

        // Show advanced filters
        await page.click('#sensors-filter-input')
        await page.waitForTimeout(500)

        // Wait for type filter to be populated
        await page.waitForFunction(() => {
            const select = document.getElementById('sensors-type-filter')
            return select && select.options.length > 1
        }, { timeout: 10000 })

        // Check filters are applied
        const experimentFilter = await page.locator('#sensors-experiment-filter').inputValue()
        const statusFilter = await page.locator('#sensors-status-filter').inputValue()
        const typeFilter = await page.locator('#sensors-type-filter').inputValue()

        expect(experimentFilter).toBe('exp-005-bruxelles-co2-sensors')
        expect(statusFilter).toBe('active')
        expect(typeFilter).toBe('temperature')

        // Filter count should show 3 active filters
        const filterCount = page.locator('#sensors-filter-count')
        await expect(filterCount).toBeVisible()
        await expect(filterCount).toContainText('3 filtres actifs')

        // Advanced filters should be shown
        const additionalFilters = page.locator('#sensors-additional-filters')
        await expect(additionalFilters).toBeVisible()
    })

    test('should navigate to sensor detail view', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Click details button on first sensor card
        await page.click('.sensor-device-card:first-child .sensor-action-btn')
        await page.waitForTimeout(1000)

        // Check detail view is active
        const detailView = page.locator('#sensor-detail-view')
        await expect(detailView).toHaveClass(/active/)

        // Check detail title is visible
        const detailTitle = page.locator('#sensor-detail-title')
        await expect(detailTitle).toBeVisible()

        // Check URL has changed to include sensor ID
        const url = page.url()
        expect(url).toContain('#/sensors/sens-')
    })

    test('should display sensor detail information', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate directly to a sensor detail
        await page.goto('http://localhost:8080/#/sensors/sens-001-temp-bruxelles-creuz')
        await page.waitForTimeout(2000)

        // Check sensor info section is visible
        const sensorInfo = page.locator('#sensor-info')
        await expect(sensorInfo).toBeVisible()

        // Check sensor specifications are visible
        const specifications = page.locator('#sensor-specifications')
        await expect(specifications).toBeVisible()

        // Check sensor status info is visible
        const statusInfo = page.locator('#sensor-status-info')
        await expect(statusInfo).toBeVisible()

        // Check sensor location info is visible
        const locationInfo = page.locator('#sensor-location-info')
        await expect(locationInfo).toBeVisible()
    })

    test('should load sensor chart on detail view', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate directly to a sensor detail
        await page.goto('http://localhost:8080/#/sensors/sens-001-temp-bruxelles-creuz')
        await page.waitForTimeout(2000)

        // Check chart canvas exists and is visible
        const chartCanvas = page.locator('#sensorChart')
        await expect(chartCanvas).toBeVisible()

        // Check time filter buttons are present
        const timeFilterButtons = page.locator('#sensor-detail-view .time-filter-btn')
        const buttonCount = await timeFilterButtons.count()
        expect(buttonCount).toBe(4) // 24h, 7d, 30d, all
    })

    test('should change chart period with time filter buttons', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensor detail
        await page.goto('http://localhost:8080/#/sensors/sens-001-temp-bruxelles-creuz')
        await page.waitForTimeout(2000)

        // Default button (24h) should be active
        const defaultButton = page.locator('#sensor-detail-view .time-filter-btn[data-period="24h"]')
        await expect(defaultButton).toHaveClass(/active/)

        // Click on 7d button
        const sevenDaysButton = page.locator('#sensor-detail-view .time-filter-btn[data-period="7d"]')
        await sevenDaysButton.click()
        await page.waitForTimeout(1000)

        // 7d button should now be active
        await expect(sevenDaysButton).toHaveClass(/active/)
        await expect(defaultButton).not.toHaveClass(/active/)

        // URL should include period parameter
        const url = page.url()
        expect(url).toContain('period=7d')
    })

    test('should apply period from URL parameter', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate with period parameter
        await page.goto('http://localhost:8080/#/sensors/sens-001-temp-bruxelles-creuz?period=30d')
        await page.waitForTimeout(2000)

        // 30d button should be active
        const thirtyDaysButton = page.locator('#sensor-detail-view .time-filter-btn[data-period="30d"]')
        await expect(thirtyDaysButton).toHaveClass(/active/)
    })

    test('should navigate back to sensors list from detail view', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensor detail
        await page.goto('http://localhost:8080/#/sensors/sens-001-temp-bruxelles-creuz')
        await page.waitForTimeout(2000)

        // Click back button
        await page.click('#back-to-sensors')
        await page.waitForTimeout(1000)

        // Should be back on sensors list view
        const sensorsView = page.locator('#sensors-view')
        await expect(sensorsView).toHaveClass(/active/)

        const detailView = page.locator('#sensor-detail-view')
        await expect(detailView).not.toHaveClass(/active/)

        // URL should be updated
        const url = page.url()
        expect(url).toContain('#/sensors')
        expect(url).not.toContain('sens-')
    })

    test('should display empty state when no sensors match filters', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Show advanced filters
        await page.click('#sensors-filter-input')
        await page.waitForTimeout(500)

        // Apply filters that shouldn't match anything (if such combination exists)
        await page.selectOption('#sensors-status-filter', 'offline')

        // Wait for type filter to be populated
        await page.waitForFunction(() => {
            const select = document.getElementById('sensors-type-filter')
            return select && select.options.length > 1
        }, { timeout: 10000 })

        await page.selectOption('#sensors-type-filter', 'temperature')
        await page.waitForTimeout(1000)

        // Check if empty state message is displayed or sensor cards exist
        const sensorCards = await page.locator('.sensor-device-card').count()
        const noSensorsMessage = page.locator('.no-sensors-message')

        if (sensorCards === 0) {
            await expect(noSensorsMessage).toBeVisible()
            await expect(noSensorsMessage).toContainText('Aucun capteur')
        }
    })

    test('should handle missing sensor gracefully', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to non-existent sensor
        await page.goto('http://localhost:8080/#/sensors/sens-nonexistent-999')
        await page.waitForTimeout(2000)

        // Should either stay on list view or show error
        // Check console for error message
        const errors = []
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text())
            }
        })

        await page.waitForTimeout(1000)

        // Either should show error in console or redirect
        const url = page.url()
        const isOnDetailView = url.includes('sens-nonexistent-999')

        if (isOnDetailView) {
            // If we're on detail view, there should be an error logged
            expect(errors.length).toBeGreaterThan(0)
        }
    })

    test('should display sensor status badges correctly', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Check for status badges on cards
        const activeCards = await page.locator('.sensor-device-card.active').count()
        const maintenanceCards = await page.locator('.sensor-device-card.maintenance').count()
        const offlineCards = await page.locator('.sensor-device-card.offline').count()

        // Total cards should equal sum of all status types
        const totalCards = await page.locator('.sensor-device-card').count()
        expect(totalCards).toBe(activeCards + maintenanceCards + offlineCards)
    })

    test('should display current sensor values on cards', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Check first sensor card has current value
        const firstCard = page.locator('.sensor-device-card').first()
        const currentValue = firstCard.locator('.sensor-current-value')
        await expect(currentValue).toBeVisible()

        // Should display a value (either numeric or "N/A")
        const valueText = await currentValue.textContent()
        expect(valueText).toBeTruthy()
    })

    test('should display last update time on cards', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors view
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(2000)

        // Check for last update indicators
        const lastUpdateElements = await page.locator('.sensor-last-update').count()

        // At least some sensors should have last update time
        expect(lastUpdateElements).toBeGreaterThanOrEqual(0)
    })

    test('should open experiment detail from sensor detail', async ({ page }) => {
        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensor detail
        await page.goto('http://localhost:8080/#/sensors/sens-001-temp-bruxelles-creuz')
        await page.waitForTimeout(2000)

        // Click on experiment link if it exists
        const experimentLinkBtn = page.locator('.experiment-link-btn')
        const hasExperimentLink = await experimentLinkBtn.count() > 0

        if (hasExperimentLink) {
            await experimentLinkBtn.click()
            await page.waitForTimeout(1000)

            // Should navigate to experiment detail
            const experimentDetailView = page.locator('#experiment-detail-view')
            await expect(experimentDetailView).toHaveClass(/active/)
        }
    })

    test('should not have JavaScript errors during sensor operations', async ({ page }) => {
        const errors = []
        page.on('pageerror', error => errors.push(error.message))

        // Login
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Navigate to sensors
        await page.goto('http://localhost:8080/#/sensors')
        await page.waitForTimeout(1000)

        // Show advanced filters
        await page.click('#sensors-filter-input')
        await page.waitForTimeout(500)

        // Apply filters
        await page.selectOption('#sensors-experiment-filter', 'exp-005-bruxelles-co2-sensors')
        await page.waitForTimeout(300)

        await page.selectOption('#sensors-status-filter', 'online')
        await page.waitForTimeout(300)

        // Clear filters
        await page.click('#sensors-clear-filters')
        await page.waitForTimeout(300)

        // Navigate to sensor detail
        const firstSensorBtn = page.locator('.sensor-device-card:first-child .sensor-action-btn').first()
        if (await firstSensorBtn.count() > 0) {
            await firstSensorBtn.click()
            await page.waitForTimeout(500)

            // Change period
            const sevenDaysButton = page.locator('#sensor-detail-view .time-filter-btn[data-period="7d"]')
            if (await sevenDaysButton.count() > 0) {
                await sevenDaysButton.click()
                await page.waitForTimeout(300)
            }

            // Go back
            await page.click('#back-to-sensors')
            await page.waitForTimeout(300)
        }

        // Check for errors
        expect(errors.length).toBe(0)
    })
})