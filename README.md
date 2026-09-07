# 📦 @onexnpm/wa-sender

> A modern, secure, and elegant WhatsApp message sender built on top of **Baileys**.  
> Features built-in MongoDB support for session persistence, a robust event system, media sending capabilities, and fully typed TypeScript support.

---

## 🚀 Features

✅ **TypeScript First**: Fully typed with strict types for a great developer experience.  
✅ **MongoDB Session Storage**: Securely store your WhatsApp authentication state in MongoDB (or fallback to local files).  
✅ **Media Support**: Send images, videos, documents, and locations with ease.  
✅ **Number Verification**: Check if a number is registered on WhatsApp before sending messages.  
✅ **Event-Driven**: Listen to `qr`, `connected`, `disconnected`, and `auth_failure` events.  
✅ **Rich Templates**: Predefined templates for common message types (welcome, verification, shipping, etc.).  
✅ **Robust Error Handling & Logging**: Uses **pino** for structured logging.  

---

## 📦 Installation

```bash
npm install @onexnpm/wa-sender mongodb
# or
yarn add @onexnpm/wa-sender mongodb
```
*(Note: `mongodb` is only required if you use the MongoDB auth state).*

---

## 🧠 Usage Example (TypeScript / ES Modules)

```ts
import { WhatsappClient } from '@onexnpm/wa-sender';
import { MongoClient } from 'mongodb';

const RECIPIENT_NUMBER = "94771234567"; // Replace with your WhatsApp number
const MONGODB_URI = "mongodb+srv://<username>:<password>@cluster0.mongodb.net/?appName=Cluster0";

const main = async () => {
  // Connect to MongoDB for auth state
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db('wa-sender');
  const authCollection = db.collection('auth_info');

  const client = new WhatsappClient({
    mongoCollection: authCollection, // Use MongoDB for session storage
    logLevel: 'info'
  });

  // Listen for the QR code
  client.on('qr', (qr) => {
    console.log('QR Code generated. Please scan!');
  });

  // Listen for successful connection
  client.on('connected', async () => {
    console.log('Client connected!');

    // 1. Verify number exists on WhatsApp
    const exists = await client.checkNumberExists(RECIPIENT_NUMBER);
    if (exists?.exists) {
      
      // 2. Send a regular text message
      await client.sendMessage(RECIPIENT_NUMBER, 'Hello from wa-sender!');
      
      // 3. Send a predefined template message
      await client.sendTemplateMessage(RECIPIENT_NUMBER, 'welcome', {
        name: 'John Doe',
        company: 'OneX Universe',
      });
      
      // 4. Send an image (URL or local Buffer/path)
      // await client.sendImage(RECIPIENT_NUMBER, 'https://example.com/image.png', 'Check this out!');

    }

    console.log('Messages sent. Disconnecting...');
    await client.disconnect();
    await mongoClient.close();
  });

  client.on('auth_failure', (err) => console.error('Auth Failed:', err));
  client.on('disconnected', (reason) => console.log('Disconnected:', reason));

  // Initialize the connection
  await client.initialize();
};

main();
```

---

## 🛠 Advanced Features

### Sending Media & Locations

```typescript
// Send an Image (can be a local path, Buffer, or URL)
await client.sendImage(RECIPIENT_NUMBER, './image.png', 'Caption here');

// Send a Video
await client.sendVideo(RECIPIENT_NUMBER, './video.mp4', 'Check this video');

// Send a Document (PDF, etc.)
await client.sendDocument(RECIPIENT_NUMBER, './invoice.pdf', 'invoice.pdf');

// Send a Location (Latitude, Longitude)
await client.sendLocation(RECIPIENT_NUMBER, 37.7749, -122.4194);
```

### Checking if a number is on WhatsApp

Before sending a message, you can verify if the user actually has a WhatsApp account to prevent spam or errors:
```typescript
const result = await client.checkNumberExists('1234567890');
if (result?.exists) {
    console.log(`User's full JID: ${result.jid}`);
}
```

---

## 🧰 API Reference

### `class WhatsappClient`

#### `new WhatsappClient(options?)`
| Option | Type | Default | Description |
|--------|------|----------|-------------|
| `authStatePath` | `string` | `'baileys_auth_info'` | Path to save local session data (used if MongoDB is not provided). |
| `mongoCollection`| `Collection` | `undefined` | MongoDB Collection instance. Overrides `authStatePath`. |
| `logLevel` | `string` | `'silent'` | Logger level for pino (`'info'`, `'debug'`, etc.). |

#### Methods
- **`initialize(): Promise<void>`**: Starts the WhatsApp connection.
- **`checkNumberExists(number: string): Promise<any>`**: Checks if a phone number is registered on WhatsApp.
- **`sendMessage(to: string, text: string): Promise<void>`**: Sends a simple text message.
- **`sendTemplateMessage(to: string, templateName: string, data: object): Promise<void>`**: Sends a predefined template message.
- **`sendRawMessage(to: string, content: AnyMessageContent): Promise<void>`**: Sends raw Baileys message content.
- **`sendImage(to: string, pathOrUrl: string | Buffer, caption?: string): Promise<void>`**: Sends an image.
- **`sendVideo(to: string, pathOrUrl: string | Buffer, caption?: string): Promise<void>`**: Sends a video.
- **`sendDocument(to: string, pathOrUrl: string | Buffer, fileName: string): Promise<void>`**: Sends a document.
- **`sendLocation(to: string, lat: number, long: number): Promise<void>`**: Sends a location.
- **`getGroupInfo(jid: string): Promise<GroupMetadata>`**: Fetches group metadata.
- **`disconnect(): Promise<void>`**: Gracefully disconnects from the socket.
- **`logout(): Promise<void>`**: Logs out of the current device session and clears auth data.

#### Events
The `WhatsappClient` emits the following events:
- `qr` (qrCodeString: string): Emitted when a QR code needs scanning.
- `connected` (): Emitted when the client connects successfully.
- `disconnected` (reason: any): Emitted when the client disconnects.
- `auth_failure` (error: Error): Emitted when login fails or session becomes invalid.
- `message` (msg: proto.IWebMessageInfo): Emitted when a message is received (only notifies).

---

## 📄 License

ISC © [S JAY](https://github.com/Seneth-Jayashan)

---

## 🌐 Links

- **NPM:** [@onexnpm/wa-sender](https://www.npmjs.com/package/@onexnpm/wa-sender)  
- **GitHub:** [Seneth-Jayashan/wa-sender](https://github.com/Seneth-Jayashan/wa-sender)
