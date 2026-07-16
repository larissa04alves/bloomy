import { db } from "@bloomy/db";
import { z } from "zod";

import { invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { createExam, listExams } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  status: z.enum(["to_schedule", "scheduled", "result_available", "completed"]).optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ exams: await listExams(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const exam = await createExam(db, userId, parsed.data);
  return Response.json({ exam }, { status: 201 });
}
