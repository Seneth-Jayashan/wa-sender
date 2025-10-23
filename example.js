// example.js
import { WhatsappClient } from './index.js';
import { templates } from './src/templates.js';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function testTemplates() {
    // Replace with your WhatsApp number (recipient) in international format without '+'
    const recipient = '94717654321'; // Example: 91 = country code for India

    const client = new WhatsappClient({ authStatePath: 'baileys_auth_info' });

    console.log('Initializing WhatsApp client...');
    await client.initialize();

    console.log('Client initialized. Sending template messages...');

    // Sample data for testing templates
    const sampleData = {
        name: 'John Doe',
        company: 'OneX Universe',
        code: '123456',
        username: 'johndoe',
        orderId: 'ORD123',
        status: 'Shipped',
        carrier: 'FedEx',
        trackingNumber: 'TRACK123',
        invoiceId: 'INV001',
        amount: '500',
        dueDate: '2025-10-31',
        planName: 'Pro Plan',
        renewalDate: '2025-11-01',
        serviceName: 'Consultation',
        dateTime: 'Oct 25, 2025 at 3:00 PM',
        location: 'OneX Universe Office',
        eventName: 'Annual Meetup',
        venue: 'Convention Center',
        date: 'Oct 30, 2025',
        time: '6:00 PM',
        withPerson: 'Alice',
        meetingLink: 'https://meet.example.com/123',
        otp: '654321',
        offerTitle: 'Diwali Discount',
        promoCode: 'DIWALI50',
        discount: '50%',
        expiryDate: '2025-10-31',
        greetingTitle: 'Happy Diwali',
        message: 'a joyful and prosperous festival',
        alertMessage: 'Server CPU usage high!',
        timestamp: new Date().toLocaleString(),
        email: 'john@example.com',
        message: 'New policy update'
    };

    // Iterate through all templates
    for (const [name, fn] of Object.entries(templates)) {
        const text = fn(sampleData);
        try {
            await client.sendMessage(recipient, { text });
            console.log(`Sent template: ${name}`);
        } catch (err) {
            console.error(`Error sending template ${name}:`, err);
        }

        // Wait 15 seconds before sending next message
        await sleep(15000);
    }

    console.log('All templates sent. Disconnecting...');
    await client.disconnect();
    console.log('Client disconnected.');
}

testTemplates().catch(console.error);
