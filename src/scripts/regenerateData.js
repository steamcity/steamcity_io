const fs = require('fs')
const path = require('path')
const { generateAllExperiments } = require('../utils/dataGenerator')

// Fonction pour régénérer les données d'expériences
function regenerateExperiments() {
    console.log("Génération des nouvelles données d'expériences...")

    const experiments = generateAllExperiments()

    console.log(`✅ ${experiments.length} expériences générées`)

    // Affichage d'un échantillon pour vérification
    console.log('\n📋 Échantillon des expériences générées:')
    experiments.slice(0, 3).forEach((exp, i) => {
        console.log(`${i + 1}. ${exp.title}`)
        console.log(`   Protocole: ${exp.protocol}`)
        console.log(`   École: ${exp.school}`)
        console.log(`   Étudiant: ${exp.studentName}`)
        console.log(`   Hypothèse: ${exp.hypothesis.substring(0, 80)}...`)
        console.log('')
    })

    // Sauvegarde dans le fichier data/experiments.json
    const dataPath = path.join(__dirname, '../../data/experiments.json')
    fs.writeFileSync(dataPath, JSON.stringify(experiments, null, 2))

    console.log(`✅ Données sauvegardées dans ${dataPath}`)

    // Statistiques par protocole
    const protocolStats = {}
    experiments.forEach(exp => {
        protocolStats[exp.protocol] = (protocolStats[exp.protocol] || 0) + 1
    })

    console.log('\n📊 Répartition par protocole:')
    Object.entries(protocolStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([protocol, count]) => {
            console.log(`   ${protocol}: ${count} expériences`)
        })

    // Statistiques par langue/pays
    const languageStats = {}
    experiments.forEach(exp => {
        if (
            exp.school.includes('La Rochelle') ||
            exp.school.includes('Paris') ||
            exp.school.includes('Aix-en-Provence')
        ) {
            languageStats['Français'] = (languageStats['Français'] || 0) + 1
        } else if (exp.school.includes('Bruxelles')) {
            languageStats['Français (Belgique)'] = (languageStats['Français (Belgique)'] || 0) + 1
        } else if (exp.school.includes('Madrid')) {
            languageStats['Español'] = (languageStats['Español'] || 0) + 1
        } else if (exp.school.includes('Napoli')) {
            languageStats['Italiano'] = (languageStats['Italiano'] || 0) + 1
        } else if (exp.school.includes('Sofia')) {
            languageStats['English'] = (languageStats['English'] || 0) + 1
        }
    })

    console.log('\n🌍 Répartition par langue:')
    Object.entries(languageStats).forEach(([lang, count]) => {
        console.log(`   ${lang}: ${count} expériences`)
    })

    return experiments
}

// Script principal
if (require.main === module) {
    try {
        console.log('🚀 Début de la régénération des données SteamCity...\n')

        const experiments = regenerateExperiments()

        console.log('\n✅ Régénération terminée avec succès!')
        console.log(`📈 Total: ${experiments.length} expériences créées`)
        console.log('🔄 Redémarrez le serveur pour voir les nouvelles données')
    } catch (error) {
        console.error('❌ Erreur lors de la régénération:', error)
        process.exit(1)
    }
}

module.exports = { regenerateExperiments }
