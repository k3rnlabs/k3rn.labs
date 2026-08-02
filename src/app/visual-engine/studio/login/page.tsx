"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, ArrowRight, Camera, Mail } from "lucide-react"
import { MiravaWordmark } from "@/components/mirava/mirava-wordmark"
import { MiravaGrain } from "@/components/mirava/mirava-grain"
import { useMiravaLocale } from "@/components/mirava/mirava-locale"
import { translateAuthError } from "@/lib/auth-errors"

type Mode = "login" | "signup" | "forgot"

function getStudioDestination(next: string | null) {
  if (!next?.startsWith("/")) return "/visual-engine/studio"

  // We only restore the Studio root plus its query/hash state. This keeps the
  // chosen creation context (e.g. ?source=reference) without accepting a
  // look-alike internal path such as /visual-engine/studio-anything.
  const pathname = next.split(/[?#]/, 1)[0]
  return pathname === "/visual-engine/studio" ? next : "/visual-engine/studio"
}

const copy = {
  fr: {
    login: "Connexion",
    signup: "Créer un compte",
    forgot: "Mot de passe oublié",
    loginSubtitle: "Retrouvez votre studio et vos créations.",
    signupSubtitle: "Créez votre accès MIRAVA Studio.",
    forgotSubtitle: "Recevez un lien pour réinitialiser votre mot de passe.",
    email: "Email",
    emailPlaceholder: "vous@example.com",
    password: "Mot de passe",
    passwordPlaceholder: "••••••••",
    passwordNewPlaceholder: "6 caractères minimum",
    confirmPassword: "Confirmer le mot de passe",
    confirmPlaceholder: "Répétez le mot de passe",
    forgotLink: "Mot de passe oublié ?",
    submitLogin: "Accéder au Studio",
    submitSignup: "Créer mon accès",
    submitForgot: "Envoyer le lien",
    loadingLogin: "Connexion…",
    loadingSignup: "Création…",
    loadingForgot: "Envoi…",
    backToLogin: "← Retour à la connexion",
    signupSuccess: "Compte créé — vérifiez votre email pour confirmer.",
    passwordShort: "Le mot de passe doit contenir au moins 6 caractères.",
    passwordMismatch: "Les mots de passe ne correspondent pas.",
    emailInvalid: "Saisissez une adresse email valide.",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    offer: "3 créations offertes à l'activation",
    eyebrow: "ÉNERGIE ÉDITORIALE · IDENTITÉ PRÉSERVÉE",
    foot: "Votre studio éditorial personnel.",
    resendLink: "Renvoyer l'email de confirmation",
    resendLoading: "Renvoi de l'email…",
  },
  es: {
    login: "Conexión",
    signup: "Crear una cuenta",
    forgot: "Contraseña olvidada",
    loginSubtitle: "Vuelve a tu estudio y tus creaciones.",
    signupSubtitle: "Crea tu acceso a MIRAVA Studio.",
    forgotSubtitle: "Recibe un enlace para restablecer tu contraseña.",
    email: "Email",
    emailPlaceholder: "tu@ejemplo.com",
    password: "Contraseña",
    passwordPlaceholder: "••••••••",
    passwordNewPlaceholder: "Mínimo 6 caracteres",
    confirmPassword: "Confirmar contraseña",
    confirmPlaceholder: "Repite la contraseña",
    forgotLink: "¿Olvidaste tu contraseña?",
    submitLogin: "Acceder al Estudio",
    submitSignup: "Crear mi acceso",
    submitForgot: "Enviar el enlace",
    loadingLogin: "Conectando…",
    loadingSignup: "Creando…",
    loadingForgot: "Enviando…",
    backToLogin: "← Volver al inicio de sesión",
    signupSuccess: "Cuenta creada — revisa tu correo para confirmar.",
    passwordShort: "La contraseña debe tener al menos 6 caracteres.",
    passwordMismatch: "Las contraseñas no coinciden.",
    emailInvalid: "Introduce una dirección de email válida.",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    offer: "3 creaciones incluidas al activar",
    eyebrow: "ENERGÍA EDITORIAL · IDENTIDAD PRESERVADA",
    foot: "Tu estudio editorial personal.",
    resendLink: "Reenviar correo de confirmación",
    resendLoading: "Reenviando correo…",
  },
} as const

function MiravaLoginPageContent() {
  const { locale, setLocale } = useMiravaLocale()
  const t = copy[locale]
  const router = useRouter()
  const searchParams = useSearchParams()
  const studioDestination = getStudioDestination(searchParams.get("next"))

  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  // Traduction dynamique en fonction de la langue sélectionnée (FR / ES)
  const displayedError = error ? translateAuthError(error, locale) : null
  const displayedSuccess = success ? translateAuthError(success, locale) : null

  // Affichage du bouton de renvoi uniquement si un envoi a été effectué ou une alerte de confirmation est active
  const showResendButton = Boolean(
    (success && (success.includes("Compte créé") || success.includes("resend") || success.includes("confirm"))) ||
    (error && (
      error.includes("confirm") ||
      error.includes("registered") ||
      error.includes("already") ||
      error.includes("exists") ||
      error.includes("resend")
    ))
  )

  async function handleResendEmail() {
    setError(null)
    setSuccess(null)
    if (!email.trim()) {
      setError("resend_email_required")
      return
    }
    setResending(true)
    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Échec du renvoi de l'email.")
      }
      setSuccess("resend_success")
    } catch (err) {
      setError(err instanceof Error ? err.message : null)
    } finally {
      setResending(false)
    }
  }

  // Capture des paramètres d'URL (confirmation email / erreurs)
  useEffect(() => {
    const errParam = searchParams.get("error")
    const confirmedParam = searchParams.get("confirmed")
    if (errParam) {
      setError(errParam)
    } else if (confirmedParam === "true") {
      setSuccess("email_confirmed")
    }
  }, [searchParams])

  // Redirect silently if already authenticated
  useEffect(() => {
    fetch("/api/visual-engine/account", { cache: "no-store" })
      .then((res) => { if (res.ok) router.replace(studioDestination) })
      .catch(() => { /* not logged in — stay on page */ })
  }, [router, studioDestination])

  function reset() {
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

    const normalizedEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(t.emailInvalid)
      return
    }

    if (mode === "signup") {
      if (password.length < 6) { setError("passwordShort"); return }
      if (password !== confirmPassword) { setError("passwordMismatch"); return }
    }

    setLoading(true)
    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const errMsg = data?.error || data?.message || (typeof data?.details === "string" ? data.details : null) || "Échec de la connexion. Vérifiez vos identifiants."
          throw new Error(errMsg)
        }
        router.push(studioDestination)
        router.refresh()
      } else if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const errMsg = data?.error || data?.message || (typeof data?.details === "string" ? data.details : null) || "Échec de l'inscription. Vérifiez vos informations."
          throw new Error(errMsg)
        }
        if (data?.session || data?.autoConfirmed) {
          router.push(studioDestination)
          router.refresh()
          return
        }
        setSuccess("Compte créé — vérifiez votre email pour confirmer.")
        setMode("login")
        setPassword("")
        setConfirmPassword("")
      } else if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const errMsg = data?.error || data?.message || (typeof data?.details === "string" ? data.details : null) || "Échec de l'envoi du lien."
          throw new Error(errMsg)
        }
        setSuccess(data?.message ?? "Si un compte est associé à cet email, un lien vient d'être envoyé.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : null)
    } finally {
      setLoading(false)
    }
  }

  const heading = mode === "login" ? t.login : mode === "signup" ? t.signup : t.forgot
  const subtitle = mode === "login" ? t.loginSubtitle : mode === "signup" ? t.signupSubtitle : t.forgotSubtitle

  return (
    <main className="mirava-theme flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-mirava-canvas text-mirava-ink">
      <MiravaGrain />
      <div className="mirava-ambient pointer-events-none fixed inset-0" />

      {/* Top bar */}
      <nav className="relative z-20 flex min-w-0 items-center justify-between gap-3 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:px-8">
        <Link href="/visual-engine" aria-label={locale === "fr" ? "Accueil MIRAVA Studio" : "Inicio MIRAVA Studio"} className="min-w-0 shrink">
          <MiravaWordmark className="max-w-full" />
        </Link>
        <button
          aria-label={locale === "fr" ? "Passer en espagnol" : "Cambiar al francés"}
          onClick={() => setLocale(locale === "fr" ? "es" : "fr")}
          className="mirava-button mirava-button-secondary min-w-12 px-3 text-xs"
        >
          {locale.toUpperCase()}
        </button>
      </nav>

      {/* Centered form */}
      <div className="relative z-10 flex min-w-0 flex-1 items-center justify-center overflow-x-clip px-5 pb-28 pt-8 sm:py-16">
        <div className="min-w-0 w-full max-w-sm [overflow-wrap:anywhere]">

          <p className="mirava-label mb-6 flex items-center gap-2">
            <Camera className="h-3.5 w-3.5" />
            {t.eyebrow}
          </p>

          <h1 className="mirava-section-title text-4xl sm:text-5xl">{heading}</h1>
          <p className="mirava-copy mt-3 text-sm leading-6">{subtitle}</p>

          {mode !== "forgot" && (
            <div className="mt-8 grid min-w-0 grid-cols-2 gap-1 rounded-[14px] border border-mirava-line bg-mirava-canvas-raised p-1">
              {(["login", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); reset() }}
                  className={`min-w-0 w-full rounded-[10px] px-2 py-2 text-center text-xs font-semibold font-jakarta transition-all duration-150 ${
                    mode === m
                      ? "bg-mirava-surface-raised text-mirava-ink"
                      : "text-mirava-ink-muted hover:text-mirava-ink-secondary"
                  }`}
                >
                  {m === "login" ? t.login : t.signup}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="mirava-email" className="block text-xs font-semibold font-jakarta mb-2 text-mirava-ink-secondary">
                {t.email}
              </label>
              <input
                id="mirava-email"
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error && error !== "passwordMismatch" && error !== "passwordShort") setError(null)
                }}
                required
                disabled={loading}
                autoComplete="email"
                className="mirava-input w-full px-4 py-3"
              />
            </div>

            {/* Password */}
            {mode !== "forgot" && (
              <div>
                <div className="mb-2 flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-x-3">
                  <label htmlFor="mirava-password" className="text-xs font-semibold font-jakarta text-mirava-ink-secondary">
                    {t.password}
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); reset() }}
                      className="min-h-11 -ml-2 px-2 text-left text-[11px] text-mirava-ink-muted transition-colors hover:text-mirava-ink sm:min-h-0 sm:-mr-2 sm:ml-0"
                    >
                      {t.forgotLink}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="mirava-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "signup" ? t.passwordNewPlaceholder : t.passwordPlaceholder}
                    value={password}
                    onChange={(e) => {
                      const val = e.target.value
                      setPassword(val)
                      if (error === "passwordMismatch" && val === confirmPassword) setError(null)
                      else if (error === "passwordShort" && val.length >= 6) setError(null)
                    }}
                    required
                    disabled={loading}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    className="mirava-input w-full px-4 py-3 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t.hidePassword : t.showPassword}
                    className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-mirava-ink-muted transition-colors hover:text-mirava-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mirava-accent"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm */}
            {mode === "signup" && (
              <div>
                <label htmlFor="mirava-confirm" className="block text-xs font-semibold font-jakarta mb-2 text-mirava-ink-secondary">
                  {t.confirmPassword}
                </label>
                <div className="relative">
                  <input
                    id="mirava-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t.confirmPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => {
                      const val = e.target.value
                      setConfirmPassword(val)
                      if (error === "passwordMismatch" && val === password) setError(null)
                    }}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    minLength={6}
                    className="mirava-input w-full px-4 py-3 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? t.hidePassword : t.showPassword}
                    className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-mirava-ink-muted transition-colors hover:text-mirava-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mirava-accent"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {displayedError && (
              <div role="alert" className="mirava-alert px-4 py-3 text-sm">{displayedError}</div>
            )}
            {displayedSuccess && (
              <div className="mirava-notice px-4 py-3 text-sm">{displayedSuccess}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mirava-button mirava-button-primary w-full gap-2 px-5 text-sm mt-2"
            >
              {loading
                ? (mode === "login" ? t.loadingLogin : mode === "signup" ? t.loadingSignup : t.loadingForgot)
                : (mode === "login" ? t.submitLogin : mode === "signup" ? t.submitSignup : t.submitForgot)}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            {showResendButton && (
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resending || loading}
                className="mirava-button mirava-button-secondary w-full gap-2 px-4 py-2.5 text-xs mt-3"
              >
                <Mail className="h-3.5 w-3.5" />
                {resending ? t.resendLoading : t.resendLink}
              </button>
            )}
          </form>

          {mode === "forgot" && (
            <div className="mt-6 border-t border-mirava-line pt-5 text-center text-xs text-mirava-ink-muted">
              <button
                type="button"
                onClick={() => { setMode("login"); reset() }}
                className="text-mirava-ink-secondary hover:text-mirava-ink transition-colors"
              >
                {t.backToLogin}
              </button>
            </div>
          )}

          {mode === "signup" && (
            <p className="mt-4 text-center text-[11px] text-mirava-ink-muted">{t.offer}</p>
          )}
        </div>
      </div>

      <footer className="relative z-10 px-5 py-5 text-center text-[11px] text-mirava-ink-muted">
        MIRAVA Studio · {t.foot}
      </footer>
    </main>
  )
}

export default function MiravaLoginPage() {
  return (
    <Suspense fallback={null}>
      <MiravaLoginPageContent />
    </Suspense>
  )
}
