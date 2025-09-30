/**
 * AuthManager - Gestion de l'authentification de la plateforme SteamCity
 * Responsable de la connexion, déconnexion et vérification d'état d'authentification
 */
export class AuthManager {
    constructor() {
        this.isAuthenticated = false
        this.correctPassword = 'steamcity2024'
        this.storageKey = 'steamcity_authenticated'

        this.init()
    }

    init() {
        this.checkAuthenticationState()
        this.bindEvents()
    }

    /**
     * Vérifie l'état d'authentification depuis localStorage
     */
    checkAuthenticationState() {
        this.isAuthenticated = localStorage.getItem(this.storageKey) === 'true'
    }

    /**
     * Binding des événements d'authentification
     */
    bindEvents() {
        // Bouton d'exploration (déclenche la modale de login)
        const exploreBtn = document.getElementById('explore-btn')
        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => this.showLoginModal())
        }

        // Fermeture de la modale
        const closeBtn = document.querySelector('#login-modal .close')
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideLoginModal())
        }

        // Fermeture de la modale en cliquant à l'extérieur
        const loginModal = document.getElementById('login-modal')
        if (loginModal) {
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) this.hideLoginModal()
            })
        }

        // Formulaire de login
        const loginForm = document.getElementById('login-form')
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e))
        }

        // Bouton de déconnexion
        const logoutBtn = document.getElementById('logout-btn')
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout())
        }
    }

    /**
     * Affiche la modale de connexion
     */
    showLoginModal() {
        const modal = document.getElementById('login-modal')
        if (modal) {
            modal.classList.remove('hidden')
        }
    }

    /**
     * Cache la modale de connexion
     */
    hideLoginModal() {
        const modal = document.getElementById('login-modal')
        if (modal) {
            modal.classList.add('hidden')
        }
        this.clearLoginForm()
    }

    /**
     * Gère la soumission du formulaire de connexion
     * @param {Event} e - Événement de soumission du formulaire
     * @returns {Promise<boolean>} - True si connexion réussie, false sinon
     */
    async handleLogin(e) {
        e.preventDefault()

        const username = document.getElementById('username')?.value
        const password = document.getElementById('password')?.value
        const loginForm = document.getElementById('login-form')

        // Nettoyer les erreurs précédentes
        this.clearLoginErrors()

        if (username && password === this.correctPassword) {
            // Connexion réussie
            localStorage.setItem(this.storageKey, 'true')
            this.isAuthenticated = true
            this.hideLoginModal()

            // Émettre un événement personnalisé pour notifier la connexion réussie
            window.dispatchEvent(new CustomEvent('auth:loginSuccess'))

            return true
        } else {
            // Connexion échouée
            this.showLoginError('Nom d\'utilisateur ou mot de passe incorrect')
            return false
        }
    }

    /**
     * Gère la déconnexion
     */
    handleLogout() {
        localStorage.removeItem(this.storageKey)
        this.isAuthenticated = false

        // Émettre un événement personnalisé pour notifier la déconnexion
        window.dispatchEvent(new CustomEvent('auth:logout'))

        // Rechargement de la page pour réinitialiser l'état
        location.reload()
    }

    /**
     * Affiche un message d'erreur de connexion
     * @param {string} message - Message d'erreur à afficher
     */
    showLoginError(message) {
        const loginForm = document.getElementById('login-form')
        if (!loginForm) return

        // Supprimer l'erreur existante
        this.clearLoginErrors()

        // Créer et ajouter le nouveau message d'erreur
        const errorDiv = document.createElement('div')
        errorDiv.className = 'login-error'
        errorDiv.textContent = message
        errorDiv.style.color = '#e74c3c'
        errorDiv.style.marginTop = '10px'
        errorDiv.style.fontSize = '14px'

        loginForm.appendChild(errorDiv)
    }

    /**
     * Nettoie les messages d'erreur de connexion
     */
    clearLoginErrors() {
        const existingError = document.querySelector('.login-error')
        if (existingError) {
            existingError.remove()
        }
    }

    /**
     * Nettoie le formulaire de connexion
     */
    clearLoginForm() {
        const usernameInput = document.getElementById('username')
        const passwordInput = document.getElementById('password')

        if (usernameInput) usernameInput.value = ''
        if (passwordInput) passwordInput.value = ''

        this.clearLoginErrors()
    }

    /**
     * Retourne l'état d'authentification actuel
     * @returns {boolean} - True si utilisateur authentifié, false sinon
     */
    getAuthState() {
        return this.isAuthenticated
    }

    /**
     * Force la vérification de l'état d'authentification
     * Utile après des opérations externes sur localStorage
     */
    refreshAuthState() {
        this.checkAuthenticationState()
        return this.isAuthenticated
    }
}