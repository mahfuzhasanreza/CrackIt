"use server";

import { formFields, invalidState, toActionState } from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";

import { requireUser } from "../auth/dal";

import { OUTCOME_LABEL, STATUS_LABEL } from "./labels";
import * as service from "./service";
import {
  applicationFormSchema,
  deleteSchema,
  interviewFormSchema,
  mockFormSchema,
  moveSchema,
  organizationFormSchema,
  outcomeSchema,
} from "./validators";

export async function saveApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = applicationFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveApplication(user, parsed.data),
    parsed.data.id ? "Application saved" : "Application added",
  );
}

export async function moveApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = moveSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  const result = await service.moveApplication(user, parsed.data.id, parsed.data.status);
  return toActionState(
    result,
    result.ok && result.data.changed ? `Moved to ${STATUS_LABEL[parsed.data.status]}` : undefined,
  );
}

export async function saveOrganizationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = organizationFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.saveOrganization(user.id, parsed.data), "Organization saved");
}

export async function saveInterviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = interviewFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  const result = await service.saveInterview(user, parsed.data);
  const moved = result.ok && result.data.movedTo;
  return toActionState(
    result,
    parsed.data.id
      ? "Interview saved"
      : !parsed.data.applicationId
        ? "Interview added, with a new application"
        : moved
          ? `Interview added; application moved to ${STATUS_LABEL[moved]}`
          : "Interview added",
  );
}

export async function setInterviewOutcomeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = outcomeSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.setInterviewOutcome(user, parsed.data),
    `Marked as ${OUTCOME_LABEL[parsed.data.outcome].toLowerCase()}`,
  );
}

export async function saveMockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = mockFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveMock(user, parsed.data),
    parsed.data.id
      ? "Mock interview saved"
      : parsed.data.date > (await service.todayFor(user))
        ? "Mock interview scheduled"
        : "Mock interview logged",
  );
}

const DELETED = {
  application: "Application",
  organization: "Organization",
  interview: "Interview",
  mock: "Mock interview",
};

export async function deleteJobRecordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.deleteRecord(user.id, parsed.data.kind, parsed.data.id),
    `${DELETED[parsed.data.kind]} deleted`,
  );
}
