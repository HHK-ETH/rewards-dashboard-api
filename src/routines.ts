import { MINICHEF_ADDRESS, ChainId } from './constants';
import StorageHelper from './storageHelper';
import { fetchTheGraphUsers, queryMinichefRewards, queryRewardersbalance } from './web3';

export async function fetchPendingSushiRoutine(storageHelper: StorageHelper): Promise<void> {
  const memory: any = {};
  for (const chainId in MINICHEF_ADDRESS) {
    console.log(chainId + ' start');
    const users = await fetchTheGraphUsers(chainId as any);
    const rewards = await queryMinichefRewards(chainId as any, users);
    const balances = await queryRewardersbalance(chainId as any, rewards.tokenRewards);
    for (const address in balances) {
      rewards.tokenRewards[address].tokenName = balances[address].tokenName;
      rewards.tokenRewards[address].amount = balances[address].amount;
    }
    memory[ChainId[chainId as any]] = rewards;
    console.log(chainId + ' end');
  }
  const storage = await storageHelper.read();
  for (const chainId in MINICHEF_ADDRESS) {
    storage[ChainId[chainId]].rewards = memory[ChainId[chainId]];
  }
  await storageHelper.write(storage);
  console.log('Updated storage.');
}
