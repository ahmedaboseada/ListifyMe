import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/DB.js';
import userModel from '../models/user.model.js';
import bcrypt from 'bcrypt';

const seed = async () => {
    try {
        await connectDB();

        const email = 'ahmedabuseada22@gmail.com';
        const password = '116574Mm@@';
        const saltRounds = parseInt(process.env.SALT_ROUNDS, 10) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        let user = await userModel.findOne({ email });

        if (user) {
            console.log('👤 Super admin already exists. Updating credentials and type...');
            user.password = hashedPassword;
            user.type = 'admin';
            user.confirmed = true;
            user.adminPermissions = ['manageUsers', 'manageTasks', 'manageRewards', 'manageLeaderboard', 'manageSystem'];
            await user.save();
        } else {
            console.log('👤 Super admin does not exist. Creating new account...');
            user = await userModel.create({
                firstName: 'Ahmed',
                lastName: 'Abouseada',
                email,
                password: hashedPassword,
                type: 'admin',
                confirmed: true,
                adminPermissions: ['manageUsers', 'manageTasks', 'manageRewards', 'manageLeaderboard', 'manageSystem']
            });
        }

        console.log(`✅ Super admin successfully seeded: ${user.email}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
};

seed();
