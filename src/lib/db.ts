import { randomUUID } from "crypto"
import { supabaseAdmin } from "./supabase-admin"

function newId(): string {
  return randomUUID()
}

type IncludeSpec =
  | true
  | {
    where?: Record<string, unknown>
    orderBy?: Record<string, "asc" | "desc">
    take?: number
    include?: Record<string, IncludeSpec>
    select?: Record<string, boolean>
  }

const RELATIONS: Record<
  string,
  Record<string, { table: string; fk: string; selfFk?: string; type: "hasOne" | "hasMany" | "belongsTo" }>
> = {
  Dossier: {
    labState: { table: "LabState", fk: "dossierId", type: "hasOne" },
    subFolders: { table: "SubFolder", fk: "dossierId", type: "hasMany" },
    cards: { table: "Card", fk: "dossierId", type: "hasMany" },
    exportRecord: { table: "ExportRecord", fk: "dossierId", type: "hasOne" },
    crowdfundingCampaign: { table: "CrowdfundingCampaign", fk: "dossierId", type: "hasOne" },
    scoreSnapshots: { table: "ScoreSnapshot", fk: "dossierId", type: "hasMany" },
    expertSessions: { table: "ExpertSession", fk: "dossierId", type: "hasMany" },
    auditLogs: { table: "AuditLog", fk: "dossierId", type: "hasMany" },
  },
  SubFolder: {
    dossier: { table: "Dossier", fk: "dossierId", selfFk: "dossierId", type: "belongsTo" },
    cards: { table: "Card", fk: "subFolderId", type: "hasMany" },
    canvasNodes: { table: "CanvasNode", fk: "subFolderId", type: "hasMany" },
    canvasEdges: { table: "CanvasEdge", fk: "subFolderId", type: "hasMany" },
  },
  Card: {
    subFolder: { table: "SubFolder", fk: "subFolderId", selfFk: "subFolderId", type: "belongsTo" },
    dossier: { table: "Dossier", fk: "dossierId", selfFk: "dossierId", type: "belongsTo" },
    transitionLogs: { table: "CardTransitionLog", fk: "cardId", type: "hasMany" },
    expertSessions: { table: "ExpertSession", fk: "cardId", type: "hasMany" },
    outgoingRelations: { table: "CardRelation", fk: "fromCardId", type: "hasMany" },
    incomingRelations: { table: "CardRelation", fk: "toCardId", type: "hasMany" },
  },
  CardRelation: {
    fromCard: { table: "Card", fk: "fromCardId", selfFk: "fromCardId", type: "belongsTo" },
    toCard: { table: "Card", fk: "toCardId", selfFk: "toCardId", type: "belongsTo" },
  },
  LabState: {
    dossier: { table: "Dossier", fk: "dossierId", selfFk: "dossierId", type: "belongsTo" },
    expertSessions: { table: "ExpertSession", fk: "labStateId", type: "hasMany" },
  },
  Expert: {
    sessions: { table: "ExpertSession", fk: "expertId", type: "hasMany" },
  },
  ExpertSession: {
    expert: { table: "Expert", fk: "expertId", selfFk: "expertId", type: "belongsTo" },
    dossier: { table: "Dossier", fk: "dossierId", selfFk: "dossierId", type: "belongsTo" },
    card: { table: "Card", fk: "cardId", selfFk: "cardId", type: "belongsTo" },
    labState: { table: "LabState", fk: "labStateId", selfFk: "labStateId", type: "belongsTo" },
  },
  Pole: {
    experts: { table: "Expert", fk: "poleId", type: "hasMany" },
    sessions: { table: "PoleSession", fk: "poleId", type: "hasMany" },
  },
  PoleSession: {
    pole: { table: "Pole", fk: "poleId", selfFk: "poleId", type: "belongsTo" },
    dossier: { table: "Dossier", fk: "dossierId", selfFk: "dossierId", type: "belongsTo" },
  },
  CrowdfundingCampaign: {
    investments: { table: "Investment", fk: "campaignId", type: "hasMany" },
    dossier: { table: "Dossier", fk: "dossierId", selfFk: "dossierId", type: "belongsTo" },
  },
  User: {
    dossiers: { table: "Dossier", fk: "ownerId", type: "hasMany" },
    studioCreations: { table: "StudioCreation", fk: "userId", type: "hasMany" },
    studioSessions: { table: "StudioSession", fk: "userId", type: "hasMany" },
    studioProfiles: { table: "StudioProfile", fk: "userId", type: "hasMany" },
    studioIdentityProfile: { table: "StudioIdentityProfile", fk: "userId", type: "hasOne" },
    studioIdentityEvaluations: { table: "StudioIdentityEvaluation", fk: "userId", type: "hasMany" },
  },
  StudioCreation: {
    user: { table: "User", fk: "userId", selfFk: "userId", type: "belongsTo" },
    dossier: { table: "Dossier", fk: "dossierId", selfFk: "dossierId", type: "belongsTo" },
    session: { table: "StudioSession", fk: "sessionId", selfFk: "sessionId", type: "belongsTo" },
    parentCreation: { table: "StudioCreation", fk: "parentCreationId", selfFk: "parentCreationId", type: "belongsTo" },
    childCreations: { table: "StudioCreation", fk: "parentCreationId", type: "hasMany" },
    assets: { table: "StudioAsset", fk: "creationId", type: "hasMany" },
    jobs: { table: "StudioJob", fk: "creationId", type: "hasMany" },
    consent: { table: "StudioConsent", fk: "creationId", type: "hasOne" },
    identityEvaluations: { table: "StudioIdentityEvaluation", fk: "creationId", type: "hasMany" },
  },
  StudioSession: {
    user: { table: "User", fk: "userId", selfFk: "userId", type: "belongsTo" },
    creations: { table: "StudioCreation", fk: "sessionId", type: "hasMany" },
    referenceCreation: { table: "StudioCreation", fk: "referenceCreationId", selfFk: "referenceCreationId", type: "belongsTo" },
    lookItems: { table: "StudioSessionLookItem", fk: "sessionId", type: "hasMany" },
  },
  StudioSessionLookItem: {
    session: { table: "StudioSession", fk: "sessionId", selfFk: "sessionId", type: "belongsTo" },
    assets: { table: "StudioSessionLookAsset", fk: "lookItemId", type: "hasMany" },
  },
  StudioSessionLookAsset: {
    lookItem: { table: "StudioSessionLookItem", fk: "lookItemId", selfFk: "lookItemId", type: "belongsTo" },
  },
  StudioProfile: {
    creations: { table: "StudioCreation", fk: "studioProfileId", type: "hasMany" },
  },
  StudioIdentityProfile: {
    assets: { table: "StudioIdentityAsset", fk: "identityProfileId", type: "hasMany" },
    manifests: { table: "StudioIdentityManifest", fk: "identityProfileId", type: "hasMany" },
    evaluations: { table: "StudioIdentityEvaluation", fk: "identityProfileId", type: "hasMany" },
    creations: { table: "StudioCreation", fk: "identityProfileId", type: "hasMany" },
  },
  Mission: {
    dossier: { table: "Dossier", fk: "dossierId", selfFk: "dossierId", type: "belongsTo" },
    poleSessions: { table: "PoleSession", fk: "missionId", type: "hasMany" },
  },
}

const TABLES_WITH_UPDATED_AT = new Set([
  "Dossier",
  "LabState",
  "Card",
  "ExpertSession",
  "CanvasNode",
  "CanvasEdge",
  "PoleSession",
  "KaelSession",
  "StudioCreation",
  "StudioSession",
  "StudioSessionLookItem",
  "StudioJob",
  "StudioCreditLot",
  "StudioCreditAllocation",
  "StudioSubscription",
  "StudioPushSubscription",
  "StudioProfile",
  "StudioIdentityProfile",
])

function applyWhere(query: any, where: Record<string, any>): any {
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue
    if (value === null) {
      query = query.is(key, null)
    } else if (typeof value === "object" && !Array.isArray(value)) {
      if ("notIn" in value) {
        query = query.not(key, "in", `(${(value.notIn as string[]).join(",")})`)
      } else if ("in" in value) {
        query = query.in(key, value.in as string[])
      } else if ("gte" in value) {
        query = query.gte(key, value.gte)
      } else if ("lte" in value) {
        query = query.lte(key, value.lte)
      } else if ("gt" in value) {
        query = query.gt(key, value.gt)
      } else if ("lt" in value) {
        query = query.lt(key, value.lt)
      } else if ("contains" in value) {
        query = query.ilike(key, `%${value.contains}%`)
      }
    } else {
      query = query.eq(key, value)
    }
  }
  return query
}

async function resolveIncludes(
  tableName: string,
  record: Record<string, unknown>,
  include: Record<string, IncludeSpec>
): Promise<Record<string, unknown>> {
  if (!record) return record
  const result: Record<string, unknown> = { ...record }
  const tableRelations = RELATIONS[tableName] ?? {}

  for (const [key, spec] of Object.entries(include)) {
    if (key === "_count") {
      result._count = {}
      const countSpec = (spec as { select?: Record<string, boolean> }).select ?? {}
      for (const countKey of Object.keys(countSpec)) {
        const rel = tableRelations[countKey]
        if (!rel || rel.type === "belongsTo") {
          ; (result._count as Record<string, number>)[countKey] = 0
          continue
        }
        const { count } = await supabaseAdmin
          .from(rel.table)
          .select("*", { count: "exact", head: true })
          .eq(rel.fk, record.id as string)
          ; (result._count as Record<string, number>)[countKey] = count ?? 0
      }
      continue
    }

    const rel = tableRelations[key]
    if (!rel) continue

    const nestedInclude =
      spec !== true ? (spec as { include?: Record<string, IncludeSpec> }).include : undefined

    if (rel.type === "belongsTo") {
      const fkValue = record[rel.selfFk ?? rel.fk]
      if (!fkValue) {
        result[key] = null
        continue
      }
      const { data } = await supabaseAdmin.from(rel.table).select("*").eq("id", fkValue as string).maybeSingle()
      result[key] =
        nestedInclude && data
          ? await resolveIncludes(rel.table, data as Record<string, unknown>, nestedInclude)
          : data
    } else if (rel.type === "hasOne") {
      const { data } = await supabaseAdmin
        .from(rel.table)
        .select("*")
        .eq(rel.fk, record.id as string)
        .maybeSingle()
      result[key] =
        nestedInclude && data
          ? await resolveIncludes(rel.table, data as Record<string, unknown>, nestedInclude)
          : data
    } else {
      let q = supabaseAdmin.from(rel.table).select("*").eq(rel.fk, record.id as string)
      if (spec !== true) {
        const s = spec as {
          where?: Record<string, unknown>
          orderBy?: Record<string, "asc" | "desc">
          take?: number
        }
        if (s.where) q = applyWhere(q, s.where)
        if (s.orderBy) {
          const [ok, ov] = Object.entries(s.orderBy)[0]
          q = q.order(ok, { ascending: ov === "asc" })
        }
        if (s.take) q = q.limit(s.take)
      }
      const { data } = await q
      const items = (data ?? []) as Record<string, unknown>[]
      result[key] = nestedInclude
        ? await Promise.all(items.map((item) => resolveIncludes(rel.table, item, nestedInclude)))
        : items
    }
  }

  return result
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class DbModel {
  constructor(private tableName: string) { }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findUnique(args: {
    where: Record<string, any>
    include?: Record<string, IncludeSpec>
    select?: Record<string, boolean>
  }): Promise<any> {
    const selectStr = args.select ? Object.keys(args.select).join(",") : "*"
    let q = supabaseAdmin.from(this.tableName).select(selectStr)
    q = applyWhere(q, args.where)
    const { data, error } = await q.maybeSingle()
    if (error || !data) return null
    if (args.include) return resolveIncludes(this.tableName, data as any, args.include)
    return data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findFirst(args: {
    where: Record<string, any>
    include?: Record<string, IncludeSpec>
    select?: Record<string, boolean>
    orderBy?: Record<string, "asc" | "desc">
  }): Promise<any> {
    const selectStr = args.select ? Object.keys(args.select).join(",") : "*"
    let q = supabaseAdmin.from(this.tableName).select(selectStr)
    q = applyWhere(q, args.where)
    if (args.orderBy) {
      const [ok, ov] = Object.entries(args.orderBy)[0]
      q = q.order(ok, { ascending: ov === "asc" })
    }
    const { data, error } = await q.limit(1).maybeSingle()
    if (error || !data) return null
    if (args.include) return resolveIncludes(this.tableName, data as any, args.include)
    return data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findMany(args?: {
    where?: Record<string, any>
    include?: Record<string, IncludeSpec>
    orderBy?: Record<string, "asc" | "desc">
    take?: number
    skip?: number
  }): Promise<any[]> {
    let q = supabaseAdmin.from(this.tableName).select("*")
    if (args?.where) q = applyWhere(q, args.where)
    if (args?.orderBy) {
      const [ok, ov] = Object.entries(args.orderBy)[0]
      q = q.order(ok, { ascending: ov === "asc" })
    }
    const skip = args?.skip ?? 0
    const take = args?.take
    if (take !== undefined) {
      q = q.range(skip, skip + take - 1)
    } else if (skip > 0) {
      q = q.range(skip, skip + 9999)
    }
    const { data } = await q
    const items = (data ?? []) as any[]
    if (args?.include) {
      return Promise.all(items.map((item) => resolveIncludes(this.tableName, item, args.include!)))
    }
    return items
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(args: { data: Record<string, any> }): Promise<any> {
    const data: Record<string, any> = { id: newId(), ...args.data }
    if (TABLES_WITH_UPDATED_AT.has(this.tableName)) {
      data.updatedAt = new Date().toISOString()
    }
    const { data: created, error } = await supabaseAdmin
      .from(this.tableName)
      .insert(data)
      .select()
      .single()
    if (error) throw new Error(`DB create error on ${this.tableName}: ${error.message}`)
    return created
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createMany(args: { data: Record<string, any>[] }): Promise<{ count: number }> {
    const rows = args.data.map((d) => ({ id: newId(), ...d }))
    const { error } = await supabaseAdmin.from(this.tableName).insert(rows)
    if (error) throw new Error(`DB createMany error on ${this.tableName}: ${error.message}`)
    return { count: rows.length }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(args: { where: Record<string, any>; data: Record<string, any> }): Promise<any> {
    const updateData: Record<string, any> = { ...args.data }
    if (TABLES_WITH_UPDATED_AT.has(this.tableName)) {
      updateData.updatedAt = new Date().toISOString()
    }
    let q = supabaseAdmin.from(this.tableName).update(updateData)
    q = applyWhere(q, args.where)
    const { data, error } = await q.select().single()
    if (error) throw new Error(`DB update error on ${this.tableName}: ${error.message}`)
    return data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async upsert(args: {
    where: Record<string, any>
    create: Record<string, any>
    update: Record<string, any>
  }): Promise<any> {
    const existing = await this.findUnique({ where: args.where })
    if (existing) {
      return this.update({ where: args.where, data: args.update })
    }
    return this.create({ data: { ...args.where, ...args.create } })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async delete(args: { where: Record<string, any> }): Promise<any> {
    let q = supabaseAdmin.from(this.tableName).delete()
    q = applyWhere(q, args.where)
    const { data } = await q.select().maybeSingle()
    return data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async deleteMany(args: { where: Record<string, any> }): Promise<{ count: number }> {
    let q = supabaseAdmin.from(this.tableName).delete()
    q = applyWhere(q, args.where)
    await q
    return { count: 0 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateMany(args: { where: Record<string, any>; data: Record<string, any> }): Promise<{ count: number }> {
    const updateData: Record<string, any> = { ...args.data }
    if (TABLES_WITH_UPDATED_AT.has(this.tableName)) {
      updateData.updatedAt = new Date().toISOString()
    }
    let q = supabaseAdmin.from(this.tableName).update(updateData)
    q = applyWhere(q, args.where)
    const { data, error } = await q.select("id")
    if (error) throw new Error(`DB updateMany error on ${this.tableName}: ${error.message}`)
    return { count: data?.length ?? 0 }
  }
}

class DbClient {
  user = new DbModel("User")
  dossier = new DbModel("Dossier")
  subFolder = new DbModel("SubFolder")
  labState = new DbModel("LabState")
  card = new DbModel("Card")
  cardTransitionLog = new DbModel("CardTransitionLog")
  canvasNode = new DbModel("CanvasNode")
  canvasEdge = new DbModel("CanvasEdge")
  expert = new DbModel("Expert")
  expertSession = new DbModel("ExpertSession")
  scoreSnapshot = new DbModel("ScoreSnapshot")
  exportRecord = new DbModel("ExportRecord")
  crowdfundingCampaign = new DbModel("CrowdfundingCampaign")
  investment = new DbModel("Investment")
  auditLog = new DbModel("AuditLog")
  pole = new DbModel("Pole")
  poleSession = new DbModel("PoleSession")
  kaelSession = new DbModel("KaelSession")
  cardRelation = new DbModel("CardRelation")
  cardIngestionLog = new DbModel("CardIngestionLog")
  cardIngestionJob = new DbModel("CardIngestionJob")
  mission = new DbModel("Mission")
  autonomousMission = new DbModel("AutonomousMission")
  userNotificationSettings = new DbModel("UserNotificationSettings")
  expertDocument = new DbModel("ExpertDocument")
  task = new DbModel("Task")
  studioCreation = new DbModel("StudioCreation")
  studioSession = new DbModel("StudioSession")
  studioSessionLookItem = new DbModel("StudioSessionLookItem")
  studioSessionLookAsset = new DbModel("StudioSessionLookAsset")
  studioAsset = new DbModel("StudioAsset")
  studioConsent = new DbModel("StudioConsent")
  studioConsentEvent = new DbModel("StudioConsentEvent")
  studioJob = new DbModel("StudioJob")
  studioCreditLedger = new DbModel("StudioCreditLedger")
  studioCreditLot = new DbModel("StudioCreditLot")
  studioCreditAllocation = new DbModel("StudioCreditAllocation")
  studioSubscription = new DbModel("StudioSubscription")
  studioPushSubscription = new DbModel("StudioPushSubscription")
  studioProfile = new DbModel("StudioProfile")
  studioIdentityProfile = new DbModel("StudioIdentityProfile")
  studioIdentityAsset = new DbModel("StudioIdentityAsset")
  studioIdentityManifest = new DbModel("StudioIdentityManifest")
  studioIdentityEvaluation = new DbModel("StudioIdentityEvaluation")

  // Raw text search via Supabase textSearch (uses GIN index)
  async cardFullTextSearch(args: {
    dossierId: string
    query: string
    cardType?: string
    state?: string
    poleCode?: string
    take?: number
    skip?: number
  }): Promise<any[]> {
    let q = supabaseAdmin
      .from("Card")
      .select("id,title,content,cardType,type,state,source,poleCode,lab,dossierId,subFolderId,createdAt,updatedAt")
      .textSearch("title", args.query, { type: "websearch", config: "english" })
    // Filter by dossier: direct dossierId OR subFolderId is loaded separately
    q = q.or(`dossierId.eq.${args.dossierId}`)
    if (args.cardType) q = q.eq("cardType", args.cardType)
    if (args.state) q = q.eq("state", args.state)
    if (args.poleCode) q = q.eq("poleCode", args.poleCode)
    q = q.order("createdAt", { ascending: false })
    const skip = args.skip ?? 0
    const take = args.take ?? 50
    q = q.range(skip, skip + take - 1)
    const { data } = await q
    return data ?? []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async $transaction<T>(arg: ((tx: DbClient) => Promise<T>) | Promise<any>[]): Promise<any> {
    if (Array.isArray(arg)) {
      return Promise.all(arg) as unknown as T
    }
    return arg(this)
  }
}

export const db = new DbClient()
