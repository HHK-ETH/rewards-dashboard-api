import express from 'express';
import { fetchRewardersData, StorageHelper } from './src';
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
}, 900_000);

app.get('/api', authMiddleware, async (req, res) => {
  res.json(await storageHelper.read());
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
