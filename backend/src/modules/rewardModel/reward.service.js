import rewardModel from '../../models/reward.model.js';
import userRewardModel from '../../models/user-reward.model.js';
import userModel from '../../models/user.model.js';

// =======================
// REWARD SERVICES
// =======================

export const createReward = async (req, res) => {
    try {
        const { title, description, cost, type, value } = req.body;

        const reward = await rewardModel.create({
            title,
            description,
            cost,
            type,
            value
        });

        return res.status(201).json({ message: 'Reward created successfully', reward });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getRewards = async (req, res) => {
    try {
        const rewards = await rewardModel.find().sort({ cost: 1 });
        return res.status(200).json({ rewards });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const purchaseReward = async (req, res) => {
    try {
        const { rewardId } = req.body;
        const userId = req.user.id;

        // Fetch reward
        const reward = await rewardModel.findById(rewardId);
        if (!reward) return res.status(404).json({ message: 'Reward not found' });

        // Check if already purchased
        const alreadyPurchased = await userRewardModel.findOne({ userId, rewardId });
        if (alreadyPurchased) {
            return res.status(400).json({ message: 'You have already purchased this reward' });
        }

        // Fetch user to check coins balance
        const user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.coins < reward.cost) {
            return res.status(400).json({
                message: `Insufficient coins balance. You need ${reward.cost} coins but only have ${user.coins} coins.`
            });
        }

        // Deduct coins and log purchase
        user.coins -= reward.cost;
        await user.save();

        const purchase = await userRewardModel.create({
            userId,
            rewardId
        });

        return res.status(200).json({
            message: 'Reward purchased successfully',
            purchase,
            remainingCoins: user.coins
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getMyRewards = async (req, res) => {
    try {
        const userId = req.user.id;

        const purchases = await userRewardModel.find({ userId })
            .populate('rewardId')
            .sort({ createdAt: -1 });

        // Map to return just the populated rewards
        const rewards = purchases.map(p => p.rewardId).filter(r => !!r);

        return res.status(200).json({ rewards });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateReward = async (req, res) => {
    try {
        const { rewardId } = req.params;
        const updates = { ...req.body };

        const reward = await rewardModel.findByIdAndUpdate(rewardId, updates, { new: true });
        if (!reward) return res.status(404).json({ message: 'Reward not found' });

        return res.status(200).json({ message: 'Reward updated successfully', reward });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteReward = async (req, res) => {
    try {
        const { rewardId } = req.params;
        const reward = await rewardModel.findByIdAndDelete(rewardId);
        if (!reward) return res.status(404).json({ message: 'Reward not found' });

        return res.status(200).json({ message: 'Reward deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
