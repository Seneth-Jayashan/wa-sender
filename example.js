// example.js
import { WhatsappClient } from './index.js';

// --- CONFIGURATION ---
// !! Change this to the recipient's phone number
const RECIPIENT_NUMBER = "94771234567"; 
// ---------------------

const main = async () => {
  console.log('Initializing WhatsApp client...');
  

  const client = new WhatsappClient();

  try {
    await client.initialize();

    console.log('Client is connected!');

    console.log(`Sending 'welcome' message to ${RECIPIENT_NUMBER}...`);
    await client.sendTemplateMessage(RECIPIENT_NUMBER, 'welcome', {
      name: 'John Doe',
      company: 'S JAY Web Solutions', 
    });
    console.log('Welcome message sent!');

    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`Sending 'verificationCode' to ${RECIPIENT_NUMBER}...`);
    await client.sendTemplateMessage(RECIPIENT_NUMBER, 'verificationCode', {
      code: '812399',
    });
    console.log('Verification code sent!');

    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`Sending 'shippingUpdate' to ${RECIPIENT_NUMBER}...`);
    await client.sendTemplateMessage(RECIPIENT_NUMBER, 'shippingUpdate', {
      orderId: 'OXU-10293',
      carrier: 'FedEx',
      trackingNumber: '9876543210'
    });
    console.log('Shipping update sent!');


    console.log('All messages sent. Disconnecting...');
    await client.disconnect();

  } catch (error) {
    console.error('An error occurred:', error);
  }
};

main();