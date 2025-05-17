// pages/api/shamaim.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const response = await fetch('https://data.gov.il/dataset/shamaim/resource/8540534a-eccd-4568-a677-652d589ed172/download/shamaim.csv');
  const data = await response.text();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.status(200).send(data);
}
