const Joi = require('joi')

const sensorDataSchema = Joi.object({
    experimentId: Joi.string().required(),
    studentName: Joi.string().required(),
    sensorType: Joi.string().required(),
    value: Joi.number().required(),
    unit: Joi.string().allow(''),
    timestamp: Joi.date().default(Date.now),
    location: Joi.object({
        latitude: Joi.number(),
        longitude: Joi.number()
    }).optional(),
    notes: Joi.string().allow('')
})

class SensorData {
    constructor(data) {
        const { error, value } = sensorDataSchema.validate(data)
        if (error) throw error
        Object.assign(this, value)
    }

    static validate(data) {
        return sensorDataSchema.validate(data)
    }
}

module.exports = SensorData
