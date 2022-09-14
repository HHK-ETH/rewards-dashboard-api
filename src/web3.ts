import { BigNumber, Contract, ethers, providers } from 'ethers';
import {
  RPC,
  MULTICALL,
  MINICHEF_POOLS_QUERY,
  MINICHEF_POOLS_RESULT,
  Rewarder,
  EXCHANGE_SUBGRAPH,
  PAIR_INFOS_QUERY,
  PAIR_INFOS_RESULT,
} from './constants';
import { ERC20_ABI, MULTICALL_ABI, REWARDER_ABI } from './../imports';
import request from 'graphql-request';
import { MINICHEF_SUBGRAPH } from './constants';

async function fetchRewardersTheGraph(chainId: number): Promise<MINICHEF_POOLS_RESULT[]> {
  try {
    const pools = await request(MINICHEF_SUBGRAPH[chainId], MINICHEF_POOLS_QUERY);
    return pools.pools;
  } catch (error) {
    console.log(error);
  }
  return [];
}

export async function fetchRewarders(chainId: number): Promise<Rewarder[]> {
  const provider = new providers.JsonRpcProvider(RPC[chainId]);
  const rewarders: Rewarder[] = [];
  const pools = await fetchRewardersTheGraph(chainId);
  await Promise.all(
    pools.map(async (pool) => {
      if (pool.rewarder.id !== '0x0000000000000000000000000000000000000000') {
        let rewardTokenAddress = pool.rewarder.rewardToken;
        if (rewardTokenAddress === '0x0000000000000000000000000000000000000000') {
          const rewarderContract = new Contract(pool.rewarder.id, REWARDER_ABI, provider);
          try {
            rewardTokenAddress = await rewarderContract.rewardToken();
          } catch (error) {
            console.log(error);
          }
        }
        const rewardToken = await fetchTokenInfos(rewardTokenAddress, pool.rewarder.id, provider);
        const pair = await fetchPairInfos(pool.pair, provider);
        rewarders.push({
          id: pool.rewarder.id,
          masterchefId: parseFloat(pool.id),
          balance: rewardToken.rewarderBalance,
          rewardsDue: BigNumber.from(0),
          rewardToken: rewardToken.tokenInfos,
          rewardPerBlock: BigNumber.from(0),
          rewardPerSecond: BigNumber.from(0),
          pair: {
            id: pool.pair,
            symbol: pair.symbol,
            volumeUSD: pair.volumeUSD,
            reserveUSD: pair.reserveUSD,
          },
        });
      }
    })
  );
  return rewarders;
}

async function fetchTokenInfos(
  tokenAddress: string,
  rewarderAddress: string,
  provider: providers.JsonRpcProvider
): Promise<{ tokenInfos: { id: string; decimals: number; symbol: string }; rewarderBalance: BigNumber }> {
  if (tokenAddress === '0x0000000000000000000000000000000000000000')
    return {
      tokenInfos: { id: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'UNKNOWN' },
      rewarderBalance: BigNumber.from(0),
    };
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return {
    tokenInfos: {
      id: tokenAddress,
      decimals: await token.decimals(),
      symbol: await token.symbol(),
    },
    rewarderBalance: await token.balanceOf(rewarderAddress),
  };
}

async function fetchPairInfos(
  address: string,
  provider: providers.JsonRpcProvider
): Promise<{ id: string; symbol: string; volumeUSD: number[]; reserveUSD: number }> {
  try {
    const pairInfos = await request(EXCHANGE_SUBGRAPH[provider._network.chainId], PAIR_INFOS_QUERY, {
      id: address,
    });
    if (pairInfos.pair) {
      const pair: PAIR_INFOS_RESULT = pairInfos.pair;
      return {
        id: address,
        symbol: pair.token0.symbol + '-' + pair.token1.symbol,
        volumeUSD: pair.daySnapshots.map((dayData) => {
          return parseFloat(dayData.volumeUSD);
        }),
        reserveUSD: parseFloat(pair.liquidityUSD),
      };
    }
  } catch (error) {
    console.log(error);
  }
  return { id: address, symbol: 'UNKNOWN', volumeUSD: [], reserveUSD: 0 };
}

type Call = {
  target: string;
  callData: string;
};

type Result = {
  success: boolean;
  returnData: string;
};

export async function multicall(
  chainId: number,
  calls: Call[],
  provider: ethers.providers.JsonRpcProvider
): Promise<Result[]> {
  const multicall = new Contract(MULTICALL[chainId], MULTICALL_ABI, provider);
  return await multicall.tryAggregate(false, calls);
}
