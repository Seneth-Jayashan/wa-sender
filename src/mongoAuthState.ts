import { MongoClient, Collection, Db } from 'mongodb';
import { AuthenticationState, SignalDataTypeMap, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';

/**
 * Creates an authentication state that saves credentials to MongoDB.
 * @param collection MongoDB collection to use for storing auth data
 */
export const useMongoDBAuthState = async (collection: Collection): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
    
    const writeData = async (data: any, id: string) => {
        const parsedData = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
        await collection.replaceOne({ _id: id as any }, { _id: id as any, ...parsedData }, { upsert: true });
    };

    const readData = async (id: string) => {
        try {
            const data = await collection.findOne({ _id: id as any });
            if (data) {
                // Remove the _id field so it doesn't interfere with Baileys
                const { _id, ...rest } = data;
                return JSON.parse(JSON.stringify(rest), BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            return null;
        }
    };

    const removeData = async (id: string) => {
        try {
            await collection.deleteOne({ _id: id as any });
        } catch (_a) {
        }
    };

    let creds: any = await readData('creds');
    if (!creds) {
        creds = initAuthCreds();
        await writeData(creds, 'creds');
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data: { [key: string]: SignalDataTypeMap[typeof type] } = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = value;
                        }
                        data[id] = value;
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks: Promise<void>[] = [];
                    for (const category in data) {
                        for (const id in data[category as keyof typeof data]) {
                            const value = data[category as keyof typeof data]![id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(value, key) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds');
        }
    };
};
