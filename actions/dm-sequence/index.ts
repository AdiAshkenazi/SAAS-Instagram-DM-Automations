"use server";

import { client } from "@/lib/prisma";
import { onCurrentUser } from "../user";
import { findUser } from "../user/queries";

function serializeStep(s: any) {
  return {
    id: s.id,
    stepOrder: s.stepOrder,
    message: s.message,
    delayHours: s.delayHours,
    isEmailCapture: s.isEmailCapture,
    emailPrompt: s.emailPrompt,
  };
}

function serializeSequence(seq: any) {
  return {
    id: seq.id,
    name: seq.name,
    active: seq.active,
    triggerType: seq.triggerType,
    triggerWord: seq.triggerWord,
    enrollCount: seq.enrollCount,
    createdAt: seq.createdAt.toISOString(),
    steps: (seq.steps || []).map(serializeStep).sort((a: any, b: any) => a.stepOrder - b.stepOrder),
    _count: seq._count,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createDmSequence = async (name: string, triggerType: string) => {
  const user = await onCurrentUser();
  const profile = await findUser(user.id);
  if (!profile) return { status: 404, data: "User not found" };

  try {
    const seq = await client.dmSequence.create({
      data: { userId: profile.id, name, triggerType },
      include: { steps: true, _count: { select: { enrollments: true } } },
    });
    return { status: 200, data: serializeSequence(seq) };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

export const getDmSequences = async () => {
  const user = await onCurrentUser();
  const profile = await findUser(user.id);
  if (!profile) return { status: 404, data: [] };

  try {
    const seqs = await client.dmSequence.findMany({
      where: { userId: profile.id },
      include: { steps: true, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: seqs.map(serializeSequence) };
  } catch (err: any) {
    return { status: 500, data: [] };
  }
};

export const updateDmSequence = async (
  id: string,
  data: { name?: string; triggerType?: string; triggerWord?: string | null; active?: boolean }
) => {
  await onCurrentUser();
  try {
    const updated = await client.dmSequence.update({
      where: { id },
      data,
      include: { steps: true, _count: { select: { enrollments: true } } },
    });
    return { status: 200, data: serializeSequence(updated) };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

export const deleteDmSequence = async (id: string) => {
  await onCurrentUser();
  try {
    await client.dmSequence.delete({ where: { id } });
    return { status: 200 };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

// ─── Steps ────────────────────────────────────────────────────────────────────

export const addSequenceStep = async (
  sequenceId: string,
  data: {
    message: string;
    delayHours: number;
    isEmailCapture?: boolean;
    emailPrompt?: string;
  }
) => {
  await onCurrentUser();
  try {
    const count = await client.dmSequenceStep.count({ where: { sequenceId } });
    const step = await client.dmSequenceStep.create({
      data: { sequenceId, stepOrder: count, ...data },
    });
    return { status: 200, data: serializeStep(step) };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

export const updateSequenceStep = async (
  stepId: string,
  data: { message?: string; delayHours?: number; emailPrompt?: string }
) => {
  await onCurrentUser();
  try {
    const step = await client.dmSequenceStep.update({ where: { id: stepId }, data });
    return { status: 200, data: serializeStep(step) };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

export const deleteSequenceStep = async (stepId: string, sequenceId: string) => {
  await onCurrentUser();
  try {
    await client.dmSequenceStep.delete({ where: { id: stepId } });
    // Re-number remaining steps
    const remaining = await client.dmSequenceStep.findMany({
      where: { sequenceId },
      orderBy: { stepOrder: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      await client.dmSequenceStep.update({
        where: { id: remaining[i].id },
        data: { stepOrder: i },
      });
    }
    return { status: 200 };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

// ─── Enrollment stats ─────────────────────────────────────────────────────────

export const getSequenceEnrollments = async (sequenceId: string) => {
  await onCurrentUser();
  try {
    const enrollments = await client.sequenceEnrollment.findMany({
      where: { sequenceId },
      orderBy: { enrolledAt: "desc" },
      take: 50,
      select: {
        id: true,
        contactIgId: true,
        nextStepOrder: true,
        completed: true,
        capturedEmail: true,
        enrolledAt: true,
      },
    });
    return {
      status: 200,
      data: enrollments.map((e) => ({
        ...e,
        enrolledAt: e.enrolledAt.toISOString(),
      })),
    };
  } catch (err: any) {
    return { status: 500, data: [] };
  }
};
