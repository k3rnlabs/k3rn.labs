"use client"

import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  WifiOff,
} from "lucide-react"
import { MiravaMark } from "@/components/mirava/mirava-mark"
import { useMiravaLocale } from "@/components/mirava/mirava-locale"

const copy = {
  fr: {
    title: "Connexion interrompue",
    subtitle:
      "MIRAVA Studio a besoin d’une connexion active pour accéder à vos références privées et lancer une génération.",
    status: "Hors ligne",
    privacy:
      "Vos références privées, prompts et résultats ne sont jamais stockés dans le cache hors ligne.",
    retry: "Réessayer la connexion",
    back: "Retour à l’accueil",
  },
  es: {
    title: "Conexión interrumpida",
    subtitle:
      "MIRAVA Studio necesita una conexión activa para acceder a tus referencias privadas e iniciar una generación.",
    status: "Sin conexión",
    privacy:
      "Tus referencias privadas, prompts y resultados nunca se almacenan en la caché sin conexión.",
    retry: "Reintentar conexión",
    back: "Volver al inicio",
  },
} as const

const offlineCriticalCss = `
  html,
  body {
    margin: 0;
    min-height: 100%;
    background: #070807;
  }

  body {
    min-height: 100dvh;
  }

  .mirava-offline,
  .mirava-offline *,
  .mirava-offline *::before,
  .mirava-offline *::after {
    box-sizing: border-box;
  }

  .mirava-offline {
    position: relative;
    isolation: isolate;
    display: flex;
    min-height: 100dvh;
    width: 100%;
    flex-direction: column;
    overflow-x: hidden;
    background: #070807;
    color: #fff;
    font-family:
      var(--font-jakarta),
      "Arial",
      "Helvetica Neue",
      sans-serif;
    -webkit-font-smoothing: antialiased;
    color-scheme: dark;
  }

  .mirava-offline-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    background:
      radial-gradient(
        circle at 72% 14%,
        rgba(180, 154, 104, 0.24),
        transparent 32%
      ),
      radial-gradient(
        circle at 18% 72%,
        rgba(107, 81, 48, 0.16),
        transparent 38%
      ),
      #070807;
  }

  .mirava-offline-bg::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.12;
    background-image:
      radial-gradient(
        rgba(255, 255, 255, 0.82) 0.55px,
        transparent 0.8px
      );
    background-size: 8px 8px;
  }

  .mirava-offline-bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.34);
  }

  .mirava-offline-header {
    position: relative;
    z-index: 30;
    display: flex;
    min-height: 92px;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0 0 24px 24px;
    background: rgba(7, 8, 7, 0.94);
    padding:
      max(16px, env(safe-area-inset-top))
      28px
      16px;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .mirava-offline-brand {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 12px;
    color: #f1f1ed;
    text-decoration: none;
  }

  .mirava-offline-brand svg {
    width: 24px;
    height: 24px;
    flex: none;
    color: #d7c39a;
  }

  .mirava-offline-brand-main {
    font-size: 18px;
    font-weight: 650;
    letter-spacing: 0.15em;
    line-height: 1;
  }

  .mirava-offline-brand-sub {
    margin-left: 7px;
    color: rgba(255, 255, 255, 0.55);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.20em;
  }

  .mirava-offline-locale {
    display: inline-flex;
    min-width: 48px;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 12px;
    background: transparent;
    color: #fff;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
  }

  .mirava-offline-shell {
    position: relative;
    z-index: 20;
    display: flex;
    width: 100%;
    flex: 1;
    align-items: flex-start;
    justify-content: center;
    padding:
      clamp(48px, 8dvh, 96px)
      16px
      max(32px, env(safe-area-inset-bottom));
  }

  .mirava-offline-card {
    width: min(100%, 448px);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 24px;
    background: rgba(0, 0, 0, 0.58);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.52);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .mirava-offline-heading {
    border-bottom: 1px solid rgba(255, 255, 255, 0.10);
    padding: 28px 28px 26px;
  }

  .mirava-offline-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    color: #d7c39a;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .mirava-offline-status svg {
    width: 14px;
    height: 14px;
  }

  .mirava-offline-title {
    margin: 0;
    color: #fff;
    font-family:
      var(--font-jakarta),
      "Arial",
      "Helvetica Neue",
      sans-serif;
    font-size: clamp(38px, 9vw, 48px);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 1;
  }

  .mirava-offline-subtitle {
    max-width: 380px;
    margin: 14px 0 0;
    color: rgba(255, 255, 255, 0.60);
    font-family:
      var(--font-jakarta),
      "Arial",
      "Helvetica Neue",
      sans-serif;
    font-size: 13px;
    line-height: 1.6;
  }

  .mirava-offline-body {
    padding: 24px 28px;
  }

  .mirava-offline-notice {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.025);
    padding: 16px;
    color: rgba(255, 255, 255, 0.56);
    font-size: 12px;
    line-height: 1.55;
  }

  .mirava-offline-notice svg {
    width: 17px;
    height: 17px;
    flex: none;
    margin-top: 1px;
    color: #d7c39a;
  }

  .mirava-offline-back {
    display: inline-flex;
    min-height: 42px;
    align-items: center;
    gap: 7px;
    margin-top: 14px;
    color: rgba(255, 255, 255, 0.48);
    text-decoration: none;
    font-size: 11px;
    font-weight: 600;
  }

  .mirava-offline-back svg {
    width: 14px;
    height: 14px;
  }

  .mirava-offline-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.10);
    padding: 22px 28px 28px;
  }

  .mirava-offline-cta {
    position: relative;
    isolation: isolate;
    display: flex;
    min-height: 56px;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    overflow: hidden;
    border: 1px solid rgba(242, 234, 220, 0.90);
    border-radius: 16px;
    background:
      linear-gradient(
        135deg,
        #fffaf0 0%,
        #eee4d3 58%,
        #d8c3a0 100%
      );
    padding: 0 12px 0 20px;
    color: #0b0c0b;
    text-decoration: none;
    box-shadow:
      0 12px 30px rgba(0, 0, 0, 0.38),
      inset 0 1px 0 rgba(255, 255, 255, 0.90);
    font-size: 15px;
    font-weight: 650;
    letter-spacing: -0.025em;
  }

  .mirava-offline-cta::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(
        circle at 18% 0%,
        rgba(255, 255, 255, 0.82),
        transparent 34%
      ),
      linear-gradient(
        115deg,
        transparent 0%,
        rgba(255, 255, 255, 0.20) 45%,
        transparent 72%
      );
    opacity: 0.8;
  }

  .mirava-offline-cta-icon {
    display: grid;
    width: 40px;
    height: 40px;
    flex: none;
    place-items: center;
    border: 1px solid rgba(0, 0, 0, 0.10);
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.07);
  }

  .mirava-offline-cta-icon svg {
    width: 16px;
    height: 16px;
  }

  .mirava-offline-cta:active,
  .mirava-offline-locale:active {
    transform: scale(0.985);
  }

  @media (max-width: 520px) {
    .mirava-offline-header {
      min-height: 84px;
      padding-left: 20px;
      padding-right: 20px;
    }

    .mirava-offline-brand-main {
      font-size: 17px;
    }

    .mirava-offline-shell {
      padding-top: clamp(42px, 7dvh, 72px);
    }

    .mirava-offline-heading,
    .mirava-offline-body,
    .mirava-offline-footer {
      padding-left: 20px;
      padding-right: 20px;
    }
  }
`

export default function MiravaOfflinePage() {
  const {
    locale,
    setLocale,
  } = useMiravaLocale()

  const t = copy[locale]

  return (
    <main
      data-mirava-offline-shell
      className="mirava-offline"
    >
      <style>{offlineCriticalCss}</style>

      <div
        aria-hidden="true"
        className="mirava-offline-bg"
      />

      <header className="mirava-offline-header">
        <Link
          href="/visual-engine"
          className="mirava-offline-brand"
          aria-label={
            locale === "fr"
              ? "Accueil MIRAVA Studio"
              : "Inicio MIRAVA Studio"
          }
        >
          <MiravaMark />

          <span>
            <span className="mirava-offline-brand-main">
              MIRAVA
            </span>

            <span className="mirava-offline-brand-sub">
              STUDIO
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() =>
            setLocale(
              locale === "fr"
                ? "es"
                : "fr",
            )
          }
          className="mirava-offline-locale"
          aria-label={
            locale === "fr"
              ? "Passer en espagnol"
              : "Cambiar al francés"
          }
        >
          {locale.toUpperCase()}
        </button>
      </header>

      <div className="mirava-offline-shell">
        <section className="mirava-offline-card">
          <div className="mirava-offline-heading">
            <div className="mirava-offline-status">
              <WifiOff aria-hidden="true" />
              <span>{t.status}</span>
            </div>

            <h1 className="mirava-offline-title">
              {t.title}
            </h1>

            <p className="mirava-offline-subtitle">
              {t.subtitle}
            </p>
          </div>

          <div className="mirava-offline-body">
            <div className="mirava-offline-notice">
              <ShieldCheck aria-hidden="true" />
              <span>{t.privacy}</span>
            </div>

            <Link
              href="/visual-engine"
              className="mirava-offline-back"
            >
              <ArrowLeft aria-hidden="true" />
              <span>{t.back}</span>
            </Link>
          </div>

          <div className="mirava-offline-footer">
            <a
              href="/visual-engine/studio"
              className="mirava-offline-cta"
            >
              <span>{t.retry}</span>

              <span className="mirava-offline-cta-icon">
                <ArrowRight aria-hidden="true" />
              </span>
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
