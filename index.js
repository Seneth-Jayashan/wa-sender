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

export class WhatsappClient extends EventEmitter {
    #sock;
    #logger;
    #msgRetryCounterMap;
    #messageStore;
    #groupCache;
    #authStatePath;

    // --- 🔖 Template Library ---
    #templates = {
        // ✅ General & Onboarding
        welcome: '🎉 Welcome, {{name}}! We’re excited to have you join {{company}}. Let’s make great things happen together!',
        verificationCode: 'Your verification code is: *{{code}}*. It expires in 10 minutes. Please do not share it with anyone.',
        resetCode: '🔑 Password Reset\nYour reset code is *{{code}}*. Use this to securely reset your password.',
        passwordChangedNotice: '🔐 Hi {{username}}, your password was changed successfully. If this wasn’t you, please reset it immediately.',

        // 🛒 Orders & Shipping
        orderStatus: '📦 Order Update\nOrder #{{orderId}} is now *{{status}}*. Thank you for shopping with us!',
        shippingUpdate: '🚚 Shipping Update for Order #{{orderId}}\nCarrier: {{carrier}}\nTracking: {{trackingNumber}}',
        invoiceGenerated: '🧾 Invoice #{{invoiceId}} generated.\nAmount: Rs. {{amount}}\nDue Date: {{dueDate}}',

        // 💳 Subscriptions & Billing
        subscriptionRenewalReminder: '🔔 Reminder: Your subscription for *{{planName}}* renews on {{renewalDate}} for Rs. {{amount}}.',
        paymentReceived: '💰 Payment Received!\nWe’ve received Rs. {{amount}} for Invoice #{{invoiceId}}.\nThank you!',
        paymentFailed: '⚠️ Payment Failed\nYour payment of Rs. {{amount}} could not be processed. Please update your payment method.',

        // 🕑 Appointments & Events
        appointmentReminder: '📅 Reminder: Your {{serviceName}} appointment is on {{dateTime}} at {{location}}. Please be on time.',
        eventInvitation: '🎊 You’re invited to *{{eventName}}*! Join us at {{venue}} on {{date}} at {{time}}. RSVP now to confirm attendance.',
        meetingReminder: '📌 Meeting Reminder: Your meeting with *{{withPerson}}* is scheduled for {{dateTime}}. Join via {{meetingLink}}',

        // 🧾 Account & Notifications
        accountDeactivated: '⚠️ Hello {{username}}, your account has been temporarily deactivated. Contact support if this was a mistake.',
        accountReactivated: '✅ Good news {{username}}! Your account has been reactivated. You can now continue using our services.',
        otpLogin: '🔒 Login OTP: *{{otp}}* (valid for 5 minutes). Please do not share it with anyone.',

        // 🧍 Customer Engagement
        feedbackRequest: '💬 Hi {{name}}, we’d love your feedback on your recent experience with {{company}}. Share your thoughts with us!',
        thankYouPurchase: '🙏 Thank you {{name}} for shopping with {{company}}! We hope to serve you again soon.',
        promotionalOffer: '🎁 Special Offer: {{offerTitle}}\nUse code *{{promoCode}}* to get {{discount}} off. Valid till {{expiryDate}}!',
        seasonalGreeting: '✨ {{greetingTitle}} from all of us at {{company}}! Wishing you and your loved ones {{message}}.',

        // ⚙️ Technical / Internal Notifications
        systemAlert: '⚙️ System Alert\n{{alertMessage}}\nTime: {{timestamp}}',
        newUserSignup: '👋 New User Signup: {{name}} ({{email}}) has just registered on the platform.',
        adminNotification: '🚨 Admin Notification: {{message}}',
    };

    constructor(options = {}) {
        super();
        this.#authStatePath = options.authStatePath || 'baileys_auth_info';
        this.#logger = pino({ level: options.logLevel || 'silent' });
        this.#msgRetryCounterMap = new Map();
        this.#messageStore = new Map();
        this.#groupCache = new NodeCache({ stdTTL: 1800, checkperiod: 300, useClones: false });
    }

    #getTemplate(name, params = {}) {
        let text = this.#templates[name];
        if (!text) return null;
        for (const key in params)
            text = text.replace(new RegExp(`{{${key}}}`, 'g'), params[key]);
        return text;
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
            printQRInTerminal: false,
            browser: Browsers.macOS('Chrome'),
            auth: state,
            syncFullHistory: true,
            getMessage: async (key) => this.#messageStore.get(key.remoteJid)?.get(key.id),
            cachedGroupMetadata: async (jid) => this.#groupCache.get(jid),
            msgRetryCounterMap: this.#msgRetryCounterMap
        });

        this.#setupHandlers();
        this.#sock.ev.on('creds.update', saveCreds);

        return new Promise(async (resolve, reject) => {
            if (options.usePairingCode && !this.#sock.authState.creds.registered) {
                if (!options.phoneNumber) return reject(new Error('Phone number required.'));
                try {
                    const code = await this.#sock.requestPairingCode(options.phoneNumber);
                    this.emit('pairing-code', code);
                } catch (e) { return reject(e); }
            }

            this.#sock.ev.on('connection.update', (u) => {
                const { connection, lastDisconnect, qr } = u;
                if (qr) this.emit('qr', qr);
                if (connection === 'open') return resolve();
                if (connection === 'close') {
                    const reconnect = lastDisconnect?.error instanceof Boom
                        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                        : true;
                    if (!reconnect) {
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
