import { describe, expect, it } from "vitest"
import type { Expert, Pole, PoleSession } from "@prisma/client"
import { publicExpert, publicPole, publicPoleSession } from "@/lib/public-dto"

const pole = {
  id: "pole-1",
  code: "P01_STRATEGIE",
  managerName: "AXEL",
  managerSlug: "axel",
  systemPrompt: "PRIVATE_POLE_PROMPT",
  hashtagTriggers: [],
  activePriorityLabs: [],
  n8nWorkflowId: null,
  n8nWebhookUrl: null,
  createdAt: new Date(),
} as Pole

describe("public database DTOs", () => {
  it("never serializes pole or expert system prompts", () => {
    const expert = {
      id: "expert-1",
      name: "Expert",
      slug: "expert",
      lab: "DISCOVERY",
      poleId: pole.id,
      systemPrompt: "PRIVATE_EXPERT_PROMPT",
      requiredCardTypes: [],
      blocksLabTransition: false,
    } as Expert

    const serializedPole = JSON.stringify(
      publicPole({ ...pole, experts: [expert] })
    )

    expect(serializedPole).not.toContain("PRIVATE_POLE_PROMPT")
    expect(serializedPole).not.toContain("PRIVATE_EXPERT_PROMPT")
    expect(publicPole(pole)).not.toHaveProperty("systemPrompt")
    expect(publicExpert(expert)).not.toHaveProperty("systemPrompt")
  })

  it("removes the joined dossier and private pole fields from sessions", () => {
    const session = {
      id: "session-1",
      poleId: pole.id,
      dossierId: "dossier-1",
      missionId: null,
      labAtCreation: "DISCOVERY",
      messages: [],
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
      pole,
      dossier: {
        id: "dossier-1",
        onboardingMessages: [{ content: "PRIVATE_DOSSIER_DATA" }],
      },
    } as unknown as PoleSession & { pole: Pole }

    const dto = publicPoleSession(session)
    const serialized = JSON.stringify(dto)

    expect(serialized).not.toContain("PRIVATE_POLE_PROMPT")
    expect(serialized).not.toContain("PRIVATE_DOSSIER_DATA")
    expect(dto).not.toHaveProperty("dossier")
  })
})
