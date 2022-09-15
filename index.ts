import express from 'express';
import { ChainId, fetchRewardersData, MINICHEF_ADDRESS, StorageHelper } from './src';
import * as dotenv from 'dotenv';
import { updateRewarder } from './src/web3';
dotenv.config();

const app = express();
const port = 3333;

const authMiddleware = async function (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const token = req.headers.authorization;
  if (!token || token.slice(7) !== process.env.TOKEN) {
    res.status(401).end();
    return;
  }
  next();
};

const storageHelper = StorageHelper.getInstance();
setTimeout(() => {
  fetchRewardersData(storageHelper);
}, 1800_000); //30min

app.get('/api/:chainId', authMiddleware, async (req, res) => {
  const chainId = parseInt(req.params.chainId, 10);
  const { rewarders, timestamp } = await storageHelper.read();
  if (!rewarders[chainId]) {
    res.status(404).end();
    return;
  }
  res.json({ rewarders: rewarders[chainId], lastUpdate: timestamp });
});

app.get('/api/:chainId/:rewarderId', authMiddleware, async (req, res) => {
  const chainId = parseInt(req.params.chainId, 10);
  const rewarderId = req.params.chainId;
  const { rewarders, timestamp } = await storageHelper.read();
  if (!rewarders[chainId]) {
    res.status(404).end();
    return;
  }
  const rewarder = rewarders[chainId].find((rewarder) => {
    return rewarder.id === rewarderId;
  });
  if (!rewarder) {
    res.status(404).end();
    return;
  }
  res.json({ rewarder: rewarder, lastUpdate: timestamp });
});

app.post('/api/:chainId/:rewarderId', authMiddleware, async (req, res) => {
  const chainId = parseInt(req.params.chainId, 10);
  const rewarderId = req.params.chainId;
  const { rewarders, timestamp } = await storageHelper.read();
  if (!rewarders[chainId]) {
    res.status(404).end();
    return;
  }
  const rewarder = rewarders[chainId].find((rewarder) => {
    return rewarder.id === rewarderId;
  });
  if (!rewarder) {
    res.status(404).end();
    return;
  }
  const updatedRewarder = await updateRewarder(chainId, rewarder);
  rewarders[chainId].map((rewarder, index) => {
    if (rewarder.id === rewarderId) {
      rewarders[chainId][index] = updatedRewarder;
    }
  });
  res.json({ rewarder: updatedRewarder, lastUpdate: new Date().getTime() / 1000 });
  storageHelper.write(rewarders);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
