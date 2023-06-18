// Liste officielle des 25 protocoles SteamCity avec informations détaillées

const STEAMCITY_PROTOCOLS = [
  {
    name: 'City Detective Challenge',
    category: 'Data Analysis',
    canvaLink: 'https://www.canva.com/design/DAGdmH07EgI/_esz0ESK7kdH_1vwHKrqqw/edit',
    description: 'Un défi de détective urbain pour analyser les données de la ville',
    sensors: ['observation', 'data collection', 'analysis']
  },
  {
    name: 'Data vs. Context: The Citizen Challenge',
    category: 'Data Analysis',
    canvaLink: 'https://www.canva.com/design/DAGSmOHgZXw/GcWQx5-Gkg-kQb32_67Oow/edit?utm_content=DAGSmOHgZXw&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    description: 'Comprendre l\'importance du contexte dans l\'analyse des données citoyennes',
    sensors: ['data analysis', 'context evaluation']
  },
  {
    name: 'FactBusters',
    category: 'Data Analysis',
    canvaLink: 'https://www.canva.com/design/DAGjkh6oCXw/NlRNeGbNM2WmAVRV-bC89g/edit',
    description: 'Démystifier les faits urbains par l\'analyse de données',
    sensors: ['fact checking', 'data verification']
  },
  {
    name: 'Whisper Walls: Investigating the Sound of Silence',
    category: 'Sound',
    canvaLink: 'https://www.canva.com/design/DAGdZsvEW1s/NpwRNS0yn09A2XtURJDS0A/edit',
    description: 'Enquête sur les zones silencieuses et les murs qui murmurent',
    sensors: ['sound', 'decibel', 'noise mapping']
  },
  {
    name: 'CO2 sensors for indoor air quality',
    category: 'Air Quality',
    canvaLink: 'https://www.canva.com/design/DAGcvZGPukw/o1Zsc654bX5OdG5LBaSYzQ/edit',
    description: 'Surveillance de la qualité de l\'air intérieur avec des capteurs CO2',
    sensors: ['co2', 'air quality', 'indoor environment']
  },
  {
    name: 'Mapping of pollinators through counting',
    category: 'Biodiversity',
    canvaLink: 'https://www.canva.com/design/DAGZA5ZmLLQ/CjBWU8B30jHkLezRgactaQ/edit?utm_content=DAGZA5ZmLLQ&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    description: 'Cartographie des pollinisateurs par comptage et observation',
    sensors: ['observation', 'counting', 'biodiversity tracking']
  },
  {
    name: 'Light vs. Zzz - The Great Sleep Battle',
    category: 'Light',
    canvaLink: 'https://www.canva.com/design/DAGdllv_UyU/DkcM9FS_mkeTz5dOc9Vzig/edit',
    description: 'Impact de la lumière sur le sommeil et le bien-être',
    sensors: ['light', 'lux', 'circadian rhythm']
  },
  {
    name: 'Decibel Detectives - Correlation between noise and learning abilities',
    category: 'Sound',
    canvaLink: 'https://www.canva.com/design/DAGdk3uXhXY/_Y825rRAAKI0DW16WvkFXg/edit',
    description: 'Corrélation entre le bruit et les capacités d\'apprentissage',
    sensors: ['sound', 'decibel', 'noise measurement']
  },
  {
    name: 'SoundSquad - Sensitive mapping of noises across the city',
    category: 'Sound',
    canvaLink: 'https://www.canva.com/design/DAGdku7pmhs/Q4j4qcJ27cuf8Cx_3RX0eQ/edit',
    description: 'Cartographie sensible des nuisances sonores à travers la ville',
    sensors: ['sound', 'decibel', 'urban noise mapping']
  },
  {
    name: 'Outdoor air quality monitoring, particles and impact of weather',
    category: 'Air Quality',
    canvaLink: 'https://www.canva.com/design/DAGi7xpSosQ/imj6MiGBmPIdUmLLg_bHtQ/edit',
    description: 'Surveillance de la qualité de l\'air extérieur, particules et impact météo',
    sensors: ['air quality', 'particles', 'weather', 'pm2.5', 'pm10']
  },
  {
    name: 'Smart Objects Safari - Involve learners in the design of smart objects',
    category: 'IoT',
    canvaLink: 'https://www.canva.com/design/DAGjZrRp20s/Z1akvzUH2l1P20am43XQzQ/edit',
    description: 'Safari des objets intelligents - impliquer les apprenants dans la conception',
    sensors: ['iot', 'smart objects', 'design']
  },
  {
    name: 'Ecological impact of the regulation of mobility',
    category: 'Mobility',
    canvaLink: 'https://www.canva.com/design/DAGjqM7bLg4/lRJFIY3LJDqAa7wHzjiQHA/edit?utm_content=DAGjqM7bLg4&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    description: 'Impact écologique de la régulation de la mobilité urbaine',
    sensors: ['mobility', 'traffic', 'environmental impact']
  },
  {
    name: 'Road signs of tomorrow',
    category: 'Mobility',
    canvaLink: 'https://www.canva.com/design/DAGjdzTbWRQ/KR2oxCL-XAL1RIuBXZzZ8w/edit',
    description: 'Les panneaux de signalisation de demain',
    sensors: ['traffic monitoring', 'smart signage']
  },
  {
    name: 'Energy and Everyday Life - Negawatt Scenario',
    category: 'Energy',
    canvaLink: 'https://www.canva.com/design/DAGqH4l-SMM/xhy8JfyDOOS3JGlQVZe51g/edit?utm_content=DAGqH4l-SMM&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    description: 'L\'énergie dans la vie quotidienne - Scénario négawatt',
    sensors: ['energy consumption', 'power monitoring']
  },
  {
    name: 'Experimenting with Energy Mix',
    category: 'Energy',
    canvaLink: 'https://www.canva.com/design/DAGqICo4tos/aST3WanbU2f3JzaYjEmZhA/edit?utm_content=DAGqICo4tos&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    description: 'Expérimentation avec le mix énergétique',
    sensors: ['energy mix', 'renewable energy', 'power generation']
  },
  {
    name: 'Shine Smart, Shine Bright - Understanding Urban Lighting',
    category: 'Light',
    canvaLink: 'https://www.canva.com/design/DAGdevglYbA/OFiiUoL1fD8uchCxTjuksA/edit',
    description: 'Comprendre l\'éclairage urbain intelligent',
    sensors: ['light', 'lux', 'urban lighting']
  },
  {
    name: 'Energy in perspective - Understanding energy',
    category: 'Energy',
    canvaLink: 'https://www.canva.com/design/DAGqC3SqBko/2iXJ67YojmE0bJfo63b3Hw/edit?utm_content=DAGqC3SqBko&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    description: 'L\'énergie en perspective - Comprendre l\'énergie',
    sensors: ['energy measurement', 'energy analysis']
  },
  {
    name: 'From Warm Walls to Cool Cities: Investigating Insulation and Urban Heat Loss',
    category: 'Temperature',
    canvaLink: 'https://www.canva.com/design/DAGc6c3IBJo/CRo0emIvUxfXeDx3a7fD7g/edit',
    description: 'Des murs chauds aux villes fraîches: isolation et perte de chaleur urbaine',
    sensors: ['temperature', 'thermal', 'insulation', 'heat loss']
  },
  {
    name: 'Discover bio-inspired learning processes',
    category: 'AI',
    canvaLink: 'https://www.canva.com/design/DAGqnuoqfZU/RtpBeOluOflVvcGbBbSmOw/edit?utm_content=DAGqnuoqfZU&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    description: 'Découvrir les processus d\'apprentissage bio-inspirés',
    sensors: ['bio-sensors', 'learning algorithms']
  },
  {
    name: 'Bot Buddy Adventure - Designing a Chatbot for Urban Fun',
    category: 'AI',
    canvaLink: 'https://www.canva.com/design/DAGp8SqDiIg/geWXPvHYhFHNqSksy4FUrQ/edit?utm_content=DAGp8SqDiIg&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    description: 'Aventure Bot Buddy - Concevoir un chatbot pour le plaisir urbain',
    sensors: ['interaction', 'user experience', 'ai interface']
  },
  {
    name: 'AI Odyssey - Datawalk in the city',
    category: 'AI',
    canvaLink: 'https://www.canva.com/design/DAGjfsnGjv0/jbBGpG2xe92GmXUBd05AKg/edit',
    description: 'Odyssée IA - Promenade de données dans la ville',
    sensors: ['data collection', 'ai analysis', 'urban data']
  },
  {
    name: 'Optimised waste sorting thanks to AI image classification',
    category: 'AI',
    canvaLink: 'https://www.canva.com/design/DAGjCASl0-Y/mJFLNpjhrC2kmnieBdhbEg/edit',
    description: 'Tri optimisé des déchets grâce à la classification d\'images IA',
    sensors: ['image classification', 'waste monitoring', 'ai vision']
  },
  {
    name: 'Birdsong AI Explorer',
    category: 'AI',
    canvaLink: 'https://www.canva.com/design/DAGp8V6n3fw/ZVMNd_8mGEH_pbKOlQFyiA/edit?utm_content=DAGp8V6n3fw&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    description: 'Explorateur IA du chant des oiseaux',
    sensors: ['sound', 'audio classification', 'biodiversity']
  },
  {
    name: 'Plants and the city',
    category: 'Biodiversity',
    canvaLink: 'https://www.canva.com/design/DAGbhmHBssI/wby70n35vQA8O6zMbW3oTg/edit?utm_content=DAGbhmHBssI&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    description: 'Les plantes et la ville - biodiversité urbaine',
    sensors: ['biodiversity', 'plant monitoring', 'urban ecology']
  },
  {
    name: 'Trees VS Cars - Use decision trees to identify polluting vehicles',
    category: 'AI',
    canvaLink: 'https://www.canva.com/design/DAGjTQYMars/Q0T3lbXj9ToXbmXBWAGwcg/edit',
    description: 'Arbres VS Voitures - Utiliser les arbres de décision pour identifier les véhicules polluants',
    sensors: ['vehicle detection', 'pollution monitoring', 'decision trees']
  }
];

// Export des noms pour la compatibilité avec l'API existante
const PROTOCOL_NAMES = STEAMCITY_PROTOCOLS.map(protocol => protocol.name);

module.exports = PROTOCOL_NAMES;
module.exports.DETAILED_PROTOCOLS = STEAMCITY_PROTOCOLS;