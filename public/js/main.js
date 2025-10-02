/**
 * Point d'entrée de l'application SteamCity
 * Version standalone sans script.js
 */

import { App } from './app.js'

// Initialisation de l'application avec IIFE pour gérer l'asynchrone
;(async () => {
    try {
        console.log("🚀 Démarrage de l'application SteamCity...")

        // Créer l'instance de l'application
        window.steamcity = new App()

        // Initialiser l'application
        await window.steamcity.init()

        // Exposer les managers globalement
        window.authManager = window.steamcity.authManager
        window.apiService = window.steamcity.apiService
        window.mapManager = window.steamcity.mapManager
        window.dataVizManager = window.steamcity.dataVizManager
        window.experimentsManager = window.steamcity.experimentsManager
        window.sensorsManager = window.steamcity.sensorsManager
        window.viewManager = window.steamcity.viewManager
        window.routerManager = window.steamcity.routerManager

        console.log('✅ Application SteamCity initialisée avec succès')
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation de l'application:", error)
        console.error('Stack trace:', error.stack)

        // Afficher un message d'erreur à l'utilisateur
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif;">
                <h1 style="color: #e74c3c;">Erreur de chargement</h1>
                <p>Impossible de charger l'application. Veuillez recharger la page.</p>
                <p style="color: #7f8c8d; font-size: 0.9em;">Détails: ${error.message}</p>
                <pre style="color: #7f8c8d; font-size: 0.8em; max-width: 80%; overflow: auto;">${error.stack}</pre>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Recharger
                </button>
            </div>
        `
    }
})()
