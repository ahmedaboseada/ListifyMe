import joi from 'joi';
import { categories } from '../../config/CONSTANTS.js';

export const createProjectSchema = {
    body: joi.object({
        name: joi.string().min(3).required(),
        description: joi.string().allow('').optional(),
        category: joi.string().valid(...Object.values(categories)).optional()
    })
};

export const updateProjectSchema = {
    params: joi.object({
        projectId: joi.string().hex().length(24).required()
    }),
    body: joi.object({
        name: joi.string().min(3).optional(),
        description: joi.string().allow('').optional(),
        category: joi.string().valid(...Object.values(categories)).optional()
    })
};

export const projectIdParamSchema = {
    params: joi.object({
        projectId: joi.string().hex().length(24).required()
    })
};
