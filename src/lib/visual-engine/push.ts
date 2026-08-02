import { createCipheriv, createDecipheriv, randomBytes } from "crypto"
import webpush from "web-push"
import { db } from "@/lib/db"

type BrowserPushSubscription = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

const MIRAVA_PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_MIRAVA_PUSH_PUBLIC_KEY

function encryptionKey(): Buffer | null {
  const encoded = process.env.MIRAVA_PUSH_ENCRYPTION_KEY
  if (!encoded) return null
  const key = Buffer.from(encoded, "base64")
  return key.length === 32 ? key : null
}

export function isMiravaPushConfigured(): boolean {
  return Boolean(
    encryptionKey() &&
    MIRAVA_PUSH_PUBLIC_KEY &&
    process.env.MIRAVA_PUSH_PRIVATE_KEY &&
    process.env.MIRAVA_PUSH_SUBJECT
  )
}

function encrypt(subscription: BrowserPushSubscription): string {
  const key = encryptionKey()
  if (!key) throw new Error("MIRAVA_PUSH_ENCRYPTION_KEY is not configured")
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(subscription), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${body.toString("base64url")}`
}

function decrypt(payload: string): BrowserPushSubscription {
  const key = encryptionKey()
  if (!key) throw new Error("MIRAVA_PUSH_ENCRYPTION_KEY is not configured")
  const [iv, tag, body] = payload.split(".")
  if (!iv || !tag || !body) throw new Error("Invalid push subscription payload")
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8")) as BrowserPushSubscription
}

export async function saveMiravaPushSubscription(userId: string, subscription: BrowserPushSubscription, locale: "fr" | "es") {
  if (!isMiravaPushConfigured()) throw new Error("MIRAVA push is not configured")
  if (!subscription.endpoint.startsWith("https://") || !subscription.keys.p256dh || !subscription.keys.auth) {
    throw new Error("Invalid push subscription")
  }
  const existing = await db.studioPushSubscription.findUnique({ where: { endpoint: subscription.endpoint } })
  const data = { userId, endpoint: subscription.endpoint, encryptedPayload: encrypt(subscription), locale }
  if (existing) return db.studioPushSubscription.update({ where: { id: existing.id }, data })
  return db.studioPushSubscription.create({ data })
}

export async function removeMiravaPushSubscription(userId: string, endpoint: string): Promise<void> {
  const record = await db.studioPushSubscription.findUnique({ where: { endpoint, userId } })
  if (record) await db.studioPushSubscription.delete({ where: { id: record.id, userId } })
}

export async function notifyMiravaCreationReady(userId: string, _creationId: string): Promise<void> {
  if (!isMiravaPushConfigured()) return
  webpush.setVapidDetails(
    process.env.MIRAVA_PUSH_SUBJECT!,
    MIRAVA_PUSH_PUBLIC_KEY!,
    process.env.MIRAVA_PUSH_PRIVATE_KEY!
  )
  const subscriptions = await db.studioPushSubscription.findMany({ where: { userId } })
  await Promise.all(subscriptions.map(async (record: { id: string; encryptedPayload: string; locale: string }) => {
    try {
      const body = record.locale === "es" ? "Tu creación está lista" : "Votre création est prête"
      await webpush.sendNotification(
        decrypt(record.encryptedPayload),
        // Push content must remain generic even on a locked screen. Do not
        // include a creation id, image URL, direction or identity data.
        JSON.stringify({ title: "MIRAVA Studio", body, locale: record.locale === "es" ? "es" : "fr", url: "/visual-engine/studio" }),
        { TTL: 60 }
      )
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0
      if (statusCode === 404 || statusCode === 410) await db.studioPushSubscription.delete({ where: { id: record.id } })
    }
  }))
}
