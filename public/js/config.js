/**
 * Configuration et utilitaires de l'application SteamCity
 *
 * Ce module contient les données de configuration et les fonctions utilitaires
 * utilisées à travers l'application.
 *
 * @module config
 */

/**
 * Couleurs des protocoles/clusters
 */
export const protocolColors = {
    governance: '#e74c3c',
    environmental: '#27ae60',
    mobility: '#3498db',
    energy: '#f39c12',
    technology: '#9b59b6',
    other: '#95a5a6'
}

/**
 * Labels des protocoles en français
 */
const protocolLabels = {
    environmental: 'Qualité environnementale, climat et bien-être',
    energy: 'Économies d\'énergie',
    mobility: 'Mobilité',
    governance: 'Gouvernance et citoyenneté',
    technology: 'IA et technologies'
}

/**
 * Icônes des protocoles (emoji)
 */
const protocolIcons = {
    environmental: '🌱',
    energy: '⚡',
    mobility: '🚗',
    governance: '🏛️',
    technology: '💻'
}

/**
 * Obtient le label d'un protocole
 * @param {string} protocol - Le code du protocole
 * @returns {string} Le label du protocole ou le code si non trouvé
 */
export function getProtocolLabel(protocol) {
    return protocolLabels[protocol] || protocol
}

/**
 * Obtient l'icône d'un protocole
 * @param {string} protocol - Le code du protocole
 * @returns {string} L'icône (emoji) du protocole ou '📋' par défaut
 */
export function getProtocolIcon(protocol) {
    return protocolIcons[protocol] || '📋'
}
