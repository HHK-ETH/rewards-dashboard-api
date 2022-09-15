import fs from 'fs';
import fsPromise from 'fs/promises';
import { MINICHEF_ADDRESS, Rewarder } from './constants';

export default class StorageHelper {
  private static instance: StorageHelper;

  private constructor() {
    fs.access('./src/storage.json', fs.constants.R_OK, (err) => {
      if (!err) return;
      const storage: any = {};
      for (const id in MINICHEF_ADDRESS) {
        const label = id;
        storage[label] = [];
      }
      fs.writeFile('./src/storage.json', JSON.stringify({ rewarders: storage, timestamp: 0 }), (err) => {
        if (!err) return;
        console.log(err);
        throw Error('Impossible to open nor create storage.json.');
      });
    });
  }

  public static getInstance(): StorageHelper {
    if (StorageHelper.instance === undefined) {
      StorageHelper.instance = new StorageHelper();
    }
    return StorageHelper.instance;
  }

  public async read(): Promise<{ rewarders: { [chainId: number]: Rewarder[] }; timestamp: number }> {
    const content = await fsPromise.readFile('./src/storage.json', 'utf-8');
    return JSON.parse(content);
  }

  public async write(rewarders: { [chainId: number]: Rewarder[] }): Promise<void> {
    const content = { rewarders: rewarders, timestamp: new Date().getTime() / 1000 };
    await fsPromise.writeFile('./src/storage.json', JSON.stringify(content));
  }
}
