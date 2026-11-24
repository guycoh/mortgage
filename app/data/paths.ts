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
  { id: 5, name: 'מצ', indexed: true },
  // THE TWO FOREIGN-CURRENCY TRACKS.
  //
  // `indexed` is the CPI flag — the engine reads it to decide whether to grow
  // the balance along the consumer price index — and a מט"ח track is NOT
  // CPI-linked, so it is false. Its balance does move, with the exchange rate,
  // and the letter's own הפרשי הצמדה figure comes onto the row as `indexation`
  // (a dollar tranche struck at 3.70 prints a NEGATIVE one today). What is not
  // modelled is the FUTURE: there is no forward curve for the shekel here, and
  // the banks do not publish one either — Mizrahi prints its forecast rate on
  // the same letter with the note "כוללים משנים צמודי מט"ח ללא תחזיות". So the
  // rate is held as typed and the balance is left in shekels, which states what
  // the client owes today without inventing a currency view.
  { id: 6, name: 'מטח דולר', indexed: false },
  { id: 7, name: 'מטח יורו', indexed: false }
];
