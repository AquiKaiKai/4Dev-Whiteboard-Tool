import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";

export const useActivity = (limit = 8) =>
  useQuery({ queryKey: ["activity", limit], queryFn: () => api.activity.list(limit) });
