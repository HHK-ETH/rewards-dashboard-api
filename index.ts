import express from 'express';
import { ChainId, fetchRewardersData, MINICHEF_ADDRESS, StorageHelper } from './src';
import * as dotenv from 'dotenv';
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
  const rewarders = await storageHelper.read();
  if (!rewarders[chainId]) {
    res.status(404).end();
    return;
  }
  res.json(rewarders[chainId]);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
