/**
 * Point d'entrée de l'application SteamCity
 * Utilise la classe App pour coordonner tous les managers
 */

import { App } from './app.js'

// Initialize the application
window.steamcity = new App()
await window.steamcity.init()

// Expose managers globally for debugging and E2E tests
window.authManager = window.steamcity.authManager
window.apiService = window.steamcity.apiService
window.mapManager = window.steamcity.mapManager
window.dataVizManager = window.steamcity.dataVizManager
window.experimentsManager = window.steamcity.experimentsManager
window.sensorsManager = window.steamcity.sensorsManager
window.viewManager = window.steamcity.viewManager
window.routerManager = window.steamcity.routerManager

console.log('🚀 Application SteamCity démarrée avec App class')
console.log('📦 Modules chargés:', {
    authManager: !!window.authManager,
    apiService: !!window.apiService,
    mapManager: !!window.mapManager,
    dataVizManager: !!window.dataVizManager,
    experimentsManager: !!window.experimentsManager,
    sensorsManager: !!window.sensorsManager,
    viewManager: !!window.viewManager,
    routerManager: !!window.routerManager,
    steamcity: !!window.steamcity
})

// Visual debug indicator
const debugDiv = document.createElement('div')
debugDiv.id = 'module-debug'
debugDiv.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: #27ae60; color: white; padding: 10px; border-radius: 5px; font-size: 12px; z-index: 10000;'
debugDiv.innerHTML = '✅ App chargée (sans script.js)'
document.body.appendChild(debugDiv)
setTimeout(() => debugDiv.remove(), 3000)
