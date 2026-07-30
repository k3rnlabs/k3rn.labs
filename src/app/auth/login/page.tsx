"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { translateAuthError } from "@/lib/auth-errors"

type Mode = "login" | "signup" | "forgot"

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function resetFormState() {
    setError(null)
    setSuccess(null)
    setConfirmPassword("")
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caractères.")
        return
      }
      if (password !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas.")
        return
      }
    }

    setLoading(true)
    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const errMsg = data?.error || data?.message || (typeof data?.details === "string" ? data.details : null) || "Échec de la connexion."
          throw new Error(errMsg)
        }
        router.push("/home")
        router.refresh()
      } else if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const errMsg = data?.error || data?.message || (typeof data?.details === "string" ? data.details : null) || "Échec de l'inscription."
          throw new Error(errMsg)
        }
        if (data?.session || data?.autoConfirmed) {
          router.push("/home")
          router.refresh()
          return
        }
        setSuccess("Compte créé ! Vérifie ta boîte mail (et ton dossier Spams/Indésirables). Tu peux aussi essayer de te connecter directement.")
        setMode("login")
        setPassword("")
        setConfirmPassword("")
      } else if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const errMsg = data?.error || data?.message || (typeof data?.details === "string" ? data.details : null) || "Échec de l'envoi du lien."
          throw new Error(errMsg)
        }
        setSuccess(data?.message ?? "Si un compte est associé à cet email, un lien de réinitialisation vient d'être envoyé.")
      }
    } catch (err) {
      setError(translateAuthError(err instanceof Error ? err.message : null))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + back link */}
        <div className="flex items-center justify-between mb-8">
          <Logo size="sm" />
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Retour
          </Link>
        </div>

        {/* Mode tabs (only for login / signup) */}
        {mode !== "forgot" && (
          <div className="flex items-center gap-1 w-full rounded-lg border border-border bg-muted/40 p-1 mb-6">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); resetFormState() }}
                className={cn(
                  "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>
        )}

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {mode === "login"
              ? "Bon retour"
              : mode === "signup"
              ? "Créer un compte"
              : "Mot de passe oublié ?"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Accède à ton workspace cognitif."
              : mode === "signup"
              ? "Gratuit pendant la phase beta."
              : "Saisis ton email pour recevoir un lien de réinitialisation."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="toi@startup.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {mode !== "forgot" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); resetFormState() }}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "Minimum 6 caractères" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Répète ton mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          {success && <p className="text-sm text-emerald-500 font-medium">{success}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            style={{ background: "#E84000", border: "none", color: "white" }}
          >
            {loading
              ? (mode === "login" ? "Connexion…" : mode === "signup" ? "Création…" : "Envoi…")
              : (mode === "login" ? "Accéder au workspace" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien")}
          </Button>
        </form>

        <Separator className="my-6" />

        <p className="text-center text-sm text-muted-foreground">
          {mode === "forgot" ? (
            <button
              type="button"
              onClick={() => { setMode("login"); resetFormState() }}
              className="font-medium text-foreground underline underline-offset-4 hover:opacity-80 transition-opacity"
            >
              ← Retour à la connexion
            </button>
          ) : (
            <>
              {mode === "login" ? "Pas de compte ?" : "Déjà inscrit ?"}{" "}
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); resetFormState() }}
                className="font-medium text-foreground underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                {mode === "login" ? "S'inscrire" : "Se connecter"}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
