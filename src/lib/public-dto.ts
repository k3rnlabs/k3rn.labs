import type { Expert, Pole, PoleSession } from "@prisma/client"

type PublicPoleRelations = {
  _count?: { experts: number; sessions: number }
  experts?: Array<Pick<Expert, "id" | "name" | "slug" | "lab">>
}

export function publicPole(pole: Pole & PublicPoleRelations) {
  return {
    id: pole.id,
    code: pole.code,
    managerName: pole.managerName,
    managerSlug: pole.managerSlug,
    hashtagTriggers: pole.hashtagTriggers,
    activePriorityLabs: pole.activePriorityLabs,
    ...(pole.experts
      ? {
          experts: pole.experts.map(({ id, name, slug, lab }) => ({
            id,
            name,
            slug,
            lab,
          })),
        }
      : {}),
    ...(pole._count ? { _count: pole._count } : {}),
  }
}

export function publicExpert(expert: Expert) {
  return {
    id: expert.id,
    name: expert.name,
    slug: expert.slug,
    lab: expert.lab,
    poleId: expert.poleId,
    requiredCardTypes: expert.requiredCardTypes,
    blocksLabTransition: expert.blocksLabTransition,
  }
}

export function publicPoleSession(
  session: PoleSession & { pole: Pole }
) {
  return {
    id: session.id,
    poleId: session.poleId,
    dossierId: session.dossierId,
    missionId: session.missionId,
    labAtCreation: session.labAtCreation,
    messages: session.messages,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    pole: publicPole(session.pole),
  }
}
