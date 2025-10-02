const Storage = require('../utils/storage')

const getExperiments = async (req, res) => {
    try {
        const data = await Storage.loadExperiments()
        res.json({
            success: true,
            count: data.length,
            data: data
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve experiments'
        })
    }
}

const addExperiment = async (req, res) => {
    try {
        const experiment = req.body
        const currentData = await Storage.loadExperiments()
        currentData.push({ id: Date.now(), ...experiment })
        await Storage.saveExperiments(currentData)

        res.status(201).json({
            success: true,
            message: 'Experiment added successfully'
        })
    } catch (error) {
        res.status(400).json({
            success: false,
            error: 'Failed to add experiment'
        })
    }
}

module.exports = {
    getExperiments,
    addExperiment
}
