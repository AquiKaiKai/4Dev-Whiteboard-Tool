import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";

export const useUsers = () => useQuery({ queryKey: ["users"], queryFn: () => api.users.list() });
