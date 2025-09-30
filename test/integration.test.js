import { describe, it, expect, beforeEach } from 'vitest'
import { test } from '@playwright/test'

describe('Integration Tests - AuthManager + SteamCityPlatform', () => {

    describe('Module Loading', () => {
        it('should load AuthManager module successfully', async () => {
            const { AuthManager } = await import('../public/js/auth-manager.js')
            expect(AuthManager).toBeDefined()
            expect(typeof AuthManager).toBe('function')
        })

        it('should load main.js module successfully', async () => {
            const mainModule = await import('../public/js/main.js')
            expect(mainModule.patchSteamCityWithAuthManager).toBeDefined()
        })
    })

    describe('AuthManager Integration', () => {
        let authManager

        beforeEach(() => {
            // Setup DOM for testing
            document.body.innerHTML = `
                <div id="login-modal" class="hidden">
                    <form id="login-form">
                        <input id="username" type="text" />
                        <input id="password" type="password" />
                        <button type="submit">Login</button>
                    </form>
                    <span class="close">&times;</span>
                </div>
                <button id="explore-btn">Explorer</button>
                <button id="logout-btn">Logout</button>
                <div id="homepage"></div>
                <div id="main-app" class="hidden"></div>
            `

            localStorage.clear()
            localStorage._store = {}

            const { AuthManager } = require('../public/js/auth-manager.js')
            authManager = new AuthManager()
        })

        it('should initialize AuthManager correctly', () => {
            expect(authManager.isAuthenticated).toBe(false)
            expect(authManager.getAuthState()).toBe(false)
        })

        it('should handle login flow correctly', async () => {
            const usernameInput = document.getElementById('username')
            const passwordInput = document.getElementById('password')

            usernameInput.value = 'admin'
            passwordInput.value = 'steamcity2024'

            const event = new Event('submit')
            event.preventDefault = () => {}

            const result = await authManager.handleLogin(event)

            expect(result).toBe(true)
            expect(authManager.getAuthState()).toBe(true)
            expect(localStorage.getItem('steamcity_authenticated')).toBe('true')
        })

        it('should emit events correctly', async () => {
            let loginEventFired = false
            let logoutEventFired = false

            window.addEventListener('auth:loginSuccess', () => {
                loginEventFired = true
            })

            window.addEventListener('auth:logout', () => {
                logoutEventFired = true
            })

            // Test login event
            const usernameInput = document.getElementById('username')
            const passwordInput = document.getElementById('password')
            usernameInput.value = 'admin'
            passwordInput.value = 'steamcity2024'

            const loginEvent = new Event('submit')
            loginEvent.preventDefault = () => {}

            await authManager.handleLogin(loginEvent)
            expect(loginEventFired).toBe(true)

            // Test logout event
            authManager.handleLogout()
            expect(logoutEventFired).toBe(true)
        })
    })
})

// Test de bout en bout avec Playwright
test.describe('End-to-End Integration Tests', () => {
    test('should load application with AuthManager integration', async ({ page }) => {
        await page.goto('http://localhost:8080')

        // Vérifier que la page se charge
        await expect(page).toHaveTitle(/SteamCity IoT Platform/)

        // Vérifier que les modules ES6 se chargent
        const consoleMessages = []
        page.on('console', msg => consoleMessages.push(msg.text()))

        // Attendre que l'application se charge
        await page.waitForTimeout(2000)

        // Vérifier les messages de console indiquant le succès de l'intégration
        const hasAuthManagerMessage = consoleMessages.some(msg =>
            msg.includes('AuthManager intégré avec succès')
        )
        const hasAppStartedMessage = consoleMessages.some(msg =>
            msg.includes('Application SteamCity démarrée avec AuthManager')
        )

        expect(hasAuthManagerMessage || hasAppStartedMessage).toBe(true)
    })

    test('should show login modal when explore button is clicked', async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)

        // Cliquer sur le bouton Explorer
        await page.click('#explore-btn')

        // Vérifier que la modale s'affiche
        const modal = page.locator('#login-modal')
        await expect(modal).not.toHaveClass(/hidden/)
    })

    test('should perform login flow correctly', async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)

        // Ouvrir la modale de login
        await page.click('#explore-btn')

        // Remplir le formulaire
        await page.fill('#username', 'admin')
        await page.fill('#password', 'steamcity2024')

        // Soumettre le formulaire
        await page.click('#login-form button[type="submit"]')

        // Vérifier que l'utilisateur est redirigé vers l'application principale
        await page.waitForTimeout(1000)

        const homepage = page.locator('#homepage')
        const mainApp = page.locator('#main-app')

        await expect(homepage).toHaveClass(/hidden/)
        await expect(mainApp).not.toHaveClass(/hidden/)
    })

    test('should show error message for wrong credentials', async ({ page }) => {
        await page.goto('http://localhost:8080')
        await page.waitForTimeout(2000)

        await page.click('#explore-btn')

        await page.fill('#username', 'admin')
        await page.fill('#password', 'wrongpassword')

        await page.click('#login-form button[type="submit"]')

        // Vérifier le message d'erreur
        const errorMessage = page.locator('.login-error')
        await expect(errorMessage).toBeVisible()
        await expect(errorMessage).toHaveText('Nom d\'utilisateur ou mot de passe incorrect')
    })
})