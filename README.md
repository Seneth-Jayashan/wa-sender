# 📦 @onexnpm/wa-sender

> A simple and elegant WhatsApp message sender built on top of **Baileys**.  
> Includes predefined message templates and easy-to-use methods for sending messages programmatically.

---

## 🚀 Features

✅ Easy WhatsApp connection via QR code  
✅ Predefined templates for common message types (welcome, verification, shipping, etc.)  
✅ Promise-based API for clean async usage  
✅ Built with TypeScript-friendly JSDoc types  
✅ Simple logging using **pino**  
✅ Modular and extensible structure

---

## 📦 Installation

```bash
npm install @onexnpm/wa-sender
# or
yarn add @onexnpm/wa-sender
```

---

## 🧠 Usage Example

Create a file `example.js`:

```js
import { WhatsappClient } from '@onexnpm/wa-sender';

const RECIPIENT_NUMBER = "94771234567"; // Replace with your WhatsApp number

const main = async () => {
  console.log('Initializing WhatsApp client...');
  const client = new WhatsappClient();

  await client.initialize();

  console.log('Client connected! Sending messages...');

  await client.sendTemplateMessage(RECIPIENT_NUMBER, 'welcome', {
    name: 'John Doe',
    company: 'OneX Universe',
  });

  await client.sendTemplateMessage(RECIPIENT_NUMBER, 'verificationCode', {
    code: '812399',
  });

  console.log('All messages sent. Disconnecting...');
  await client.disconnect();
};

main();
```

Run:
```bash
node example.js
```

> The first time you run it, a QR code will be displayed in the terminal.  
> Scan it with your WhatsApp to authenticate.

---

## 🧩 Templates Included

| Template Name | Description | Example Fields |
|----------------|--------------|----------------|
| `welcome` | Sends a welcome message | `{ name, company }` |
| `verificationCode` | Sends a verification code | `{ code }` |
| `resetCode` | Password reset code | `{ code }` |
| `orderStatus` | Order status update | `{ orderId, status }` |
| `shippingUpdate` | Shipping update with tracking | `{ orderId, carrier, trackingNumber }` |
| `passwordChangedNotice` | Password change alert | `{ username }` |
| `appointmentReminder` | Appointment notification | `{ serviceName, dateTime, location }` |
| `invoiceGenerated` | New invoice notification | `{ invoiceId, amount, dueDate }` |
| `subscriptionRenewalReminder` | Subscription renewal alert | `{ planName, renewalDate, amount }` |

---

## 🧰 API Reference

### `class WhatsappClient`

#### `new WhatsappClient(options?)`
| Option | Type | Default | Description |
|--------|------|----------|-------------|
| `authPath` | `string` | `'auth_info_baileys'` | Path to save session data |
| `logger` | `pino.Logger` | Built-in logger | Custom logger instance |

#### `initialize(): Promise<boolean>`
Initializes the WhatsApp connection. Prompts QR code on first run.

#### `sendTemplateMessage(to, templateName, data): Promise<void>`
Sends a predefined template message.

#### `sendRawMessage(to, messageContent): Promise<void>`
Send a raw WhatsApp message (text, image, etc.).

#### `disconnect(): Promise<void>`
Disconnects from WhatsApp gracefully.

#### `logout(): Promise<void>`
Logs out and invalidates saved credentials.

---

## 🧱 Project Structure

```
📁 wa-sender/
├── index.js                # Main WhatsApp client class
├── src/
│   └── templates.js        # Message templates
├── example.js              # Usage demo
├── package.json
├── .gitignore
└── README.md
```

---

## 🛠️ Development

Clone the repository:

```bash
git clone https://github.com/Seneth-Jayashan/wa-sender.git
cd wa-sender
npm install
npm start
```

To test the package locally before publishing:

```bash
npm link
```

Then in another project:

```bash
npm link @onexnpm/wa-sender
```

---

## 🔒 Notes

- QR authentication data is stored in the `auth_info_baileys/` folder.
- To re-login or change account, **delete that folder** and rerun the script.
- Only one active session per account is supported per device.

---

## 📄 License

ISC © [S JAY](https://github.com/Seneth-Jayashan)

---

## 🌐 Links

- **NPM:** [@onexnpm/wa-sender](https://www.npmjs.com/package/@onexnpm/wa-sender)  
- **GitHub:** [Seneth-Jayashan/wa-sender](https://github.com/Seneth-Jayashan/wa-sender)

---

> Proudly Developed by [OneX Universe - S JAY](https://github.com/Seneth-Jayashan)
