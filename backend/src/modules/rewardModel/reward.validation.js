import joi from 'joi';

export const createRewardSchema = {
    body: joi.object({
        title: joi.string().required(),
        description: joi.string().allow('').optional(),
        cost: joi.number().min(0).required(),
        type: joi.string().valid('theme', 'avatarFrame', 'iconPack').required(),
        value: joi.string().required()
    })
};

export const purchaseRewardSchema = {
    body: joi.object({
        rewardId: joi.string().hex().length(24).required()
    })
};
