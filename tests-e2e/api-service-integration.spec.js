import { test, expect } from '@playwright/test'

test.describe('ApiService Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(1000) // Attendre le chargement des modules
    })

    test('should load ApiService successfully', async ({ page }) => {
        // Vérifier que ApiService est chargé et disponible
        const apiServiceExists = await page.evaluate(() => {
            return window.apiService !== null && window.apiService !== undefined
        })

        expect(apiServiceExists).toBe(true)
    })

    test('should have apiService exposed globally with all methods', async ({ page }) => {
        const apiMethods = await page.evaluate(() => {
            if (!window.apiService) return []

            return [
                typeof window.apiService.fetchExperiments,
                typeof window.apiService.fetchExperimentById,
                typeof window.apiService.fetchSensors,
                typeof window.apiService.fetchSensorDevices,
                typeof window.apiService.fetchSensorById,
                typeof window.apiService.fetchSensorTypes,
                typeof window.apiService.fetchMeasurements,
                typeof window.apiService.fetchProtocols,
                typeof window.apiService.uploadCSV,
                typeof window.apiService.healthCheck
            ]
        })

        // Toutes les méthodes doivent être des fonctions
        apiMethods.forEach(methodType => {
            expect(methodType).toBe('function')
        })
    })

    test('should display success message for AuthManager and ApiService integration', async ({ page }) => {
        // Capturer les messages console
        const consoleMessages = []
        page.on('console', msg => consoleMessages.push(msg.text()))

        // Recharger la page pour capturer tous les messages
        await page.reload()
        await page.waitForTimeout(2000)

        // Vérifier le message de succès d'intégration
        const hasIntegrationMessage = consoleMessages.some(msg =>
            msg.includes('DataVisualizationManager intégrés avec succès')
        )

        expect(hasIntegrationMessage).toBe(true)
    })

    test('should successfully perform login and show main app', async ({ page }) => {
        // Cliquer sur le bouton Explorer pour ouvrir la modale
        await page.click('#explore-btn')
        await page.waitForTimeout(500)

        // Vérifier que la modale est visible
        const modal = page.locator('#login-modal')
        await expect(modal).not.toHaveClass(/hidden/)

        // Remplir et soumettre le formulaire
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')

        // Attendre la transition
        await page.waitForTimeout(1000)

        // Vérifier que l'application principale est affichée
        const homepage = page.locator('#homepage')
        const mainApp = page.locator('#main-app')

        await expect(homepage).toHaveClass(/hidden/)
        await expect(mainApp).not.toHaveClass(/hidden/)
    })

    test('should successfully fetch experiments data after login', async ({ page }) => {
        // Se connecter d'abord
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Vérifier que des données sont chargées
        const experimentsExist = await page.evaluate(() => {
            return window.steamcity && window.steamcity.experiments && window.steamcity.experiments.length > 0
        })

        expect(experimentsExist).toBe(true)
    })

    test('should have working map after login', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(3000) // Attendre l'initialisation de la carte

        // Vérifier que la carte Leaflet est initialisée
        const mapExists = await page.evaluate(() => {
            return window.steamcity && window.steamcity.map !== null
        })

        expect(mapExists).toBe(true)

        // Vérifier que le conteneur de carte est visible
        const mapContainer = page.locator('#map')
        await expect(mapContainer).toBeVisible()
    })

    test('should navigate between views after login', async ({ page }) => {
        // Se connecter
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')
        await page.click('#login-form button[type="submit"]')
        await page.waitForTimeout(2000)

        // Tester la navigation vers la vue "Experiments"
        await page.click('#experiments-tab')
        await page.waitForTimeout(500)

        const experimentsView = page.locator('#experiments-view')
        await expect(experimentsView).toHaveClass(/active/)

        // Tester la navigation vers la vue "Sensors"
        await page.click('#sensors-tab')
        await page.waitForTimeout(500)

        const sensorsView = page.locator('#sensors-view')
        await expect(sensorsView).toHaveClass(/active/)

        // Retour à la carte
        await page.click('#map-tab')
        await page.waitForTimeout(500)

        const mapView = page.locator('#map-view')
        await expect(mapView).toHaveClass(/active/)
    })

    test('should show error message for wrong credentials', async ({ page }) => {
        await page.click('#explore-btn')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'wrongpassword')
        await page.click('#login-form button[type="submit"]')

        await page.waitForTimeout(500)

        const errorMessage = page.locator('.login-error')
        await expect(errorMessage).toBeVisible()
        await expect(errorMessage).toHaveText('Nom d\'utilisateur ou mot de passe incorrect')
    })
})