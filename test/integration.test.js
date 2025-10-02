import { describe, it, expect, beforeEach } from 'vitest'

describe('Integration Tests - AuthManager + SteamCityPlatform', () => {
    describe('Module Loading', () => {
        it('should load AuthManager module successfully', async () => {
            const { AuthManager } = await import('../public/js/auth-manager.js')
            expect(AuthManager).toBeDefined()
            expect(typeof AuthManager).toBe('function')
        })

        it('should load main.js module successfully', async () => {
            const mainModule = await import('../public/js/main.js')
            // main.js is an IIFE that initializes the app, no exports expected
            expect(mainModule).toBeDefined()
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
