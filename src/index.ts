import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
    WASocket,
    AnyMessageContent,
    AuthenticationState
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import fs from 'fs';
import { EventEmitter } from 'events';
import pino from 'pino';
import { templates, type TemplateData } from './templates.js';
import qrcode from 'qrcode-terminal';
import { Collection } from 'mongodb';
import { useMongoDBAuthState } from './mongoAuthState.js';

export { useMongoDBAuthState, templates, type TemplateData };

export interface WhatsappClientOptions {
    /** Path for local file auth. Defaults to 'baileys_auth_info' */
    authStatePath?: string;
    /** MongoDB Collection for auth state. If provided, overrides authStatePath */
    mongoCollection?: Collection;
    /** Log level, defaults to 'silent' */
    logLevel?: string;
}

export class WhatsappClient extends EventEmitter {
    #sock: WASocket | null = null;
    #logger: any;
    #msgRetryCounterMap: Map<string, number>;
    #messageStore: Map<string, Map<string, any>>;
    #groupCache: NodeCache;
    #options: WhatsappClientOptions;

    constructor(options: WhatsappClientOptions = {}) {
        super();
        this.#options = options;
        this.#options.authStatePath = options.authStatePath || 'baileys_auth_info';
        this.#logger = pino({ level: options.logLevel || 'silent' });
        this.#msgRetryCounterMap = new Map();
        this.#messageStore = new Map();
        this.#groupCache = new NodeCache({ stdTTL: 1800, checkperiod: 300, useClones: false });
    }

    #getTemplate(name: string, params: TemplateData = {}): string | null {
        const fn = templates[name];
        if (!fn) return null;
        return fn(params);
    }

    #formatJid(num: string): string {
        const cleaned = num.replace(/[^0-9]/g, '');
        return cleaned.endsWith('@s.whatsapp.net') ? cleaned : `${cleaned}@s.whatsapp.net`;
    }

    #setupHandlers() {
        if (!this.#sock) return;
        const ev = this.#sock.ev;

        ev.on('messages.upsert', ({ messages, type }) => {
            if (type !== 'notify') return;
            for (const msg of messages) {
                const jid = msg.key.remoteJid;
                if (!jid) continue;
                if (!this.#messageStore.has(jid)) this.#messageStore.set(jid, new Map());
                this.#messageStore.get(jid)!.set(msg.key.id!, msg);
                this.emit('message', msg);
            }
        });

        ev.on('groups.upsert', (groups) => {
            for (const g of groups) this.#groupCache.set(g.id, g);
            this.emit('groups.upsert', groups);
        });

        ev.on('groups.update', (updates) => {
            for (const u of updates) {
                if (!u.id) continue;
                const old = this.#groupCache.get(u.id);
                if (old) this.#groupCache.set(u.id, { ...(old as any), ...u });
            }
            this.emit('groups.update', updates);
        });
    }

    /**
     * Initializes the WhatsApp client connection.
     */
    async initialize(): Promise<void> {
        let state: AuthenticationState;
        let saveCreds: () => Promise<void>;

        if (this.#options.mongoCollection) {
            const result = await useMongoDBAuthState(this.#options.mongoCollection);
            state = result.state;
            saveCreds = result.saveCreds;
            this.#logger.info('Using MongoDB for auth state');
        } else {
            const result = await useMultiFileAuthState(this.#options.authStatePath!);
            state = result.state;
            saveCreds = result.saveCreds;
            this.#logger.info(`Using local file system for auth state at ${this.#options.authStatePath}`);
        }

        const { version } = await fetchLatestBaileysVersion();

        this.#sock = makeWASocket({
            version,
            logger: this.#logger,
            browser: Browsers.macOS('Chrome'),
            auth: state,
            syncFullHistory: false,
            getMessage: async (key) => this.#messageStore.get(key.remoteJid!)?.get(key.id!),
            cachedGroupMetadata: async (jid) => this.#groupCache.get(jid) as any,
            msgRetryCounterCache: this.#msgRetryCounterMap as any
        });

        this.#setupHandlers();
        this.#sock.ev.on('creds.update', saveCreds);

        return new Promise((resolve, reject) => {
            let resolved = false;

            const handleConnectionUpdate = (update: any) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    this.emit('qr', qr);
                    // Still print to console for convenience if no listeners
                    if (this.listenerCount('qr') === 0) {
                        console.log('Scan this QR code:');
                        qrcode.generate(qr, { small: true });
                    }
                }

                if (connection === 'open' && !resolved) {
                    resolved = true;
                    this.emit('connected');
                    console.log('WhatsApp client connected!');
                    resolve();
                }

                if (connection === 'close') {
                    this.emit('disconnected', lastDisconnect);
                    const shouldReconnect = lastDisconnect?.error instanceof Boom &&
                                            lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
                    
                    if (!shouldReconnect) {
                        this.emit('auth_failure', new Error('Logged out. Please login again.'));
                        if (!this.#options.mongoCollection) {
                            fs.rmSync(this.#options.authStatePath!, { recursive: true, force: true });
                        }
                        if (!resolved) {
                            reject(new Error('Logged out. Please login again.'));
                        }
                    } else {
                        console.log('Connection closed, retrying in 5s...');
                        setTimeout(() => this.initialize(), 5000);
                    }
                }
            };

            this.#sock!.ev.on('connection.update', handleConnectionUpdate);
        });
    }

    /**
     * Checks if a number exists on WhatsApp.
     * @param number The phone number to check
     * @returns Array of jid details if it exists, otherwise empty array
     */
    async checkNumberExists(number: string) {
        if (!this.#sock) throw new Error('Client not initialized.');
        const jid = this.#formatJid(number);
        const result = await this.#sock.onWhatsApp(jid);
        return result?.[0];
    }

    /**
     * Sends a raw message object.
     * @param recipient The recipient's phone number
     * @param content The message content
     */
    async sendRawMessage(recipient: string, content: AnyMessageContent) {
        if (!this.#sock) throw new Error('Client not initialized.');
        return this.#sock.sendMessage(this.#formatJid(recipient), content);
    }

    /**
     * Sends a predefined template message.
     * @param recipient The recipient's phone number
     * @param name The name of the template
     * @param params Parameters to fill the template
     */
    async sendTemplateMessage(recipient: string, name: string, params: TemplateData) {
        if (!this.#sock) throw new Error('Client not initialized.');
        const text = this.#getTemplate(name, params);
        if (!text) throw new Error(`Template "${name}" not found.`);
        return this.#sock.sendMessage(this.#formatJid(recipient), { text });
    }

    /**
     * Sends a simple text message.
     * @param recipient The recipient's phone number
     * @param content The text content
     */
    async sendMessage(recipient: string, content: string) {
        if (!this.#sock) throw new Error('Client not initialized.');
        return this.#sock.sendMessage(this.#formatJid(recipient), { text: content });
    }

    /**
     * Sends an image to the recipient.
     * @param recipient The recipient's phone number
     * @param imagePathOrUrl Path or URL to the image
     * @param caption Optional caption
     */
    async sendImage(recipient: string, imagePathOrUrl: string | Buffer, caption?: string) {
        if (!this.#sock) throw new Error('Client not initialized.');
        const image = typeof imagePathOrUrl === 'string' && imagePathOrUrl.startsWith('http') 
            ? { url: imagePathOrUrl } 
            : typeof imagePathOrUrl === 'string' ? fs.readFileSync(imagePathOrUrl) : imagePathOrUrl;
        
        return this.#sock.sendMessage(this.#formatJid(recipient), { image, caption });
    }

    /**
     * Sends a video to the recipient.
     * @param recipient The recipient's phone number
     * @param videoPathOrUrl Path or URL to the video
     * @param caption Optional caption
     */
    async sendVideo(recipient: string, videoPathOrUrl: string | Buffer, caption?: string) {
        if (!this.#sock) throw new Error('Client not initialized.');
        const video = typeof videoPathOrUrl === 'string' && videoPathOrUrl.startsWith('http') 
            ? { url: videoPathOrUrl } 
            : typeof videoPathOrUrl === 'string' ? fs.readFileSync(videoPathOrUrl) : videoPathOrUrl;
        
        return this.#sock.sendMessage(this.#formatJid(recipient), { video, caption });
    }

    /**
     * Sends a document to the recipient.
     * @param recipient The recipient's phone number
     * @param documentPathOrUrl Path or URL to the document
     * @param fileName Name of the file
     */
    async sendDocument(recipient: string, documentPathOrUrl: string | Buffer, fileName: string) {
        if (!this.#sock) throw new Error('Client not initialized.');
        const document = typeof documentPathOrUrl === 'string' && documentPathOrUrl.startsWith('http') 
            ? { url: documentPathOrUrl } 
            : typeof documentPathOrUrl === 'string' ? fs.readFileSync(documentPathOrUrl) : documentPathOrUrl;
        
        return this.#sock.sendMessage(this.#formatJid(recipient), { document, fileName, mimetype: 'application/octet-stream' });
    }

    /**
     * Sends a location to the recipient.
     * @param recipient The recipient's phone number
     * @param lat Latitude
     * @param long Longitude
     */
    async sendLocation(recipient: string, lat: number, long: number) {
        if (!this.#sock) throw new Error('Client not initialized.');
        return this.#sock.sendMessage(this.#formatJid(recipient), { location: { degreesLatitude: lat, degreesLongitude: long } });
    }

    /**
     * Gets group metadata.
     * @param jid Group JID
     */
    async getGroupInfo(jid: string) {
        let meta = this.#groupCache.get(jid);
        if (!meta && this.#sock) {
            try {
                meta = await this.#sock.groupMetadata(jid);
                if (meta) this.#groupCache.set(jid, meta);
            } catch {}
        }
        return meta;
    }

    /**
     * Disconnects the socket.
     */
    async disconnect() {
        if (this.#sock) {
            this.#sock.end(undefined);
            this.#sock = null;
        }
    }

    /**
     * Logs out the user and clears session data.
     */
    async logout() {
        if (this.#sock) {
            await this.#sock.logout();
            this.#sock = null;
        }
        if (!this.#options.mongoCollection) {
            fs.rmSync(this.#options.authStatePath!, { recursive: true, force: true });
        } else {
            // Drop the collection to remove auth data
            await this.#options.mongoCollection.drop();
        }
    }
}
