import { Router } from 'express';
import { validation } from '../../middlewares/validation.js';
import { verifyToken } from '../../middlewares/authentication.js';
import { restrictTo } from '../../middlewares/restrictTo.js';
import { requirePermission } from '../../middlewares/permission.js';

import * as RVS from './reward.validation.js';
import * as RS from './reward.service.js';

const rewardRouter = Router();

// Protect all reward routes
rewardRouter.use(verifyToken);

// Create, Edit, Delete rewards (Admin only with permission)
rewardRouter.post('/', restrictTo(['admin']), requirePermission('manageRewards'), validation(RVS.createRewardSchema), RS.createReward);
rewardRouter.patch('/:rewardId', restrictTo(['admin']), requirePermission('manageRewards'), RS.updateReward);
rewardRouter.delete('/:rewardId', restrictTo(['admin']), requirePermission('manageRewards'), RS.deleteReward);

// View and buy rewards (Users and Admins)
rewardRouter.get('/', restrictTo(['user', 'admin']), RS.getRewards);
rewardRouter.post('/purchase', restrictTo(['user', 'admin']), validation(RVS.purchaseRewardSchema), RS.purchaseReward);
rewardRouter.get('/my-rewards', restrictTo(['user', 'admin']), RS.getMyRewards);

export default rewardRouter;
