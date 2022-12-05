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
      fs.writeFile('./src/storage.json', JSON.stringify(storage), (err) => {
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

  public async read(): Promise<{ [chainId: number]: Rewarder[] }> {
    const rewarders = await fsPromise.readFile('./src/storage.json', 'utf-8');
    return JSON.parse(rewarders);
  }

  public async write(rewarders: { [chainId: number]: Rewarder[] }): Promise<void> {
    await fsPromise.writeFile('./src/storage.json', JSON.stringify(rewarders));
  }
}
