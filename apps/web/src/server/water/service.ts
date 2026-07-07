import "server-only";

import type { Db } from "@bloomy/db";
import { waterLog, type WaterLog } from "@bloomy/db/schema/body";
import { and, desc, eq } from "drizzle-orm";

import { dayFor } from "@/server/shared/day";

export async function addWater(db: Db, userId: string, ml: number): Promise<WaterLog> {
  const [log] = await db
    .insert(waterLog)
    .values({ userId, ml, day: dayFor() })
    .returning();

  return log;
}

export async function removeLastWater(
  db: Db,
  userId: string,
  day: string,
): Promise<WaterLog | null> {
  const [last] = await db
    .select()
    .from(waterLog)
    .where(and(eq(waterLog.userId, userId), eq(waterLog.day, day)))
    .orderBy(desc(waterLog.createdAt))
    .limit(1);

  if (!last) return null;

  await db.delete(waterLog).where(eq(waterLog.id, last.id));
  return last;
}

export async function getWaterDay(
  db: Db,
  userId: string,
  day: string,
): Promise<{ logs: WaterLog[]; totalMl: number }> {
  const logs = await db
    .select()
    .from(waterLog)
    .where(and(eq(waterLog.userId, userId), eq(waterLog.day, day)))
    .orderBy(desc(waterLog.createdAt));

  return { logs, totalMl: logs.reduce((sum, l) => sum + l.ml, 0) };
}
