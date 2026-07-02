import { Router } from 'express';
import { validation } from '../../middlewares/validation.js';
import { verifyToken } from '../../middlewares/authentication.js';
import { restrictTo } from '../../middlewares/restrictTo.js';

import * as TVS from './task.validation.js';
import * as TS from './task.service.js';

const taskRouter = Router();

// Wire authentication middleware for all task routes
taskRouter.use(verifyToken);
taskRouter.use(restrictTo(['user', 'admin']));

// Leaderboard route
taskRouter.get('/leaderboard', TS.getLeaderboard);

// Subscription Upgrade route
taskRouter.post('/upgrade', TS.upgradeSubscription);

// Task CRUD
taskRouter.post('/', validation(TVS.createTaskSchema), TS.createTask);
taskRouter.get('/', TS.getTasks);
taskRouter.get('/:taskId', validation(TVS.taskIdParamSchema), TS.getTaskById);
taskRouter.patch('/:taskId', validation(TVS.updateTaskSchema), TS.updateTask);
taskRouter.delete('/:taskId', validation(TVS.taskIdParamSchema), TS.deleteTask);

// Subtask CRUD
taskRouter.post('/:taskId/subtask', validation(TVS.taskIdParamSchema), validation(TVS.createSubtaskSchema), TS.createSubtask);
taskRouter.patch('/subtask/:subtaskId', validation(TVS.subtaskIdParamSchema), TS.updateSubtaskStatus);
taskRouter.delete('/subtask/:subtaskId', validation(TVS.subtaskIdParamSchema), TS.deleteSubtask);

export default taskRouter;
