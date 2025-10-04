
export const graceTypes = [
  { id: 1, name: "ללא" },
  { id: 2, name: "חלקי" },
  { id: 3, name: "מלא" },
] as const;

export type GraceType = (typeof graceTypes)[number];
