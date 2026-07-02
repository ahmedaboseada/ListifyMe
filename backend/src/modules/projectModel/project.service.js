import projectModel from '../../models/project.model.js';
import taskModel from '../../models/task.model.js';
import subtaskModel from '../../models/subtask.model.js';
import { categories } from '../../config/CONSTANTS.js';

// =======================
// PROJECT SERVICES
// =======================

export const createProject = async (req, res) => {
    try {
        const { name, description, category } = req.body;
        const userId = req.user.id;

        const project = await projectModel.create({
            name,
            description,
            category: category || categories.general,
            createdBy: userId
        });

        return res.status(201).json({ message: 'Project created successfully', project });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getProjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const { category, search } = req.query;

        const filter = { createdBy: userId };
        if (category) filter.category = category;
        if (search) filter.name = { $regex: search, $options: 'i' };

        const projects = await projectModel.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({ projects });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getProjectById = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        const project = await projectModel.findOne({ _id: projectId, createdBy: userId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        return res.status(200).json({ project });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const updates = { ...req.body };

        const project = await projectModel.findOne({ _id: projectId, createdBy: userId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        Object.assign(project, updates);
        await project.save();

        return res.status(200).json({ message: 'Project updated successfully', project });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        const project = await projectModel.findOne({ _id: projectId, createdBy: userId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Find all tasks related to this project
        const tasks = await taskModel.find({ projectId, createdBy: userId });
        const taskIds = tasks.map(t => t._id);

        // Delete all subtasks for these tasks
        if (taskIds.length > 0) {
            await subtaskModel.deleteMany({ taskId: { $in: taskIds } });
        }

        // Delete all tasks in this project
        await taskModel.deleteMany({ projectId, createdBy: userId });

        // Delete the project
        await projectModel.findByIdAndDelete(projectId);

        return res.status(200).json({ message: 'Project and all associated tasks deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
