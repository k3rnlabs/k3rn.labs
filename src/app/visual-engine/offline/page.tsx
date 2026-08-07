"use client"

import Link from "next/link"
import {
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react"
import { MiravaMark } from "@/components/mirava/mirava-mark"
import { useMiravaLocale } from "@/components/mirava/mirava-locale"

const copy = {
  fr: {
    status: "Hors ligne",
    eyebrow: "MIRAVA STUDIO / CONNEXION",
    title: "Connexion interrompue",
    description:
      "Le Studio a besoin du réseau pour accéder à vos références privées et lancer une génération.",
    privacy:
      "Le mode hors ligne ne met pas en cache vos références privées, prompts ou résultats.",
    retry: "Réessayer la connexion",
    back: "Retour à l’accueil",
    foot: "Votre studio reste intact.",
  },
  es: {
    status: "Sin conexión",
    eyebrow: "MIRAVA STUDIO / CONEXIÓN",
    title: "Conexión interrumpida",
    description:
      "El Studio necesita conexión para acceder a tus referencias privadas e iniciar una generación.",
    privacy:
      "El modo sin conexión no almacena en caché tus referencias privadas, prompts ni resultados.",
    retry: "Reintentar conexión",
    back: "Volver al inicio",
    foot: "Tu estudio permanece intacto.",
  },
} as const

const offlineCriticalCss = `
  html,
  body {
    margin: 0;
    min-height: 100%;
    background: #000;
  }

  body {
    min-height: 100dvh;
  }

  .mirava-offline-page,
  .mirava-offline-page *,
  .mirava-offline-page *::before,
  .mirava-offline-page *::after {
    box-sizing: border-box;
  }

  .mirava-offline-page {
    --canvas: #000;
    --canvas-raised: #0e1010;
    --surface: #151717;
    --surface-raised: #1d1f1f;
    --ink: #f1f1ed;
    --ink-secondary: #abaca8;
    --ink-muted: #9a9b96;
    --accent: #d5c6b0;
    --line: rgba(255, 255, 255, 0.10);
    --line-strong: rgba(255, 255, 255, 0.18);

    position: relative;
    isolation: isolate;
    display: flex;
    min-height: 100dvh;
    width: 100%;
    flex-direction: column;
    overflow: hidden;
    background:
      radial-gradient(
        ellipse 70% 52% at 18% -8%,
        rgba(255, 255, 255, 0.075),
        transparent 65%
      ),
      radial-gradient(
        ellipse 52% 46% at 94% 105%,
        rgba(213, 198, 176, 0.07),
        transparent 70%
      ),
      var(--canvas);
    color: var(--ink);
    font-family:
      Inter,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    -webkit-font-smoothing: antialiased;
    color-scheme: dark;
  }

  .mirava-offline-page::after {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0.23;
    background-image:
      repeating-radial-gradient(
        circle at 30% 20%,
        rgba(255, 255, 255, 0.025) 0,
        rgba(255, 255, 255, 0.025) 1px,
        transparent 1px,
        transparent 4px
      );
    mix-blend-mode: soft-light;
  }

  .mirava-offline-header {
    display: flex;
    width: min(100%, 1180px);
    margin: 0 auto;
    align-items: center;
    justify-content: space-between;
    padding:
      max(20px, env(safe-area-inset-top))
      clamp(20px, 5vw, 48px)
      12px;
  }

  .mirava-offline-brand {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    color: var(--ink);
    font-size: 17px;
    font-weight: 650;
    letter-spacing: 0.16em;
    line-height: 1;
  }

  .mirava-offline-brand svg {
    width: 21px;
    height: 21px;
    flex: none;
    color: var(--accent);
  }

  .mirava-offline-brand small {
    margin-left: 5px;
    color: var(--ink-secondary);
    font-size: 10px;
    font-weight: 550;
    letter-spacing: 0.20em;
  }

  .mirava-offline-status {
    display: inline-flex;
    min-height: 30px;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0 11px;
    color: var(--ink-secondary);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .mirava-offline-status svg {
    width: 13px;
    height: 13px;
    color: var(--accent);
  }

  .mirava-offline-main {
    display: grid;
    width: 100%;
    flex: 1;
    place-items: center;
    padding:
      clamp(30px, 7vh, 76px)
      clamp(18px, 5vw, 48px)
      clamp(64px, 10vh, 116px);
  }

  .mirava-offline-card {
    position: relative;
    width: min(100%, 590px);
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 24px;
    background:
      radial-gradient(
        ellipse 90% 70% at 5% 0%,
        rgba(255, 255, 255, 0.065),
        transparent 58%
      ),
      linear-gradient(
        135deg,
        rgba(29, 31, 31, 0.98),
        rgba(14, 16, 16, 0.98)
      );
    padding: clamp(26px, 6vw, 44px);
    box-shadow:
      0 38px 110px rgba(0, 0, 0, 0.52),
      inset 0 1px 0 rgba(255, 255, 255, 0.035);
  }

  .mirava-offline-card::before {
    content: "";
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    height: 1px;
    background:
      linear-gradient(
        90deg,
        transparent,
        rgba(213, 198, 176, 0.72),
        transparent
      );
    opacity: 0.72;
  }

  .mirava-offline-emblem {
    display: grid;
    width: 58px;
    height: 58px;
    place-items: center;
    border: 1px solid var(--line-strong);
    border-radius: 18px;
    background:
      radial-gradient(
        circle at 34% 28%,
        rgba(255, 255, 255, 0.12),
        transparent 44%
      ),
      var(--surface-raised);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
    color: var(--accent);
  }

  .mirava-offline-emblem svg {
    width: 24px;
    height: 24px;
  }

  .mirava-offline-eyebrow {
    margin: 28px 0 0;
    color: var(--accent);
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.18em;
    line-height: 1.4;
    text-transform: uppercase;
  }

  .mirava-offline-title {
    max-width: 500px;
    margin: 13px 0 0;
    color: var(--ink);
    font-size: clamp(36px, 7vw, 54px);
    font-weight: 620;
    letter-spacing: -0.045em;
    line-height: 0.98;
    text-wrap: balance;
  }

  .mirava-offline-description {
    max-width: 500px;
    margin: 18px 0 0;
    color: var(--ink-secondary);
    font-size: 15px;
    line-height: 1.65;
  }

  .mirava-offline-privacy {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-top: 30px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.20);
    padding: 15px 16px;
    color: var(--ink-muted);
    font-size: 12px;
    line-height: 1.55;
  }

  .mirava-offline-privacy svg {
    width: 17px;
    height: 17px;
    flex: none;
    margin-top: 1px;
    color: var(--accent);
  }

  .mirava-offline-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    margin-top: 28px;
  }

  .mirava-offline-action {
    display: inline-flex;
    min-height: 50px;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border-radius: 10px;
    padding: 0 18px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 650;
    transition:
      transform 150ms ease-out,
      background-color 150ms ease-out,
      border-color 150ms ease-out,
      color 150ms ease-out;
  }

  .mirava-offline-action:active {
    transform: scale(0.97);
  }

  .mirava-offline-action-primary {
    background: var(--ink);
    color: var(--canvas);
  }

  .mirava-offline-action-primary:hover {
    background: #fff;
  }

  .mirava-offline-action-secondary {
    border: 1px solid var(--line);
    background: transparent;
    color: var(--ink-secondary);
  }

  .mirava-offline-action-secondary:hover {
    border-color: var(--line-strong);
    background: var(--surface);
    color: var(--ink);
  }

  .mirava-offline-action svg {
    width: 16px;
    height: 16px;
  }

  .mirava-offline-footer {
    padding:
      0
      20px
      max(20px, env(safe-area-inset-bottom));
    color: var(--ink-muted);
    font-size: 10px;
    letter-spacing: 0.09em;
    text-align: center;
    text-transform: uppercase;
  }

  @media (min-width: 580px) {
    .mirava-offline-actions {
      grid-template-columns:
        minmax(0, 1.25fr)
        minmax(0, 0.75fr);
    }
  }

  @media (max-width: 520px) {
    .mirava-offline-header {
      padding-left: 18px;
      padding-right: 18px;
    }

    .mirava-offline-status {
      min-height: 28px;
      padding: 0 9px;
    }

    .mirava-offline-status span {
      display: none;
    }

    .mirava-offline-card {
      border-radius: 20px;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    .mirava-offline-action-primary svg {
      transition: transform 350ms ease;
    }

    .mirava-offline-action-primary:hover svg {
      transform: rotate(180deg);
    }
  }
`

export default function MiravaOfflinePage() {
  const { locale } = useMiravaLocale()
  const t = copy[locale]

  return (
    <main
      data-mirava-offline-shell
      className="mirava-offline-page"
    >
      {/*
       * Critical styling intentionally lives in the cached HTML.
       * The offline fallback must remain fully branded even when
       * Next/Tailwind static assets are unavailable.
       */}
      <style>{offlineCriticalCss}</style>

      <header className="mirava-offline-header">
        <div
          className="mirava-offline-brand"
          aria-label="MIRAVA Studio"
        >
          <MiravaMark />
          <span>
            MIRAVA
            <small>STUDIO</small>
          </span>
        </div>

        <div className="mirava-offline-status">
          <WifiOff aria-hidden="true" />
          <span>{t.status}</span>
        </div>
      </header>

      <section className="mirava-offline-main">
        <div className="mirava-offline-card">
          <div className="mirava-offline-emblem">
            <WifiOff aria-hidden="true" />
          </div>

          <p className="mirava-offline-eyebrow">
            {t.eyebrow}
          </p>

          <h1 className="mirava-offline-title">
            {t.title}
          </h1>

          <p className="mirava-offline-description">
            {t.description}
          </p>

          <div className="mirava-offline-privacy">
            <ShieldCheck aria-hidden="true" />
            <span>{t.privacy}</span>
          </div>

          <div className="mirava-offline-actions">
            <a
              href="/visual-engine/studio"
              className="mirava-offline-action mirava-offline-action-primary"
            >
              <RefreshCw aria-hidden="true" />
              <span>{t.retry}</span>
            </a>

            <Link
              href="/visual-engine"
              className="mirava-offline-action mirava-offline-action-secondary"
            >
              <ArrowLeft aria-hidden="true" />
              <span>{t.back}</span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="mirava-offline-footer">
        MIRAVA Studio · {t.foot}
      </footer>
    </main>
  )
}
