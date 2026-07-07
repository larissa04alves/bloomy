import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { createExam, listExams } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  status: z.enum(["to_schedule", "scheduled", "result_available", "completed"]).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ exams: await listExams(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const exam = await createExam(db, userId, parsed.data);
  return Response.json({ exam }, { status: 201 });
}
