import { formatUnits } from 'ethers/lib/utils';
import express from 'express';
import { StorageHelper } from './src';

const app = express();
const port = 3333;

const storageHelper = StorageHelper.getInstance();

app.get('/', async (req, res) => {
  const supply = await storageHelper.read();
  res.json({ supply: formatUnits(supply.supply, 18) });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
