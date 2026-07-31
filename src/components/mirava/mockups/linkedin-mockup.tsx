"use client"

import React from "react"
import Image from "next/image"

type Props = {
  locale: "fr" | "es"
}

export function LinkedInMockup({ locale }: Props) {
  const isFr = locale === "fr"

  return (
    <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-mirava-line bg-[#0E100F] text-mirava-ink shadow-2xl">
      {/* 1. React/CSS Custom Brand Banner */}
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-r from-[#121514] via-[#1A1D1B] to-[#121514] p-4 sm:h-40">
        {/* Subtle CSS Editorial Glow & Mineral Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,175,55,0.08),transparent_70%)] pointer-events-none" />

        {/* HTML Value Proposition Text (Left Side) */}
        <div className="relative z-10 max-w-[62%]">
          <span className="font-jakarta text-[9px] font-extrabold uppercase tracking-[.18em] text-mirava-accent">
            {isFr ? "Studio de Direction Visuelle" : "Estudio de Dirección Visual"}
          </span>
          <h4 className="mt-1 font-jakarta text-xs font-bold leading-snug tracking-tight text-white sm:text-sm">
            {isFr
              ? "Identités visuelles éditoriales & campagnes de marque"
              : "Identidades visuales editoriales y campañas de marca"}
          </h4>
        </div>

        {/* Mini Portfolio Renders (Right Side) */}
        <div className="absolute right-3 top-3 bottom-3 flex items-center gap-1.5 z-10">
          <div className="relative aspect-[3/4] h-full overflow-hidden rounded-md border border-white/10 shadow-md">
            <Image
              src="/visual-engine/univers/beauty-close-up.webp"
              alt="Résultat Studio 1"
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="relative aspect-[3/4] h-full overflow-hidden rounded-md border border-white/10 shadow-md hidden sm:block">
            <Image
              src="/visual-engine/univers/editorial-mode.webp"
              alt="Résultat Studio 2"
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        </div>
      </div>

      {/* 2. Profile Header Info & Avatar Overlap */}
      <div className="relative px-5 pb-4">
        {/* Avatar overlapping lower-left of banner */}
        <div className="relative -mt-10 mb-3 flex items-end justify-between">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-[#0E100F] bg-mirava-surface shadow-xl">
            <Image
              src="/visual-engine/v4/04-linkedin-profile.png"
              alt="Amelia Santos — Avatar LinkedIn"
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="flex items-center gap-2 pb-1">
            <span className="rounded-full bg-mirava-surface px-3 py-1 font-jakarta text-[11px] font-semibold border border-mirava-line text-mirava-ink">
              {isFr ? "Message" : "Mensaje"}
            </span>
            <span className="rounded-full bg-mirava-accent px-3 py-1 font-jakarta text-[11px] font-bold text-mirava-canvas">
              {isFr ? "Suivre" : "Seguir"}
            </span>
          </div>
        </div>

        {/* Name & Title */}
        <div>
          <h3 className="font-jakarta text-base font-bold text-white flex items-center gap-1.5">
            Amelia Santos
            <span className="inline-block h-2 w-2 rounded-full bg-mirava-accent" />
          </h3>
          <p className="text-xs text-mirava-ink-secondary mt-0.5">
            {isFr
              ? "Creative Director & Founder @ Santos Studio — Identité IA & Photographie"
              : "Creative Director & Founder @ Santos Studio — Identidad IA y Fotografía"}
          </p>
          <p className="text-[11px] text-mirava-ink-muted mt-1">
            Paris, France · 500+ {isFr ? "relations" : "contactos"}
          </p>
        </div>
      </div>

      {/* 3. Publication Feed Post Sample */}
      <div className="border-t border-mirava-line/60 bg-mirava-surface p-4">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="relative h-7 w-7 overflow-hidden rounded-full border border-mirava-line">
            <Image
              src="/visual-engine/v4/04-linkedin-profile.png"
              alt="Amelia Santos"
              fill
              className="object-cover"
              sizes="28px"
            />
          </div>
          <div>
            <span className="block font-jakarta text-xs font-bold leading-none text-white">
              Amelia Santos
            </span>
            <span className="text-[10px] text-mirava-ink-muted">
              {isFr ? "Publié il y a 2h · Éditorial" : "Publicado hace 2h · Editorial"}
            </span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-mirava-ink-secondary mb-3">
          {isFr
            ? "Ravi de partager notre dernière série visuelle générée avec le studio MIRAVA. Une seule identité déclinée en haute couture."
            : "Encantada de compartir nuestra última serie visual generada con el estudio MIRAVA. Una única identidad en alta costura."}
        </p>

        {/* Post Image Asset */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-mirava-line/60">
          <Image
            src="/visual-engine/univers/night-glamour.webp"
            alt="Publication LinkedIn"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 90vw, 450px"
          />
        </div>
      </div>
    </div>
  )
}
