const { DETAILED_PROTOCOLS } = require('../../data/steamcity-protocols')

// Définition des pays avec leurs langues, écoles et noms d'étudiants
const COUNTRIES_DATA = {
    France: {
        language: 'fr',
        cities: [
            {
                name: 'La Rochelle',
                schools: [
                    'Lycée Jean Dautet',
                    'Collège Pierre Mendès France',
                    'Lycée René-Josué Valin',
                    'Collège Eugène Fromentin'
                ]
            },
            {
                name: 'Paris',
                schools: [
                    'Lycée Henri-IV',
                    'Collège François Couperin',
                    'Lycée Voltaire',
                    'Collège Victor Hugo',
                    'Lycée Charlemagne',
                    'Collège Françoise Dolto'
                ]
            },
            {
                name: 'Aix-en-Provence',
                schools: [
                    'Lycée Vauvenargues',
                    'Collège Arc de Meyran',
                    'Lycée Paul Cézanne',
                    'Collège Jas de Bouffan'
                ]
            }
        ],
        studentNames: [
            'Antoine Dubois',
            'Sarah Moreau',
            'Lucas Martin',
            'Emma Leroy',
            'Paul Simon',
            'Léa Petit',
            'Hugo Durand',
            'Alice Robert',
            'Tom Garcia',
            'Chloé Bernard',
            'Nathan Fournier',
            'Manon Roux',
            'Louis Dupont',
            'Clara Girard',
            'Théo Laurent',
            'Inès Michel',
            'Maxime André',
            'Camille Lefèvre',
            'Arthur Thomas',
            'Zoé Faure'
        ]
    },
    Belgium: {
        language: 'fr', // Partie francophone
        cities: [
            {
                name: 'Bruxelles',
                schools: [
                    "Athénée Royal d'Uccle I",
                    'Institut Saint-Boniface',
                    'Lycée Français Jean Monnet',
                    'Collège Saint-Pierre'
                ]
            }
        ],
        studentNames: [
            'Nicolas Janssen',
            'Louise Van Der Berg',
            'Alexandre Peeters',
            'Sophie Hendricks',
            'Maxime Claes',
            'Emma Willems',
            'Thomas De Vos',
            'Laura Mertens',
            'Antoine Dupuis',
            'Marie Leclercq',
            'Simon Jacobs',
            'Amélie Van Den Berg',
            'Julien Martens',
            'Charlotte Vermeulen'
        ]
    },
    Spain: {
        language: 'es',
        cities: [
            {
                name: 'Madrid',
                schools: [
                    'IES San Mateo',
                    'Colegio San Patricio',
                    'IES Ramiro de Maeztu',
                    'Lycée Français de Madrid'
                ]
            }
        ],
        studentNames: [
            'Pablo García',
            'Sofía Rodríguez',
            'Diego Martínez',
            'Valentina López',
            'Mateo Sánchez',
            'Isabella Pérez',
            'Santiago González',
            'Camila Romero',
            'Nicolás Herrera',
            'Martina Ruiz',
            'Alejandro Torres',
            'Lucía Flores',
            'Gabriel Morales',
            'Victoria Castro',
            'Daniel Ortega',
            'Antonella Vargas'
        ]
    },
    Italy: {
        language: 'it',
        cities: [
            {
                name: 'Napoli',
                schools: [
                    'Liceo Classico Umberto I',
                    'IIS Galileo Ferraris',
                    'ISIS Europa',
                    'Liceo Scientifico A. Labriola'
                ]
            }
        ],
        studentNames: [
            'Marco Rossi',
            'Giulia Bianchi',
            'Francesco Romano',
            'Sofia Esposito',
            'Alessandro Marino',
            'Chiara Ricci',
            'Matteo Greco',
            'Valentina Galli',
            'Leonardo Conti',
            'Francesca De Santis',
            'Davide Palmieri',
            'Martina Serra',
            'Gabriele Rizzo',
            'Aurora Lombardi',
            'Antonio Caruso',
            'Giorgia Ferri'
        ]
    },
    Bulgaria: {
        language: 'en', // Les écoles enseignent en anglais
        cities: [
            {
                name: 'Sofia',
                schools: [
                    'American College of Sofia',
                    '91 German Language School',
                    'First English Language School',
                    'French School Victor Hugo'
                ]
            }
        ],
        studentNames: [
            'Viktor Petrov',
            'Elena Dimitrova',
            'Aleksandar Georgiev',
            'Maria Ivanova',
            'Dimitar Stoyanov',
            'Teodora Nikolova',
            'Hristo Vasilev',
            'Yoana Todorova',
            'Plamen Angelov',
            'Ralitsa Hristova',
            'Bozhidar Mihailov',
            'Desislava Petrova',
            'Atanas Dobrev',
            'Kristina Koleva',
            'Emil Yankov',
            'Silviya Stoycheva'
        ]
    }
}

// Traductions des textes selon les langues
const TRANSLATIONS = {
    fr: {
        experimentTitleTemplate: 'Étude {protocol} - {school}',
        experimentDescriptionTemplate:
            'Mesure et analyse dans le cadre du protocole {protocol} à {school}',
        hypotheses: {
            'Air Quality': [
                "La qualité de l'air varie selon les heures et les zones",
                'Les facteurs météorologiques influencent les concentrations de polluants',
                "Les activités humaines impactent directement la qualité de l'air intérieur"
            ],
            Sound: [
                "Le niveau sonore influence la concentration et l'apprentissage",
                'Les sources de bruit varient selon les zones urbaines',
                "L'isolation acoustique réduit significativement les nuisances"
            ],
            Light: [
                "L'éclairage artificiel perturbe les rythmes circadiens",
                "L'intensité lumineuse optimale améliore la productivité",
                'Les variations de lumière naturelle affectent le bien-être'
            ],
            Energy: [
                'La consommation énergétique suit des patterns prévisibles',
                'Les énergies renouvelables peuvent couvrir une partie significative des besoins',
                "L'efficacité énergétique dépend des comportements d'usage"
            ],
            Temperature: [
                "L'isolation thermique réduit les pertes de chaleur",
                'La température influence directement le confort et la concentration',
                'Les îlots de chaleur urbains créent des microclimats'
            ],
            Biodiversity: [
                "La diversité des espèces reflète la santé de l'écosystème urbain",
                'Les corridors verts favorisent la circulation des espèces',
                "L'urbanisation impacte négativement la biodiversité locale"
            ],
            AI: [
                "L'intelligence artificielle peut automatiser l'analyse de données complexes",
                "Les algorithmes d'apprentissage automatique détectent des patterns cachés",
                "La classification automatique améliore l'efficacité du tri et de l'analyse"
            ],
            Mobility: [
                "La régulation du trafic réduit l'impact environnemental",
                'Les modes de transport alternatifs diminuent la pollution',
                'La signalisation intelligente optimise la fluidité du trafic'
            ],
            IoT: [
                'Les objets connectés permettent une collecte de données en temps réel',
                "L'IoT facilite le monitoring automatique des paramètres environnementaux",
                'Les capteurs intelligents optimisent la gestion des ressources'
            ],
            'Data Analysis': [
                "L'analyse de données révèle des corrélations inattendues",
                'Le contexte est essentiel pour interpréter correctement les données',
                'La visualisation de données facilite la compréhension des phénomènes'
            ]
        },
        methodologies: {
            'Air Quality': [
                "Placement de capteurs de qualité de l'air dans différentes zones et mesures continues",
                'Utilisation de capteurs CO2, particules fines et analyse des corrélations météo',
                'Monitoring en temps réel avec transmission des données via IoT'
            ],
            Sound: [
                'Mesures acoustiques avec sonomètres calibrés à différents moments de la journée',
                'Cartographie sonore avec géolocalisation des sources de bruit',
                'Analyse fréquentielle et corrélation avec les activités humaines'
            ],
            Light: [
                "Mesures d'intensité lumineuse avec luxmètres et analyse spectrale",
                'Monitoring continu jour/nuit pour étudier les variations circadiennes',
                'Corrélation entre éclairage artificiel et qualité du sommeil'
            ],
            Energy: [
                'Installation de compteurs intelligents et analyse des consommations',
                "Mesure de production d'énergies renouvelables et calcul d'efficacité",
                "Modélisation des besoins énergétiques et scénarios d'optimisation"
            ],
            Temperature: [
                'Mesures thermiques avec caméras infrarouges et thermomètres de précision',
                'Cartographie thermique des bâtiments pour identifier les déperditions',
                'Analyse comparative avant/après isolation ou amélioration thermique'
            ],
            Biodiversity: [
                'Comptage et identification des espèces par observation directe et photographique',
                "Utilisation d'applications de science participative pour la collecte de données",
                'Cartographie de la biodiversité avec géolocalisation des observations'
            ],
            AI: [
                "Développement d'algorithmes de classification et entraînement sur jeux de données",
                "Utilisation d'APIs de vision artificielle pour l'analyse d'images",
                'Implémentation de réseaux de neurones pour la reconnaissance de patterns'
            ],
            Mobility: [
                'Comptage du trafic avec capteurs automatiques et analyse des flux',
                "Étude d'impact des mesures de régulation sur la qualité de l'air",
                'Modélisation des itinéraires optimaux et analyse des modes de transport'
            ],
            IoT: [
                "Conception et programmation d'objets connectés avec microcontrôleurs",
                'Intégration de capteurs multiples et transmission de données sans fil',
                "Développement d'interfaces utilisateur pour la visualisation en temps réel"
            ],
            'Data Analysis': [
                'Collecte de données multi-sources et nettoyage des jeux de données',
                "Application d'outils statistiques et de visualisation pour l'analyse",
                'Validation des hypothèses par tests statistiques et peer review'
            ]
        }
    },
    es: {
        experimentTitleTemplate: 'Estudio {protocol} - {school}',
        experimentDescriptionTemplate:
            'Medición y análisis en el marco del protocolo {protocol} en {school}',
        hypotheses: {
            'Air Quality': [
                'La calidad del aire varía según las horas y las zonas',
                'Los factores meteorológicos influyen en las concentraciones de contaminantes',
                'Las actividades humanas impactan directamente la calidad del aire interior'
            ],
            Sound: [
                'El nivel sonoro influye en la concentración y el aprendizaje',
                'Las fuentes de ruido varían según las zonas urbanas',
                'El aislamiento acústico reduce significativamente las molestias'
            ],
            Light: [
                'La iluminación artificial altera los ritmos circadianos',
                'La intensidad lumínica óptima mejora la productividad',
                'Las variaciones de luz natural afectan el bienestar'
            ],
            Energy: [
                'El consumo energético sigue patrones predecibles',
                'Las energías renovables pueden cubrir una parte significativa de las necesidades',
                'La eficiencia energética depende de los comportamientos de uso'
            ],
            Temperature: [
                'El aislamiento térmico reduce las pérdidas de calor',
                'La temperatura influye directamente en el confort y la concentración',
                'Las islas de calor urbanas crean microclimas'
            ],
            Biodiversity: [
                'La diversidad de especies refleja la salud del ecosistema urbano',
                'Los corredores verdes favorecen la circulación de especies',
                'La urbanización impacta negativamente la biodiversidad local'
            ],
            AI: [
                'La inteligencia artificial puede automatizar el análisis de datos complejos',
                'Los algoritmos de aprendizaje automático detectan patrones ocultos',
                'La clasificación automática mejora la eficiencia del análisis'
            ],
            Mobility: [
                'La regulación del tráfico reduce el impacto ambiental',
                'Los modos de transporte alternativos disminuyen la contaminación',
                'La señalización inteligente optimiza la fluidez del tráfico'
            ],
            IoT: [
                'Los objetos conectados permiten una recopilación de datos en tiempo real',
                'El IoT facilita el monitoreo automático de parámetros ambientales',
                'Los sensores inteligentes optimizan la gestión de recursos'
            ],
            'Data Analysis': [
                'El análisis de datos revela correlaciones inesperadas',
                'El contexto es esencial para interpretar correctamente los datos',
                'La visualización de datos facilita la comprensión de fenómenos'
            ]
        },
        methodologies: {
            'Air Quality': [
                'Colocación de sensores de calidad del aire en diferentes zonas y mediciones continuas',
                'Uso de sensores CO2, partículas finas y análisis de correlaciones meteorológicas',
                'Monitoreo en tiempo real con transmisión de datos vía IoT'
            ],
            Sound: [
                'Mediciones acústicas con sonómetros calibrados en diferentes momentos del día',
                'Cartografía sonora con geolocalización de fuentes de ruido',
                'Análisis frecuencial y correlación con actividades humanas'
            ],
            Light: [
                'Mediciones de intensidad lumínica con luxómetros y análisis espectral',
                'Monitoreo continuo día/noche para estudiar variaciones circadianas',
                'Correlación entre iluminación artificial y calidad del sueño'
            ],
            Energy: [
                'Instalación de contadores inteligentes y análisis de consumos',
                'Medición de producción de energías renovables y cálculo de eficiencia',
                'Modelización de necesidades energéticas y escenarios de optimización'
            ],
            Temperature: [
                'Mediciones térmicas con cámaras infrarrojas y termómetros de precisión',
                'Cartografía térmica de edificios para identificar pérdidas',
                'Análisis comparativo antes/después de aislamiento o mejora térmica'
            ],
            Biodiversity: [
                'Conteo e identificación de especies por observación directa y fotográfica',
                'Uso de aplicaciones de ciencia participativa para recopilación de datos',
                'Cartografía de biodiversidad con geolocalización de observaciones'
            ],
            AI: [
                'Desarrollo de algoritmos de clasificación y entrenamiento en conjuntos de datos',
                'Uso de APIs de visión artificial para análisis de imágenes',
                'Implementación de redes neuronales para reconocimiento de patrones'
            ],
            Mobility: [
                'Conteo de tráfico con sensores automáticos y análisis de flujos',
                'Estudio de impacto de medidas de regulación en la calidad del aire',
                'Modelización de rutas óptimas y análisis de modos de transporte'
            ],
            IoT: [
                'Diseño y programación de objetos conectados con microcontroladores',
                'Integración de sensores múltiples y transmisión de datos inalámbrica',
                'Desarrollo de interfaces de usuario para visualización en tiempo real'
            ],
            'Data Analysis': [
                'Recopilación de datos multi-fuente y limpieza de conjuntos de datos',
                'Aplicación de herramientas estadísticas y visualización para análisis',
                'Validación de hipótesis mediante pruebas estadísticas y revisión por pares'
            ]
        }
    },
    it: {
        experimentTitleTemplate: 'Studio {protocol} - {school}',
        experimentDescriptionTemplate:
            'Misurazione e analisi nel quadro del protocollo {protocol} presso {school}',
        hypotheses: {
            'Air Quality': [
                "La qualità dell'aria varia secondo le ore e le zone",
                'I fattori meteorologici influenzano le concentrazioni di inquinanti',
                "Le attività umane impattano direttamente la qualità dell'aria interna"
            ],
            Sound: [
                "Il livello sonoro influenza la concentrazione e l'apprendimento",
                'Le fonti di rumore variano secondo le zone urbane',
                "L'isolamento acustico riduce significativamente i disturbi"
            ],
            Light: [
                "L'illuminazione artificiale disturba i ritmi circadiani",
                "L'intensità luminosa ottimale migliora la produttività",
                'Le variazioni di luce naturale influenzano il benessere'
            ],
            Energy: [
                'Il consumo energetico segue modelli prevedibili',
                'Le energie rinnovabili possono coprire una parte significativa dei bisogni',
                "L'efficienza energetica dipende dai comportamenti d'uso"
            ],
            Temperature: [
                "L'isolamento termico riduce le perdite di calore",
                'La temperatura influenza direttamente il comfort e la concentrazione',
                'Le isole di calore urbane creano microclimi'
            ],
            Biodiversity: [
                "La diversità delle specie riflette la salute dell'ecosistema urbano",
                'I corridoi verdi favoriscono la circolazione delle specie',
                "L'urbanizzazione impatta negativamente la biodiversità locale"
            ],
            AI: [
                "L'intelligenza artificiale può automatizzare l'analisi di dati complessi",
                'Gli algoritmi di apprendimento automatico rilevano pattern nascosti',
                "La classificazione automatica migliora l'efficienza dell'analisi"
            ],
            Mobility: [
                "La regolazione del traffico riduce l'impatto ambientale",
                "Le modalità di trasporto alternative diminuiscono l'inquinamento",
                'La segnaletica intelligente ottimizza la fluidità del traffico'
            ],
            IoT: [
                'Gli oggetti connessi permettono una raccolta dati in tempo reale',
                "L'IoT facilita il monitoraggio automatico dei parametri ambientali",
                'I sensori intelligenti ottimizzano la gestione delle risorse'
            ],
            'Data Analysis': [
                "L'analisi dei dati rivela correlazioni inaspettate",
                'Il contesto è essenziale per interpretare correttamente i dati',
                'La visualizzazione dei dati facilita la comprensione dei fenomeni'
            ]
        },
        methodologies: {
            'Air Quality': [
                "Posizionamento di sensori di qualità dell'aria in diverse zone e misurazioni continue",
                'Uso di sensori CO2, particelle sottili e analisi delle correlazioni meteo',
                'Monitoraggio in tempo reale con trasmissione dati via IoT'
            ],
            Sound: [
                'Misurazioni acustiche con fonometri calibrati in diversi momenti della giornata',
                'Cartografia sonora con geolocalizzazione delle fonti di rumore',
                'Analisi frequenziale e correlazione con le attività umane'
            ],
            Light: [
                'Misurazioni di intensità luminosa con luxmetri e analisi spettrale',
                'Monitoraggio continuo giorno/notte per studiare le variazioni circadiane',
                'Correlazione tra illuminazione artificiale e qualità del sonno'
            ],
            Energy: [
                'Installazione di contatori intelligenti e analisi dei consumi',
                "Misurazione della produzione di energie rinnovabili e calcolo dell'efficienza",
                'Modellizzazione dei fabbisogni energetici e scenari di ottimizzazione'
            ],
            Temperature: [
                'Misurazioni termiche con telecamere a infrarossi e termometri di precisione',
                'Cartografia termica degli edifici per identificare le dispersioni',
                'Analisi comparativa prima/dopo isolamento o miglioramento termico'
            ],
            Biodiversity: [
                'Conteggio e identificazione delle specie per osservazione diretta e fotografica',
                'Uso di applicazioni di citizen science per la raccolta dati',
                'Cartografia della biodiversità con geolocalizzazione delle osservazioni'
            ],
            AI: [
                'Sviluppo di algoritmi di classificazione e addestramento su dataset',
                "Uso di API di visione artificiale per l'analisi delle immagini",
                'Implementazione di reti neurali per il riconoscimento di pattern'
            ],
            Mobility: [
                'Conteggio del traffico con sensori automatici e analisi dei flussi',
                "Studio dell'impatto delle misure di regolazione sulla qualità dell'aria",
                'Modellizzazione di percorsi ottimali e analisi dei modi di trasporto'
            ],
            IoT: [
                'Progettazione e programmazione di oggetti connessi con microcontrollori',
                'Integrazione di sensori multipli e trasmissione dati wireless',
                'Sviluppo di interfacce utente per visualizzazione in tempo reale'
            ],
            'Data Analysis': [
                'Raccolta dati multi-sorgente e pulizia dei dataset',
                "Applicazione di strumenti statistici e visualizzazione per l'analisi",
                'Validazione delle ipotesi tramite test statistici e peer review'
            ]
        }
    },
    en: {
        experimentTitleTemplate: '{protocol} Study - {school}',
        experimentDescriptionTemplate:
            'Measurement and analysis within the {protocol} protocol at {school}',
        hypotheses: {
            'Air Quality': [
                'Air quality varies according to time and zones',
                'Meteorological factors influence pollutant concentrations',
                'Human activities directly impact indoor air quality'
            ],
            Sound: [
                'Sound level influences concentration and learning',
                'Noise sources vary according to urban zones',
                'Acoustic insulation significantly reduces disturbances'
            ],
            Light: [
                'Artificial lighting disrupts circadian rhythms',
                'Optimal light intensity improves productivity',
                'Natural light variations affect well-being'
            ],
            Energy: [
                'Energy consumption follows predictable patterns',
                'Renewable energies can cover a significant part of needs',
                'Energy efficiency depends on usage behaviors'
            ],
            Temperature: [
                'Thermal insulation reduces heat loss',
                'Temperature directly influences comfort and concentration',
                'Urban heat islands create microclimates'
            ],
            Biodiversity: [
                'Species diversity reflects urban ecosystem health',
                'Green corridors favor species circulation',
                'Urbanization negatively impacts local biodiversity'
            ],
            AI: [
                'Artificial intelligence can automate complex data analysis',
                'Machine learning algorithms detect hidden patterns',
                'Automatic classification improves analysis efficiency'
            ],
            Mobility: [
                'Traffic regulation reduces environmental impact',
                'Alternative transport modes decrease pollution',
                'Smart signage optimizes traffic flow'
            ],
            IoT: [
                'Connected objects enable real-time data collection',
                'IoT facilitates automatic monitoring of environmental parameters',
                'Smart sensors optimize resource management'
            ],
            'Data Analysis': [
                'Data analysis reveals unexpected correlations',
                'Context is essential for correctly interpreting data',
                'Data visualization facilitates phenomenon understanding'
            ]
        },
        methodologies: {
            'Air Quality': [
                'Placement of air quality sensors in different zones and continuous measurements',
                'Use of CO2 sensors, fine particles and analysis of weather correlations',
                'Real-time monitoring with IoT data transmission'
            ],
            Sound: [
                'Acoustic measurements with calibrated sound meters at different times of day',
                'Sound mapping with geolocation of noise sources',
                'Frequency analysis and correlation with human activities'
            ],
            Light: [
                'Light intensity measurements with lux meters and spectral analysis',
                'Continuous day/night monitoring to study circadian variations',
                'Correlation between artificial lighting and sleep quality'
            ],
            Energy: [
                'Installation of smart meters and consumption analysis',
                'Measurement of renewable energy production and efficiency calculation',
                'Modeling of energy needs and optimization scenarios'
            ],
            Temperature: [
                'Thermal measurements with infrared cameras and precision thermometers',
                'Thermal mapping of buildings to identify heat loss',
                'Comparative analysis before/after insulation or thermal improvement'
            ],
            Biodiversity: [
                'Counting and identification of species by direct observation and photography',
                'Use of citizen science applications for data collection',
                'Biodiversity mapping with geolocated observations'
            ],
            AI: [
                'Development of classification algorithms and training on datasets',
                'Use of computer vision APIs for image analysis',
                'Implementation of neural networks for pattern recognition'
            ],
            Mobility: [
                'Traffic counting with automatic sensors and flow analysis',
                'Impact study of regulation measures on air quality',
                'Optimal route modeling and transport mode analysis'
            ],
            IoT: [
                'Design and programming of connected objects with microcontrollers',
                'Integration of multiple sensors and wireless data transmission',
                'Development of user interfaces for real-time visualization'
            ],
            'Data Analysis': [
                'Multi-source data collection and dataset cleaning',
                'Application of statistical tools and visualization for analysis',
                'Hypothesis validation through statistical tests and peer review'
            ]
        }
    }
}

// Fonction pour générer une expérience cohérente
function generateCoherentExperiment(protocol, country, city, school, studentName, index) {
    const lang = COUNTRIES_DATA[country].language
    const translations = TRANSLATIONS[lang]

    // Génération d'un ID unique
    const timestamp = Date.now() + index // Éviter les doublons
    const randomSuffix = Math.random().toString(36).substr(2, 5)
    const id = `exp_${timestamp}_${randomSuffix}`

    // Génération du titre et de la description
    const title = translations.experimentTitleTemplate
        .replace('{protocol}', protocol.name)
        .replace('{school}', school)

    const description = translations.experimentDescriptionTemplate
        .replace('{protocol}', protocol.name)
        .replace('{school}', school)

    // Sélection d'une hypothèse cohérente avec le protocole
    const categoryHypotheses =
        translations.hypotheses[protocol.category] || translations.hypotheses['Data Analysis']
    const hypothesis = categoryHypotheses[Math.floor(Math.random() * categoryHypotheses.length)]

    // Sélection d'une méthodologie cohérente
    const categoryMethodologies =
        translations.methodologies[protocol.category] || translations.methodologies['Data Analysis']
    const methodology =
        categoryMethodologies[Math.floor(Math.random() * categoryMethodologies.length)]

    // Groupes possibles
    const groups = ['Groupe A', 'Groupe B', 'Groupe C']
    const studentGroup = groups[Math.floor(Math.random() * groups.length)]

    // Statuts possibles
    const statuses = ['planned', 'active', 'completed']
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    return {
        id,
        title,
        description,
        protocol: protocol.name,
        studentName,
        studentGroup,
        school: `${school}, ${city}`,
        startDate: '2025-01-01T00:00:00.000Z',
        isPublic: true,
        status,
        createdAt: '2025-01-01T00:00:00.000Z',
        hypothesis,
        methodology
    }
}

// Fonction principale pour générer toutes les expériences
function generateAllExperiments() {
    const experiments = []
    let index = 0

    // Pour chaque protocole, créer des expériences dans différents pays
    DETAILED_PROTOCOLS.forEach(protocol => {
        // Distribuer les protocoles entre les pays (environ 3-4 expériences par protocole)
        const countryKeys = Object.keys(COUNTRIES_DATA)
        const experimentsPerProtocol = 3

        for (let i = 0; i < experimentsPerProtocol; i++) {
            // Sélection d'un pays aléatoire
            const country = countryKeys[Math.floor(Math.random() * countryKeys.length)]
            const countryData = COUNTRIES_DATA[country]

            // Sélection d'une ville aléatoire
            const city = countryData.cities[Math.floor(Math.random() * countryData.cities.length)]

            // Sélection d'une école aléatoire
            const school = city.schools[Math.floor(Math.random() * city.schools.length)]

            // Sélection d'un nom d'étudiant aléatoire
            const studentName =
                countryData.studentNames[
                    Math.floor(Math.random() * countryData.studentNames.length)
                ]

            const experiment = generateCoherentExperiment(
                protocol,
                country,
                city.name,
                school,
                studentName,
                index
            )
            experiments.push(experiment)
            index++
        }
    })

    return experiments
}

module.exports = {
    generateAllExperiments,
    COUNTRIES_DATA,
    TRANSLATIONS
}
