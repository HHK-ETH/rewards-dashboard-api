import { MINICHEF_ADDRESS, Rewarder } from './constants';
import StorageHelper from './storageHelper';
import { fetchRewarders } from './web3';

export async function fetchRewardersData(storageHelper: StorageHelper): Promise<void> {
  const rewarders = await storageHelper.read();
  for (const chainId in MINICHEF_ADDRESS) {
    console.log(chainId + ' start');
    const rewardersData = await fetchRewarders(chainId as any);
    rewarders[chainId] = rewardersData;
    //fetch users for each rewarders and their pending tokens
    console.log(chainId + ' end');
  }
  storageHelper.write(rewarders);
  console.log('Updated storage.');
}
