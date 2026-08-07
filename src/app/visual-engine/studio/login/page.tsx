"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useReducedMotion } from "framer-motion"
import { Eye, EyeOff, ArrowRight, Camera, Mail } from "lucide-react"
import { MiravaWordmark } from "@/components/mirava/mirava-wordmark"
import { Header } from "@/components/ui/header-2"
import { MiravaGrain } from "@/components/mirava/mirava-grain"
import { Grainient } from "@/components/mirava/grainient"
import { BlurText } from "@/components/mirava/blur-text"
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
  const reduceMotion = useReducedMotion()
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
          body: JSON.stringify({
            email:
              normalizedEmail,
            password,
            locale,
          }),
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
    <main className="mirava-theme relative isolate flex min-h-svh min-w-0 flex-col overflow-x-hidden bg-[#070807] text-white">
      <MiravaGrain />

      <div
        aria-hidden="true"
        data-mirava-auth-background
        className="pointer-events-none overflow-hidden"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100svh",
          zIndex: 0,
        }}
      >
        <div
          aria-hidden="true"
          data-mirava-auth-background-fallback
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 72% 14%, rgba(180,154,104,0.14), transparent 34%), radial-gradient(circle at 18% 72%, rgba(107,81,48,0.10), transparent 40%), #070807",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_14%,rgba(180,154,104,0.24),transparent_32%),radial-gradient(circle_at_18%_72%,rgba(107,81,48,0.16),transparent_38%),#070807]" />

        <Grainient
          className="absolute inset-0 h-full w-full opacity-[0.72]"
          color1="#b49a68"
          color2="#171915"
          color3="#6b5130"
          timeSpeed={0.72}
          colorBalance={-0.12}
          warpStrength={1.75}
          warpFrequency={5.6}
          warpSpeed={1.25}
          warpAmplitude={30}
          blendAngle={-14}
          blendSoftness={0.16}
          rotationAmount={620}
          noiseScale={1.35}
          grainAmount={0.035}
          grainScale={1.8}
          grainAnimated={false}
          contrast={1.35}
          gamma={1}
          saturation={0.82}
          centerX={-0.12}
          centerY={0.03}
          zoom={1.08}
          animated={!reduceMotion}
        />

        <div
          aria-hidden="true"
          data-mirava-auth-dots
          className="absolute inset-0 z-[1] opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.82) 0.55px, transparent 0.8px)",
            backgroundSize:
              "5px 5px",
          }}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 z-[2] bg-black/34"
        />
      </div>

      <Header
        className="relative z-30"
        brand={
          <Link
            href="/visual-engine"
            aria-label={
              locale === "fr"
                ? "Accueil MIRAVA Studio"
                : "Inicio MIRAVA Studio"
            }
            className="mirava-button mirava-button-quiet min-h-12 px-1"
          >
            <MiravaWordmark />
          </Link>
        }
        actions={
          <button
            aria-label={
              locale === "fr"
                ? "Passer en espagnol"
                : "Cambiar al français"
            }
            onClick={() =>
              setLocale(
                locale === "fr"
                  ? "es"
                  : "fr",
              )
            }
            className="mirava-button mirava-button-secondary min-w-12 px-3 text-xs"
          >
            {locale.toUpperCase()}
          </button>
        }
      />

      <div className="relative z-20 flex flex-1 items-start justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[clamp(3rem,8dvh,6rem)] sm:px-6 sm:pb-10 sm:pt-[clamp(3rem,8dvh,6rem)]">
        <section
          data-mirava-auth-card
          className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/[0.58] shadow-[0_24px_80px_rgba(0,0,0,0.52)] backdrop-blur-xl"
        >
          <div className="border-b border-white/10 px-5 pb-6 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
            <h1 className="mirava-section-title text-4xl sm:text-5xl">
              <BlurText
                text={
                  mode === "signup"
                    ? locale === "fr"
                      ? "Créer un compte"
                      : "Crear una cuenta"
                    : mode === "forgot"
                      ? locale === "fr"
                        ? "Mot de passe oublié"
                        : "Contraseña olvidada"
                      : locale === "fr"
                        ? "Connexion"
                        : "Conexión"
                }
              />
            </h1>

            <p className="mirava-copy mt-3 max-w-sm text-[13px] leading-5 text-white/60 sm:text-sm sm:leading-6">
              {locale === "fr"
                ? "Retrouver votre studio et vos créations."
                : "Recupera tu estudio y tus creaciones."}
            </p>
          </div>

          <div className="px-5 py-5 sm:px-7 sm:py-6">
            {mode !== "forgot" ? (
              <div className="grid grid-cols-2 gap-1 rounded-[1rem] border border-white/10 bg-white/[0.025] p-1">
                {(["login", "signup"] as Mode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMode(item)
                      reset()
                    }}
                    aria-pressed={mode === item}
                    className={`min-h-11 rounded-[0.82rem] px-3 text-[13px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#d7c39a]/55 sm:px-4 sm:text-sm ${
                      mode === item
                        ? "bg-white text-[#101110] shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
                        : "text-white/58 hover:text-white"
                    }`}
                  >
                    {item === "login"
                      ? locale === "fr"
                        ? "Connexion"
                        : "Conexión"
                      : locale === "fr"
                        ? "Créer un compte"
                        : "Crear una cuenta"}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("login")
                  reset()
                }}
                className="mb-2 min-h-10 text-xs font-semibold text-white/56 transition hover:text-white"
              >
                {t.backToLogin}
              </button>
            )}

            <form
              id="mirava-auth-form"
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
              noValidate
            >
              <div>
                <label
                  htmlFor="mirava-email"
                  className="mb-2 block font-jakarta text-xs font-semibold text-white/72"
                >
                  {locale === "fr" ? "Email" : "Email"}
                </label>

                <input
                  id="mirava-email"
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (
                      error &&
                      error !== "passwordMismatch" &&
                      error !== "passwordShort"
                    ) {
                      setError(null)
                    }
                  }}
                  required
                  disabled={loading}
                  autoComplete="email"
                  className="mirava-input min-h-14 w-full rounded-[1rem] border-white/12 bg-white/[0.045] px-4 py-3 text-white placeholder:text-white/28"
                />
              </div>

              {mode !== "forgot" ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="mirava-password"
                      className="font-jakarta text-xs font-semibold text-white/72"
                    >
                      {locale === "fr" ? "Mot de passe" : t.password}
                    </label>

                    {mode === "login" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot")
                          reset()
                        }}
                        className="min-h-8 text-[11px] text-white/48 transition hover:text-white"
                      >
                        {t.forgotLink}
                      </button>
                    ) : null}
                  </div>

                  <div className="relative">
                    <input
                      id="mirava-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        mode === "signup"
                          ? t.passwordNewPlaceholder
                          : t.passwordPlaceholder
                      }
                      value={password}
                      onChange={(event) => {
                        const value = event.target.value
                        setPassword(value)

                        if (
                          error === "passwordMismatch" &&
                          value === confirmPassword
                        ) {
                          setError(null)
                        } else if (
                          error === "passwordShort" &&
                          value.length >= 6
                        ) {
                          setError(null)
                        }
                      }}
                      required
                      disabled={loading}
                      autoComplete={
                        mode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      minLength={6}
                      className="mirava-input min-h-14 w-full rounded-[1rem] border-white/12 bg-white/[0.045] px-4 py-3 pr-12 text-white placeholder:text-white/28"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      aria-label={
                        showPassword
                          ? t.hidePassword
                          : t.showPassword
                      }
                      className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-white/48 transition hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              {mode === "signup" ? (
                <div>
                  <label
                    htmlFor="mirava-confirm"
                    className="mb-2 block font-jakarta text-xs font-semibold text-white/72"
                  >
                    {t.confirmPassword}
                  </label>

                  <div className="relative">
                    <input
                      id="mirava-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t.confirmPlaceholder}
                      value={confirmPassword}
                      onChange={(event) => {
                        const value = event.target.value
                        setConfirmPassword(value)

                        if (
                          error === "passwordMismatch" &&
                          value === password
                        ) {
                          setError(null)
                        }
                      }}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                      minLength={6}
                      className="mirava-input min-h-14 w-full rounded-[1rem] border-white/12 bg-white/[0.045] px-4 py-3 pr-12 text-white placeholder:text-white/28"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword
                          ? t.hidePassword
                          : t.showPassword
                      }
                      className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-white/48 transition hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              {displayedError ? (
                <div
                  role="alert"
                  className="mirava-alert rounded-[1rem] px-4 py-3 text-sm"
                >
                  {displayedError}
                </div>
              ) : null}

              {displayedSuccess ? (
                <div
                  role="status"
                  className="mirava-notice rounded-[1rem] px-4 py-3 text-sm"
                >
                  {displayedSuccess}
                </div>
              ) : null}

              {showResendButton ? (
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resending || loading}
                  className="mirava-button mirava-button-secondary min-h-11 w-full gap-2 rounded-[1rem] px-4 text-xs"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {resending ? t.resendLoading : t.resendLink}
                </button>
              ) : null}
            </form>
          </div>

          <div className="border-t border-white/10 px-5 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
            <button
              type="submit"
              form="mirava-auth-form"
              disabled={loading}
              aria-busy={loading}
              data-mirava-auth-cta
              className="group relative isolate flex min-h-14 w-full items-center justify-between overflow-hidden rounded-[1rem] border border-[#f2eadc]/90 bg-[linear-gradient(135deg,#fffaf0_0%,#eee4d3_58%,#d8c3a0_100%)] px-3 pl-5 text-left text-[#0b0c0b] shadow-[0_12px_30px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#d7c39a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0b0a] active:translate-y-0 active:scale-[0.985] disabled:cursor-wait disabled:opacity-100 disabled:border-[#f2eadc]/90 disabled:bg-[linear-gradient(135deg,#fffaf0_0%,#eee4d3_58%,#d8c3a0_100%)] disabled:text-[#0b0c0b]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.82),transparent_34%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.2)_45%,transparent_72%)] opacity-80"
              />

              <span className="relative z-10 min-w-0 flex-1 font-jakarta text-[15px] font-semibold tracking-[-0.025em]">
                {loading
                  ? mode === "login"
                    ? t.loadingLogin
                    : mode === "signup"
                      ? t.loadingSignup
                      : t.loadingForgot
                  : locale === "fr"
                    ? "Accéder au studio"
                    : "Acceder al estudio"}
              </span>

              <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-[0.75rem] border border-black/10 bg-black/[0.07]">
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          </div>
        </section>
      </div>
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
