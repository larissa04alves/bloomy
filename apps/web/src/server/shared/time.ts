import { z } from "zod";

/** Horário no formato HH:MM (00:00–23:59). */
export const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");
