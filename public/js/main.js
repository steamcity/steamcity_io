/**
 * Point d'entrée hybride - utilise AuthManager + script.js original
 * Cette approche permet de tester l'intégration en toute sécurité
 */
import { AuthManager } from './auth-manager.js'

// Variables globales pour l'intégration
window.authManager = null
window.originalSteamCity = null

// Fonction pour modifier la classe SteamCityPlatform existante
function patchSteamCityWithAuthManager() {
    // Attendre que script.js soit chargé
    const checkOriginalClass = setInterval(() => {
        if (window.SteamCityPlatform) {
            clearInterval(checkOriginalClass)

            // Sauvegarder l'instance originale
            const OriginalClass = window.SteamCityPlatform

            // Créer une version patchée
            class PatchedSteamCityPlatform extends OriginalClass {
                constructor() {
                    super()

                    // Créer AuthManager APRÈS l'appel à super()
                    this.authManager = new AuthManager()

                    // Override des méthodes d'authentification
                    this.overrideAuthMethods()

                    console.log('✅ AuthManager intégré avec succès dans SteamCityPlatform')
                }

                overrideAuthMethods() {
                    // Override checkAuthenticationState
                    this.checkAuthenticationState = () => {
                        this.isAuthenticated = this.authManager.getAuthState()
                    }

                    // Override showLoginModal
                    this.showLoginModal = () => {
                        this.authManager.showLoginModal()
                    }

                    // Override hideLoginModal
                    this.hideLoginModal = () => {
                        this.authManager.hideLoginModal()
                    }

                    // Override handleLogin
                    this.handleLogin = async (e) => {
                        const result = await this.authManager.handleLogin(e)
                        if (result) {
                            // Connexion réussie - continuer avec l'ancien flux
                            await this.showMainApp()
                        }
                        return result
                    }

                    // Override handleLogout
                    this.handleLogout = () => {
                        this.authManager.handleLogout()
                        // Le rechargement est géré par AuthManager
                    }

                    // Écouter les événements d'AuthManager
                    window.addEventListener('auth:loginSuccess', async () => {
                        this.isAuthenticated = true
                        await this.showMainApp()
                    })

                    window.addEventListener('auth:logout', () => {
                        this.isAuthenticated = false
                        // Le rechargement est géré par AuthManager
                    })
                }

                // Override bindEvents pour ne pas re-binder les événements auth
                bindEvents() {
                    // Appeler la méthode parent mais sans les événements auth
                    // (AuthManager gère déjà ces événements)

                    // Navigation events
                    const mapTab = document.getElementById('map-tab')
                    const experimentsTab = document.getElementById('experiments-tab')
                    const dataTab = document.getElementById('data-tab')
                    const sensorsTab = document.getElementById('sensors-tab')

                    mapTab?.addEventListener('click', () => this.showView('map'))
                    experimentsTab?.addEventListener('click', () => this.showView('experiments'))
                    dataTab?.addEventListener('click', () => this.showView('data'))
                    sensorsTab?.addEventListener('click', () => this.showView('sensors'))

                    // Protocol filters
                    document.getElementById('protocol-filter')?.addEventListener('change', (e) => this.filterByProtocol(e.target.value))

                    // Window events
                    window.addEventListener('hashchange', () => this.handleRoute(false))
                    window.addEventListener('popstate', () => this.handleRoute(false))

                    console.log('✅ Événements bindés (auth délégué à AuthManager)')
                }

                // Override init pour utiliser AuthManager
                async init() {
                    // AuthManager gère déjà son état - pas besoin d'appeler checkAuthenticationState
                    this.isAuthenticated = this.authManager.getAuthState()

                    this.bindEvents()
                    await this.showHomepage()
                }
            }

            // Remplacer la classe globale
            window.SteamCityPlatform = PatchedSteamCityPlatform

            // Créer une nouvelle instance
            window.steamcity = new PatchedSteamCityPlatform()

            console.log('🚀 Application SteamCity démarrée avec AuthManager')
        }
    }, 100)
}

// Charger script.js puis appliquer le patch
const script = document.createElement('script')
script.src = 'script.js'
script.onload = () => {
    patchSteamCityWithAuthManager()
}
script.onerror = (error) => {
    console.error('❌ Erreur lors du chargement de script.js:', error)
}
document.head.appendChild(script)

// Export pour les tests
export { patchSteamCityWithAuthManager }