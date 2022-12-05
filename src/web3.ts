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
  POOL_USERS_QUERY,
} from './constants';
import { ERC20_ABI, MULTICALL_ABI, REWARDER_ABI } from './../imports';
import request from 'graphql-request';
import { MINICHEF_SUBGRAPH } from './constants';
import { AbiCoder } from 'ethers/lib/utils';

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
        const { rewardPerBlock, rewardPerSecond } = await fetchRewardRate(pool.rewarder.id, provider);
        rewarders.push({
          id: pool.rewarder.id,
          masterchefId: parseFloat(pool.id),
          balance: rewardToken.rewarderBalance,
          rewardsDue: BigNumber.from(0),
          rewardToken: rewardToken.tokenInfos,
          rewardPerBlock: rewardPerBlock,
          rewardPerSecond: rewardPerSecond,
          pair: {
            id: pool.pair,
            symbol: pair.symbol,
            volumeUSD: pair.volumeUSD,
            reserveUSD: pair.reserveUSD,
          },
          lastUpdated: Date.now() / 1000,
        });
      }
    })
  );
  return rewarders;
}

export async function updateRewarder(chainId: number, rewarder: Rewarder): Promise<Rewarder> {
  const provider = new providers.JsonRpcProvider(RPC[chainId]);
  const rewardToken = await fetchTokenInfos(rewarder.rewardToken.id, rewarder.id, provider);
  const { rewardPerBlock, rewardPerSecond } = await fetchRewardRate(rewarder.id, provider);
  rewarder.balance = rewardToken.rewarderBalance;
  rewarder.rewardToken = rewardToken.tokenInfos;
  rewarder.rewardPerBlock = rewardPerBlock;
  rewarder.rewardPerSecond = rewardPerSecond;
  rewarder.pair = await fetchPairInfos(rewarder.pair.id, provider);
  rewarder.lastUpdated = Date.now() / 1000;
  return rewarder;
}

async function fetchRewardRate(
  rewarderAddress: string,
  provider: providers.JsonRpcProvider
): Promise<{ rewardPerBlock: BigNumber; rewardPerSecond: BigNumber }> {
  const rewarderContract = new Contract(rewarderAddress, REWARDER_ABI, provider);
  let rewardPerSecond = BigNumber.from(0);
  let rewardPerBlock = BigNumber.from(0);
  try {
    rewardPerSecond = await rewarderContract.rewardPerSecond();
    if (provider._network.chainId === 1) {
      rewardPerBlock = rewardPerSecond.mul(12); //Ethereum pos 12sec per block
    }
  } catch (error) {
    console.log(error);
    try {
      rewardPerBlock = await rewarderContract.rewardPerBlock();
      if (rewardPerBlock.gt(0) && provider._network.chainId === 1) {
        rewardPerSecond = rewardPerBlock.div(12); //Ethereum pos 12sec per block
      }
    } catch (error) {
      console.log(error);
      try {
        rewardPerBlock = await rewarderContract.tokenPerBlock();
        if (rewardPerBlock.gt(0) && provider._network.chainId === 1) {
          rewardPerSecond = rewardPerBlock.div(12); //Ethereum pos 12sec per block
        }
      } catch (error) {
        console.log(error);
      }
    }
  }
  return { rewardPerBlock, rewardPerSecond };
}

async function fetchTokenInfos(
  tokenAddress: string,
  rewarderAddress: string,
  provider: providers.JsonRpcProvider
): Promise<{ tokenInfos: { id: string; decimals: number; symbol: string }; rewarderBalance: BigNumber }> {
  let decimals = 18;
  let balance = BigNumber.from(0);
  let symbol = 'UKNOWN';
  if (tokenAddress !== '0x0000000000000000000000000000000000000000') {
    const token = new Contract(tokenAddress, ERC20_ABI, provider);
    try {
      decimals = await token.decimals();
      symbol = await token.symbol();
      balance = await token.balanceOf(rewarderAddress);
    } catch (error) {
      console.log(error);
    }
  }
  return {
    tokenInfos: {
      id: tokenAddress,
      decimals: decimals,
      symbol: symbol,
    },
    rewarderBalance: balance,
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

export async function fetchRewardsDue(chainId: number, rewarderAddress: string, poolId: number): Promise<BigNumber> {
  const users: { id: string; address: string }[] = [];
  let lastId = 0;
  while (true) {
    const result = await request(MINICHEF_SUBGRAPH[chainId], POOL_USERS_QUERY, {
      lastId: lastId,
      poolId: poolId,
    });
    users.push(...result.users);
    if (result.users.length < 1000) {
      break;
    }
    lastId = result.users[999].id;
  }
  const provider = new providers.JsonRpcProvider(RPC[chainId]);
  const rewarderContract = new Contract(rewarderAddress, REWARDER_ABI, provider);
  const rewarderCalls = users.map((user): Call => {
    return {
      target: rewarderAddress,
      callData: rewarderContract.interface.encodeFunctionData('pendingToken', [poolId, user.address]),
    };
  });
  let rewardsDue = BigNumber.from(0);
  for (let i = 0; i < rewarderCalls.length; i += 300) {
    try {
      const result = await multicall(chainId, rewarderCalls.slice(i, i + 300), provider);
      result.map((result) => {
        if (result.success) {
          const pending = new AbiCoder().decode(['uint256'], result.returnData)[0];
          rewardsDue = rewardsDue.add(pending);
        }
      });
    } catch (error) {
      console.log(error);
    }
  }
  return rewardsDue;
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
