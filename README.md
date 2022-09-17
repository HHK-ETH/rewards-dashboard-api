# Rewarder API

Simple multichain API to query Rewarders and their infos, comes with a script updating the data stored in srx/storage.json every hour.

Available at https://rewards.sushibackup.com/api (token needed, dm HHK for one or host your own!).

## Routes

GET /browse/{chainId}

```ts
return {
  id: string;
  masterchefId: number;
  balance: BigNumber;
  rewardsDue: BigNumber;
  rewardToken: {
    id: string;
    decimals: number;
    symbol: string;
  };
  rewardPerBlock: BigNumber;
  rewardPerSecond: BigNumber;
  pair: {
    id: string;
    symbol: string;
    volumeUSD: number[]; //last 30 days volume
    reserveUSD: number;
  };
  lastUpdated: number;
}[];
```

GET /browse/{chainId}/{rewarderAddress}

```ts
return {
  id: string;
  masterchefId: number;
  balance: BigNumber;
  rewardsDue: BigNumber;
  rewardToken: {
    id: string;
    decimals: number;
    symbol: string;
  };
  rewardPerBlock: BigNumber;
  rewardPerSecond: BigNumber;
  pair: {
    id: string;
    symbol: string;
    volumeUSD: number[]; //last 30 days volume
    reserveUSD: number;
  };
  lastUpdated: number;
};
```

POST /browse/{chainId}/{rewarderAddress}

```ts
UpdateRewarder();
return {
  id: string;
  masterchefId: number;
  balance: BigNumber;
  rewardsDue: BigNumber;
  rewardToken: {
    id: string;
    decimals: number;
    symbol: string;
  };
  rewardPerBlock: BigNumber;
  rewardPerSecond: BigNumber;
  pair: {
    id: string;
    symbol: string;
    volumeUSD: number[]; //last 30 days volume
    reserveUSD: number;
  };
  lastUpdated: number;
};
```