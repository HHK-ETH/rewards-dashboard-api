import { MINICHEF_ADDRESS, Rewarder } from './constants';
import StorageHelper from './storageHelper';
import { fetchRewarders, fetchRewardsDue } from './web3';

export async function fetchRewardersData(storageHelper: StorageHelper): Promise<void> {
  const { rewarders, timestamp } = await storageHelper.read();
  for (const chainId in MINICHEF_ADDRESS) {
    console.log(chainId + ' start');
    const rewardersData = await fetchRewarders(chainId as any);
    for (let i = 0; i < rewardersData.length; i += 1) {
      rewardersData[i].rewardsDue = await fetchRewardsDue(
        chainId as any,
        rewardersData[i].id,
        rewardersData[i].masterchefId
      );
    }
    rewarders[chainId] = rewardersData;
    console.log(chainId + ' end');
  }
  storageHelper.write(rewarders);
  console.log('Updated storage.');
}
