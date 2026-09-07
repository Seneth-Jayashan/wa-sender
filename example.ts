import { WhatsappClient } from './src/index.js';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import qrcode from 'qrcode-terminal';

// Load the atlas-credentials.env file
dotenv.config({ path: path.resolve(process.cwd(), 'atlas-credentials.env') });

const RECIPIENT_NUMBER = "94720299182"; // Replace with your WhatsApp number

const main = async () => {
    console.log('Connecting to MongoDB...');
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
        console.error('MONGODB_URI is not set in atlas-credentials.env');
        process.exit(1);
    }

    // Replace the username template in the URI
    const username = process.env.MONGODB_USERNAME;
    const finalUri = uri.replace('<db_username>', username || '');

    const mongoClient = new MongoClient(finalUri);
    await mongoClient.connect();
    console.log('MongoDB connected successfully.');

    // We will use a database named "wa-sender" and collection "auth_info"
    const db = mongoClient.db('wa-sender');
    const authCollection = db.collection('auth_info');

    console.log('Initializing WhatsApp client...');
    const client = new WhatsappClient({
        mongoCollection: authCollection,
        logLevel: 'info'
    });

    client.on('qr', (qr) => {
        console.log('QR Code received. Please scan!');
        qrcode.generate(qr, { small: true });
    });

    client.on('connected', async () => {
        console.log('Client connected! Sending messages...');

        try {
            // Check if the number is on WhatsApp
            const exists = await client.checkNumberExists(RECIPIENT_NUMBER);
            if (exists && exists.exists) {
                console.log(`${RECIPIENT_NUMBER} is on WhatsApp! Proceeding to send messages.`);
                
                // Send a text message
                await client.sendMessage(RECIPIENT_NUMBER, 'Hello from the modern wa-sender!');
                
                // Send a template message
                await client.sendTemplateMessage(RECIPIENT_NUMBER, 'welcome', {
                    name: 'John Doe',
                    company: 'OneX Universe',
                });
            } else {
                console.log(`${RECIPIENT_NUMBER} is NOT on WhatsApp.`);
            }

        } catch (error) {
            console.error('Error sending messages:', error);
        }

        console.log('All operations finished. Disconnecting in 5 seconds...');
        setTimeout(async () => {
            console.log('Disconnecting WhatsApp client...');
            await client.disconnect();
            
            // Add a small delay to ensure any pending auth state saves to MongoDB complete
            setTimeout(async () => {
                console.log('Closing MongoDB connection...');
                await mongoClient.close();
                process.exit(0);
            }, 2000);
        }, 5000);
    });

    client.on('disconnected', (reason) => {
        console.log('Client disconnected:', reason);
    });

    client.on('auth_failure', (err) => {
        console.error('Authentication failed:', err);
    });

    // Start initialization
    await client.initialize();
};

main();
