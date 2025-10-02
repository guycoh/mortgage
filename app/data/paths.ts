export type Path = {
  id: number;
  name: string;
  indexed: boolean;
};

export const paths: Path[] = [
  { id: 1, name: 'פריים', indexed: false },
  { id: 2, name: 'קלצ', indexed: false },
  { id: 3, name: 'קצ', indexed: true },
  { id: 4, name: 'מלצ', indexed: false },
  { id: 5, name: 'מצ', indexed: true }
];
