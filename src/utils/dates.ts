import { format, parseISO } from "date-fns";

export const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");
export const todayISO = (d = new Date()) => format(d, "yyyy-MM-dd");
