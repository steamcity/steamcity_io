import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthManager } from '../public/js/auth-manager.js'

describe('AuthManager', () => {
    let authManager

    beforeEach(() => {
        // Reset DOM
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
        `

        // Reset localStorage
        vi.clearAllMocks()
        localStorage.clear()
        localStorage._store = {}

        // Create fresh instance
        authManager = new AuthManager()
    })

    describe('Initialization', () => {
        it('should initialize with correct default values', () => {
            expect(authManager.isAuthenticated).toBe(false)
            expect(authManager.correctPassword).toBe('steamcity2024')
            expect(authManager.storageKey).toBe('steamcity_authenticated')
        })

        it('should check authentication state on init', () => {
            localStorage.setItem('steamcity_authenticated', 'true')
            const newAuthManager = new AuthManager()
            expect(newAuthManager.isAuthenticated).toBe(true)
        })
    })

    describe('Authentication State Management', () => {
        it('should return false when not authenticated', () => {
            expect(authManager.getAuthState()).toBe(false)
        })

        it('should return true when authenticated', () => {
            localStorage.setItem('steamcity_authenticated', 'true')
            authManager.refreshAuthState()
            expect(authManager.getAuthState()).toBe(true)
        })

        it('should refresh auth state from localStorage', () => {
            // Initially false
            expect(authManager.isAuthenticated).toBe(false)

            // Set in localStorage externally
            localStorage.setItem('steamcity_authenticated', 'true')

            // Should still be false until refreshed
            expect(authManager.isAuthenticated).toBe(false)

            // Refresh should update
            authManager.refreshAuthState()
            expect(authManager.isAuthenticated).toBe(true)
        })
    })

    describe('Modal Management', () => {
        it('should show login modal', () => {
            const modal = document.getElementById('login-modal')
            expect(modal.classList.contains('hidden')).toBe(true)

            authManager.showLoginModal()
            expect(modal.classList.contains('hidden')).toBe(false)
        })

        it('should hide login modal', () => {
            const modal = document.getElementById('login-modal')
            modal.classList.remove('hidden')

            authManager.hideLoginModal()
            expect(modal.classList.contains('hidden')).toBe(true)
        })

        it('should clear login form when hiding modal', () => {
            const usernameInput = document.getElementById('username')
            const passwordInput = document.getElementById('password')

            usernameInput.value = 'test'
            passwordInput.value = 'test'

            authManager.hideLoginModal()

            expect(usernameInput.value).toBe('')
            expect(passwordInput.value).toBe('')
        })
    })

    describe('Login Process', () => {
        it('should login successfully with correct credentials', async () => {
            const usernameInput = document.getElementById('username')
            const passwordInput = document.getElementById('password')

            usernameInput.value = 'admin'
            passwordInput.value = 'steamcity2024'

            const event = new Event('submit')
            event.preventDefault = vi.fn()

            const result = await authManager.handleLogin(event)

            expect(event.preventDefault).toHaveBeenCalled()
            expect(result).toBe(true)
            expect(authManager.isAuthenticated).toBe(true)
            expect(localStorage.getItem('steamcity_authenticated')).toBe('true')
        })

        it('should fail login with incorrect password', async () => {
            const usernameInput = document.getElementById('username')
            const passwordInput = document.getElementById('password')

            usernameInput.value = 'admin'
            passwordInput.value = 'wrongpassword'

            const event = new Event('submit')
            event.preventDefault = vi.fn()

            const result = await authManager.handleLogin(event)

            expect(result).toBe(false)
            expect(authManager.isAuthenticated).toBe(false)
            expect(localStorage.getItem('steamcity_authenticated')).toBeNull()
        })

        it('should show error message for incorrect credentials', async () => {
            const usernameInput = document.getElementById('username')
            const passwordInput = document.getElementById('password')

            usernameInput.value = 'admin'
            passwordInput.value = 'wrong'

            const event = new Event('submit')
            event.preventDefault = vi.fn()

            await authManager.handleLogin(event)

            const errorElement = document.querySelector('.login-error')
            expect(errorElement).toBeTruthy()
            expect(errorElement.textContent).toBe('Nom d\'utilisateur ou mot de passe incorrect')
        })

        it('should clear previous error messages', async () => {
            // First failed login
            const usernameInput = document.getElementById('username')
            const passwordInput = document.getElementById('password')

            usernameInput.value = 'admin'
            passwordInput.value = 'wrong'

            const event = new Event('submit')
            event.preventDefault = vi.fn()

            await authManager.handleLogin(event)
            expect(document.querySelector('.login-error')).toBeTruthy()

            // Second failed login should clear previous error
            await authManager.handleLogin(event)
            const errorElements = document.querySelectorAll('.login-error')
            expect(errorElements.length).toBe(1) // Only one error element should exist
        })

        it('should emit loginSuccess event on successful login', async () => {
            const eventListener = vi.fn()
            window.addEventListener('auth:loginSuccess', eventListener)

            const usernameInput = document.getElementById('username')
            const passwordInput = document.getElementById('password')

            usernameInput.value = 'admin'
            passwordInput.value = 'steamcity2024'

            const event = new Event('submit')
            event.preventDefault = vi.fn()

            await authManager.handleLogin(event)

            expect(eventListener).toHaveBeenCalled()

            window.removeEventListener('auth:loginSuccess', eventListener)
        })
    })

    describe('Logout Process', () => {
        it('should logout successfully', () => {
            const eventListener = vi.fn()
            window.addEventListener('auth:logout', eventListener)

            // Set as authenticated first
            authManager.isAuthenticated = true
            localStorage.setItem('steamcity_authenticated', 'true')

            authManager.handleLogout()

            expect(authManager.isAuthenticated).toBe(false)
            expect(localStorage.getItem('steamcity_authenticated')).toBeNull()
            expect(eventListener).toHaveBeenCalled()
            expect(window.location.reload).toHaveBeenCalled()

            window.removeEventListener('auth:logout', eventListener)
        })
    })

    describe('Event Binding', () => {
        it('should bind explore button click event', () => {
            const exploreBtn = document.getElementById('explore-btn')
            const showModalSpy = vi.spyOn(authManager, 'showLoginModal')

            exploreBtn.click()

            expect(showModalSpy).toHaveBeenCalled()

            showModalSpy.mockRestore()
        })

        it('should bind close button click event', () => {
            const closeBtn = document.querySelector('#login-modal .close')
            const hideModalSpy = vi.spyOn(authManager, 'hideLoginModal')

            closeBtn.click()

            expect(hideModalSpy).toHaveBeenCalled()

            hideModalSpy.mockRestore()
        })

        it('should bind logout button click event', () => {
            const logoutBtn = document.getElementById('logout-btn')
            const handleLogoutSpy = vi.spyOn(authManager, 'handleLogout')

            logoutBtn.click()

            expect(handleLogoutSpy).toHaveBeenCalled()

            handleLogoutSpy.mockRestore()
        })
    })
})