//  data/hooks/useHaglot.ts

"use client";

import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json());

export function useHaglot(search?: string) {
  const { data, isLoading } = useSWR(
    `/api/haglot?limit=100${search ? `&search=${search}` : ""}`,
    fetcher
  );

  return {
    data: data?.records || [],
    isLoading,
  };
}