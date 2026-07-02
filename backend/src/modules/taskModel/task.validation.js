import joi from 'joi';
import { categories } from '../../config/CONSTANTS.js';

export const createTaskSchema = {
    body: joi.object({
        title: joi.string().min(3).required(),
        description: joi.string().allow('').optional(),
        dueDate: joi.date().iso().required(),
        priority: joi.string().valid('low', 'medium', 'high').optional(),
        status: joi.string().valid('pending', 'in-progress', 'completed').optional(),
        category: joi.string().valid(...Object.values(categories)).optional(),
        projectId: joi.string().hex().length(24).optional()
    })
};

export const updateTaskSchema = {
    params: joi.object({
        taskId: joi.string().hex().length(24).required()
    }),
    body: joi.object({
        title: joi.string().min(3).optional(),
        description: joi.string().allow('').optional(),
        dueDate: joi.date().iso().optional(),
        priority: joi.string().valid('low', 'medium', 'high').optional(),
        status: joi.string().valid('pending', 'in-progress', 'completed').optional(),
        category: joi.string().valid(...Object.values(categories)).optional(),
        projectId: joi.string().hex().length(24).optional()
    })
};

export const taskIdParamSchema = {
    params: joi.object({
        taskId: joi.string().hex().length(24).required()
    })
};

export const createSubtaskSchema = {
    body: joi.object({
        title: joi.string().min(2).required()
    })
};

export const subtaskIdParamSchema = {
    params: joi.object({
        subtaskId: joi.string().hex().length(24).required()
    })
};

export const analyzeTaskSchema = {
    body: joi.object({
        title: joi.string().min(3).required(),
        description: joi.string().allow('').optional(),
        subtaskCount: joi.number().min(0).optional(),
        dueDate: joi.date().iso().optional()
    })
};

export const suggestSubtasksSchema = {
    body: joi.object({
        title: joi.string().min(3).required(),
        description: joi.string().allow('').optional()
    })
};

export const suggestDescriptionSchema = {
    body: joi.object({
        title: joi.string().min(3).required(),
        type: joi.string().valid('task', 'project').optional().default('task')
    })
};
