import { Router } from 'express';
import { validation } from '../../middlewares/validation.js';
import { verifyToken } from '../../middlewares/authentication.js';
import { restrictTo } from '../../middlewares/restrictTo.js';
import { checkProjectLimit } from '../../middlewares/checkTierLimits.js';

import * as PVS from './project.validation.js';
import * as PS from './project.service.js';

const projectRouter = Router();

// Protect all project routes
projectRouter.use(verifyToken);
projectRouter.use(restrictTo(['user', 'admin']));

// Project CRUD routes
projectRouter.post('/', validation(PVS.createProjectSchema), checkProjectLimit, PS.createProject);
projectRouter.get('/', PS.getProjects);
projectRouter.get('/:projectId', validation(PVS.projectIdParamSchema), PS.getProjectById);
projectRouter.patch('/:projectId', validation(PVS.updateProjectSchema), PS.updateProject);
projectRouter.delete('/:projectId', validation(PVS.projectIdParamSchema), PS.deleteProject);

export default projectRouter;
