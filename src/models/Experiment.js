const Joi = require('joi')

const experimentSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    protocol: Joi.string().optional(), // SteamCity protocol
    studentName: Joi.string().required(),
    studentGroup: Joi.string().optional(),
    school: Joi.string().optional(),
    startDate: Joi.date()
        .iso()
        .default(() => new Date()),
    endDate: Joi.date().iso().optional(),
    expectedSensors: Joi.array().items(Joi.string()).optional(),
    hypothesis: Joi.string().optional(),
    methodology: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    isPublic: Joi.boolean().default(true),
    status: Joi.string().valid('planned', 'active', 'completed', 'cancelled').default('planned')
})

class Experiment {
    constructor(data) {
        const { error, value } = experimentSchema.validate(data)
        if (error) {
            throw new Error(`Invalid experiment data: ${error.details[0].message}`)
        }
        Object.assign(this, value)
        this.id = this.generateId()
        this.createdAt = new Date()
    }

    generateId() {
        return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    static validate(data) {
        return experimentSchema.validate(data)
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            protocol: this.protocol,
            studentName: this.studentName,
            studentGroup: this.studentGroup,
            school: this.school,
            startDate: this.startDate,
            endDate: this.endDate,
            expectedSensors: this.expectedSensors,
            hypothesis: this.hypothesis,
            methodology: this.methodology,
            tags: this.tags,
            isPublic: this.isPublic,
            status: this.status,
            createdAt: this.createdAt
        }
    }
}

module.exports = Experiment
