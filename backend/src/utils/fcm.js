import { messaging } from '../config/firebase.js';

export const sendPushNotification = async (token, title, body, data = {}) => {
    if (!token) {
        console.warn('⚠️ sendPushNotification: No token provided');
        return;
    }

    if (!messaging) {
        console.log(`[FCM Mock Log] To: ${token} | Title: "${title}" | Body: "${body}" | Data:`, data);
        return;
    }

    try {
        const message = {
            token,
            notification: {
                title,
                body,
            },
            data,
        };

        const response = await messaging.send(message);
        console.log('✅ FCM notification sent successfully:', response);
        return response;
    } catch (err) {
        console.error('❌ FCM notification failed to send:', err.message);
    }
};

export const sendPushNotificationToMultiple = async (tokens, title, body, data = {}) => {
    if (!tokens || tokens.length === 0) return;
    
    // Remove empty/null tokens
    const validTokens = tokens.filter(t => !!t);
    if (validTokens.length === 0) return;

    if (!messaging) {
        console.log(`[FCM Mock Log Multicast] To: ${validTokens.length} devices | Title: "${title}" | Body: "${body}" | Data:`, data);
        return;
    }

    try {
        const message = {
            tokens: validTokens,
            notification: {
                title,
                body,
            },
            data,
        };

        const response = await messaging.sendEachForMulticast(message);
        console.log(`✅ FCM multicast sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);
        return response;
    } catch (err) {
        console.error('❌ FCM multicast failed:', err.message);
    }
};
