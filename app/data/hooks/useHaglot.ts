//  data/hooks/useHaglot.ts
import useSWR from "swr";

export type LotteryRecord = {
  LotteryHousingUnits: number;
  Subscribers: number;
  Winners: number;

  LamasName: string;
  Neighborhood: string;
  ProviderName: string;

  PriceForMeter: string;
  LotteryStatusValue: string;

  LotteryId?: number;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json());

export function useHaglot(search?: string) {
  const { data, isLoading } = useSWR<{
    records: LotteryRecord[];
  }>(
    `/api/haglot?limit=100${
      search ? `&search=${search}` : ""
    }`,
    fetcher
  );

  return {
    data: data?.records ?? [],
    isLoading,
  };
}