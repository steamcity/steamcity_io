const Joi = require('joi');

const clusterSchema = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  challenges: Joi.string().required(),
  forStudents: Joi.string().required(),
  inSociety: Joi.string().required(),
  roleOfSchools: Joi.string().required(),
  icon: Joi.string().optional(),
  color: Joi.string().optional(),
  leaders: Joi.array().items(Joi.string()).default([]),
  protocols: Joi.array().items(Joi.string()).default([]),
  researchQuestions: Joi.array().items(Joi.string()).default([]),
  glossary: Joi.array().items(Joi.string()).default([]),
  linkedDisciplines: Joi.string().optional(),
  linkedClusters: Joi.array().items(Joi.string()).default([]),
  url: Joi.string().uri().optional()
});

const protocolSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  primaryCluster: Joi.number().integer().required(),
  secondaryClusters: Joi.array().items(Joi.number().integer()).default([]),
  url: Joi.string().uri().required(),
  type: Joi.string().default('experimental'),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
  duration: Joi.string().optional(),
  materials: Joi.array().items(Joi.string()).default([]),
  keywords: Joi.array().items(Joi.string()).default([])
});

module.exports = {
  clusterSchema,
  protocolSchema
};