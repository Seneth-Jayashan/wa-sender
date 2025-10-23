import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import fs from 'fs';
import { EventEmitter } from 'events';
import pino from 'pino';
import { templates } from './src/templates.js';
import qrcode from 'qrcode-terminal';

export class WhatsappClient extends EventEmitter {
    #sock;
    #logger;
    #msgRetryCounterMap;
    #messageStore;
    #groupCache;
    #authStatePath;

    constructor(options = {}) {
        super();
        this.#authStatePath = options.authStatePath || 'baileys_auth_info';
        this.#logger = pino({ level: options.logLevel || 'silent' });
        this.#msgRetryCounterMap = new Map();
        this.#messageStore = new Map();
        this.#groupCache = new NodeCache({ stdTTL: 1800, checkperiod: 300, useClones: false });
    }

    #getTemplate(name, params = {}) {
        const fn = templates[name];
        if (!fn) return null;
        return fn(params);
    }

    #formatJid(num) {
        return num.endsWith('@s.whatsapp.net') ? num : `${num}@s.whatsapp.net`;
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
                this.#messageStore.get(jid).set(msg.key.id, msg);
                this.emit('message', msg);
            }
        });

        ev.on('groups.upsert', (groups) => {
            for (const g of groups) this.#groupCache.set(g.id, g);
            this.emit('groups.upsert', groups);
        });

        ev.on('groups.update', (updates) => {
            for (const u of updates) {
                const old = this.#groupCache.get(u.id);
                if (old) this.#groupCache.set(u.id, { ...old, ...u });
            }
            this.emit('groups.update', updates);
        });
    }

    async initialize(options = {}) {
        const { state, saveCreds } = await useMultiFileAuthState(this.#authStatePath);
        const { version } = await fetchLatestBaileysVersion();

        this.#sock = makeWASocket({
            version,
            logger: this.#logger,
            browser: Browsers.macOS('Chrome'),
            auth: state,
            syncFullHistory: true,
            getMessage: async (key) => this.#messageStore.get(key.remoteJid)?.get(key.id),
            cachedGroupMetadata: async (jid) => this.#groupCache.get(jid),
            msgRetryCounterMap: this.#msgRetryCounterMap
        });

        this.#setupHandlers();
        this.#sock.ev.on('creds.update', saveCreds);

        return new Promise((resolve, reject) => {
            this.#sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;

                // Print QR code in terminal if available
                if (qr) {
                    console.log('Scan this QR code with your WhatsApp:');
                    qrcode.generate(qr, { small: true });
                }

                if (connection === 'open') {
                    console.log('WhatsApp client connected!');
                    resolve();
                }

                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error instanceof Boom
                        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                        : true;

                    if (!shouldReconnect) {
                        fs.rmSync(this.#authStatePath, { recursive: true, force: true });
                        reject(new Error('Logged out. Please login again.'));
                    }
                }
            });
        });
    }

    async sendTemplateMessage(recipient, name, params) {
        if (!this.#sock) throw new Error('Client not initialized.');
        const text = this.#getTemplate(name, params);
        if (!text) throw new Error(`Template "${name}" not found.`);
        return this.#sock.sendMessage(this.#formatJid(recipient), { text });
    }

    async sendMessage(recipient, content) {
        if (!this.#sock) throw new Error('Client not initialized.');
        return this.#sock.sendMessage(this.#formatJid(recipient), content);
    }

    async getGroupInfo(jid) {
        let meta = this.#groupCache.get(jid);
        if (!meta && this.#sock) {
            try {
                meta = await this.#sock.groupMetadata(jid);
                if (meta) this.#groupCache.set(jid, meta);
            } catch {}
        }
        return meta;
    }

    async disconnect() {
        if (this.#sock) {
            await this.#sock.end();
            this.#sock = null;
        }
    }
}
