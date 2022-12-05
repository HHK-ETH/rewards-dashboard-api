import { BigNumber } from 'ethers';
import fs from 'fs';
import fsPromise from 'fs/promises';

export default class StorageHelper {
  private static instance: StorageHelper;

  private constructor() {
    fs.access('./src/storage.json', fs.constants.R_OK, (err) => {
      if (!err) return;
      const storage: any = { supply: BigNumber.from(0) };
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

  public async read(): Promise<{ supply: BigNumber }> {
    const rewarders = await fsPromise.readFile('./src/storage.json', 'utf-8');
    return JSON.parse(rewarders);
  }

  public async write(supply: BigNumber): Promise<void> {
    await fsPromise.writeFile('./src/storage.json', JSON.stringify({ supply: supply }));
  }
}
