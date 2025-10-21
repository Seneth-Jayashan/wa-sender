// index.js
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import qr from 'qrcode-terminal';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { templates } from './src/templates.js';


const defaultLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard',
    },
  },
});

export class WhatsappClient {
  /**
   * @param {object} options
   * @param {string} [options.authPath='auth_info_baileys']
   * @param {pino.Logger} [options.logger] 
   */
  constructor(options = {}) {
    this.authPath = options.authPath || 'auth_info_baileys';
    this.logger = (options.logger || defaultLogger).child({
      service: 'whatsapp-client',
    });
    this.sock = null;
    this.isConnected = false;
  }

  /**
   * @returns {Promise<boolean>} 
   */
  async initialize() {
    const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, 
      logger: this.logger, 
      browser: ['OneX Universe HR', 'Chrome', '1.0.0'], 
    });

    this.sock.ev.on('creds.update', saveCreds);

    return new Promise((resolve, reject) => {
      this.sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr: qrCode } = update;

        if (qrCode) {
          this.logger.info('QR Code received, scan please:');
          qr.generate(qrCode, { small: true });
        }

        if (connection === 'open') {
          this.logger.info('WhatsApp connection opened successfully.');
          this.isConnected = true;
          resolve(true); 
        }

        if (connection === 'close') {
          this.isConnected = false;
          const shouldReconnect =
            lastDisconnect?.error instanceof Boom &&
            lastDisconnect.error.output.statusCode !==
              DisconnectReason.loggedOut;

          this.logger.warn(
            `Connection closed. Reason: ${lastDisconnect?.error?.message}. Reconnecting: ${shouldReconnect}`,
          );

          if (shouldReconnect) {
            this.initialize(); 
          } else if (
            lastDisconnect.error?.output.statusCode ===
            DisconnectReason.loggedOut
          ) {
            this.logger.error(
              `Logged out. Please delete '${this.authPath}' folder and restart.`,
            );
            
            resolve(false); 
          }
        }
      });
    });
  }

  /**
   * @param {string} jid 
   * @returns {string} 
   */
  formatJid(jid) {
    if (jid.includes('@')) {
      return jid;
    }
    const cleaned = jid.replace(/[^0-9]/g, '');
    
    return `${cleaned}@s.whatsapp.net`;
  }

  /**
   * @param {string} to - 
   * @param {object} messageContent - 
   * @returns {Promise<void>}
   */
  async sendRawMessage(to, messageContent) {
    if (!this.isConnected || !this.sock) {
      this.logger.error('Cannot send message: WhatsApp client is not connected.');
      throw new Error('WhatsApp client is not connected.');
    }

    const jid = this.formatJid(to);

    try {
      await this.sock.sendMessage(jid, messageContent);
      this.logger.debug({ to: jid }, 'Message sent successfully');
    } catch (error) {
      this.logger.error(
        { error, to: jid },
        'Error sending message',
      );
      throw error;
    }
  }

  /**

   * @param {string} to 
   * @param {keyof templates} templateName 
   * @param {object} data 
   */
  async sendTemplateMessage(to, templateName, data) {
    const templateBuilder = templates[templateName];

    if (typeof templateBuilder !== 'function') {
      this.logger.error(`Template "${templateName}" not found.`);
      throw new Error(`Template "${templateName}" not found.`);
    }

    const message = templateBuilder(data);
    await this.sendRawMessage(to, { text: message });
  }


  async disconnect() {
    if (this.sock) {
      this.logger.info('Disconnecting WhatsApp client...');
      this.sock.end(undefined);
      this.isConnected = false;
    }
  }


  async logout() {
    if (this.sock) {
      this.logger.warn('Logging out client and invalidating credentials...');
      await this.sock.logout();
      this.sock = null;
      this.isConnected = false;
    }
  }
}