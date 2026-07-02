import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

let firebaseApp = null;
let messaging = null;

const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    try {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        messaging = admin.messaging(firebaseApp);
        console.log('🔥 Firebase Admin SDK initialized successfully');
    } catch (err) {
        console.error('❌ Failed to initialize Firebase Admin SDK:', err.message);
    }
} else {
    console.warn('⚠️ Firebase credentials not fully configured in environment. Push notifications will be logged to console.');
}

export { firebaseApp, messaging };
