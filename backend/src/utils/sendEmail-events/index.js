import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendEmail } from '../sendEmail.js';
import * as VT from '../token/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.join(__dirname, '..', 'templates', 'emailTemplate.html');

const loadTemplate = () => fs.readFileSync(templatePath, 'utf8');

const render = ({ name, content, link }) => {
    const tpl = loadTemplate();

    const linkBlock = link
        ? `<a href="${link}" target="_blank" rel="noreferrer" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Action</a>`
        : '';

    return tpl
        .replaceAll('{{NAME}}', name || 'User')
        .replaceAll('{{CONTENT}}', content || '')
        .replaceAll('{{LINK_BLOCK}}', linkBlock);
};

export const sendEmailEvent = async ({ email, name, tokenId }) => {
    try {
        const token = VT.generateConfirmEmailToken(email, process.env.JWT_EXPIRES_IN || '1d', tokenId);
        const base = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
        const link = `${base}/users/confirmEmail/${token}`;

        const html = render({
            name,
            content: 'Confirm your email address for ListifyMe by clicking the button below.',
            link,
        });

        await sendEmail({
            to: email,
            subject: 'Confirm your email - ListifyMe',
            html,
            text: `Confirm your email: ${link}`,
        });

        console.log("✅ confirm email sent:", email);
    } catch (err) {
        console.error("❌ sendEmail event failed:", err?.message);
    }
};

export const sendOTPEvent = async ({ email, otp, name }) => {
    try {
        const html = render({
            name,
            content: `Your ListifyMe OTP code is: ${otp}`,
            link: null,
        });

        await sendEmail({
            to: email,
            subject: 'Your OTP code - ListifyMe',
            html,
            text: `OTP: ${otp}`,
        });

        console.log("✅ OTP sent:", email);
    } catch (err) {
        console.error("❌ sendOTP event failed:", err?.message);
    }
};

export const sendEmailChangeConfirmEvent = async ({ email, name, userId, oldEmail, newEmail, tokenId }) => {
    try {
        const token = VT.generateEmailChangeToken({ userId, oldEmail, newEmail }, '1h', tokenId);
        const base = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
        const link = `${base}/users/confirmEmailChange/${token}`;

        const html = render({
            name,
            content: `Confirm changing your ListifyMe email to: ${newEmail}`,
            link,
        });

        await sendEmail({
            to: email,
            subject: 'Confirm email change - ListifyMe',
            html,
            text: `Confirm email change: ${link}`,
        });

        console.log("✅ email change confirm sent:", email);
    } catch (err) {
        console.error("❌ sendEmailChangeConfirm event failed:", err?.message);
    }
};
