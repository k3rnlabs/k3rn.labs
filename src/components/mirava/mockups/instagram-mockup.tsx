"use client"

import React from "react"
import Image from "next/image"

type Props = {
  locale: "fr" | "es"
}

export function InstagramMockup({ locale }: Props) {
  const isFr = locale === "fr"

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-mirava-line bg-[#0D0F0E] p-4 text-mirava-ink shadow-2xl">
      {/* Phone Header / Status bar simulation */}
      <div className="mb-3 flex items-center justify-between border-b border-mirava-line/40 pb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className="relative h-7 w-7 overflow-hidden rounded-full border border-mirava-line">
            <Image
              src="/visual-engine/v4/04-linkedin-profile.png"
              alt="Profil Amelia Santos"
              fill
              className="object-cover"
              sizes="28px"
            />
          </div>
          <div>
            <span className="block font-jakarta text-xs font-bold leading-none tracking-tight">
              amelia.santos
            </span>
            <span className="text-[10px] text-mirava-ink-muted">Studio Éditorial</span>
          </div>
        </div>
        <span className="rounded-full bg-mirava-accent/15 px-2 py-0.5 font-jakarta text-[10px] font-semibold text-mirava-accent">
          {isFr ? "Séance Active" : "Sesión Activa"}
        </span>
      </div>

      {/* Main Content Area: Feed 4:5 vs Reel 9:16 grid */}
      <div className="grid gap-3">
        {/* Feed Post 4:5 Card */}
        <div className="group relative overflow-hidden rounded-xl border border-mirava-line bg-mirava-surface p-2">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg">
            <Image
              src="/visual-engine/v4/02-instagram-feed.png"
              alt="Publication Feed 4:5"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 90vw, 400px"
            />
            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-md bg-black/60 px-2.5 py-1.5 backdrop-blur-md">
              <span className="font-jakarta text-[10px] font-bold text-white tracking-wide">
                FEED 4:5
              </span>
              <span className="text-[10px] font-medium text-white/80">
                {isFr ? "Format Natif" : "Formato Nativo"}
              </span>
            </div>
          </div>
        </div>

        {/* Reel 9:16 & Miniatures grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Reel 9:16 Card */}
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-mirava-line">
            <Image
              src="/visual-engine/v4/03-instagram-reel.png"
              alt="Couverture Reel 9:16"
              fill
              className="object-cover"
              sizes="200px"
            />
            <div className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-mirava-accent tracking-wider">
              REEL 9:16
            </div>
          </div>

          {/* Secondary Details */}
          <div className="flex flex-col justify-between rounded-xl border border-mirava-line bg-mirava-surface p-2.5">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-mirava-line/50">
              <Image
                src="/visual-engine/univers/beauty-close-up.webp"
                alt="Détail Signature"
                fill
                className="object-cover"
                sizes="150px"
              />
            </div>
            <div className="mt-2">
              <span className="block font-jakarta text-[10px] font-bold text-mirava-ink">
                {isFr ? "Détail Signature" : "Detalle Firma"}
              </span>
              <p className="mt-0.5 text-[10px] leading-tight text-mirava-ink-muted">
                {isFr ? "Grain & Lumière préservés" : "Grano y Luz preservados"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
