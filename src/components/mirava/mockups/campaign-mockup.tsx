"use client"

import React from "react"
import Image from "next/image"

type Props = {
  locale: "fr" | "es"
}

export function CampaignMockup({ locale }: Props) {
  const isFr = locale === "fr"

  return (
    <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-mirava-line bg-[#0B0D0C] text-mirava-ink shadow-2xl">
      {/* Browser Bar Header */}
      <div className="flex items-center justify-between border-b border-mirava-line/50 bg-[#121514] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        </div>
        <div className="rounded-md bg-mirava-surface px-4 py-1 font-mono text-[10px] text-mirava-ink-muted border border-mirava-line/40">
          https://santos-studio.com/campaign-2026
        </div>
        <div className="w-10" />
      </div>

      {/* Campaign Hero Display with A06 */}
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-mirava-line/60">
        <Image
          src="/visual-engine/v4/06-campaign-hero.png"
          alt="Hero Campagne Web A06"
          fill
          priority
          sizes="(max-width: 1024px) 90vw, 600px"
          className="object-cover"
          style={{ objectPosition: "78% center" }}
        />
        {/* Soft Left Linear Gradient Overlay for Readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(4, 5, 5, 0.70) 0%, rgba(4, 5, 5, 0.35) 55%, transparent 75%)",
          }}
        />

        {/* HTML Overlaid Copy & Title */}
        <div className="relative z-10 flex h-full max-w-[65%] flex-col justify-center p-6 text-white">
          <span className="font-jakarta text-[10px] font-extrabold uppercase tracking-[.2em] text-mirava-accent">
            {isFr ? "Collection Éditoriale 2026" : "Colección Editorial 2026"}
          </span>
          <h3 className="mt-2 font-jakarta text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
            {isFr ? "L'élégance absolue en signature." : "La elegancia absoluta como firma."}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-white/80 hidden sm:block">
            {isFr
              ? "Direction artistique & captation d'identité visuelle."
              : "Dirección artística y captación de identidad visual."}
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center rounded-lg bg-white px-3.5 py-1.5 font-jakarta text-xs font-bold text-black shadow-md">
              {isFr ? "Découvrir le Lookbook" : "Descubrir el Lookbook"}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Format Display Ad Grid */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-mirava-surface">
        {/* Vertical Display Ad with night-glamour */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-mirava-line bg-[#101211] p-3">
          <div>
            <span className="font-jakarta text-[9px] font-bold uppercase tracking-wider text-mirava-accent">
              {isFr ? "Pub Verticale (Display)" : "Anuncio Vertical"}
            </span>
            <div className="relative mt-2 aspect-[3/4] w-full overflow-hidden rounded-lg border border-mirava-line/50">
              <Image
                src="/visual-engine/univers/night-glamour.webp"
                alt="Display Vertical"
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>
          </div>
          <span className="mt-2 block font-jakarta text-[10px] font-medium text-mirava-ink-muted text-center">
            Format Ad 9:16
          </span>
        </div>

        {/* Brand Detail Card with beauty-close-up */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-mirava-line bg-[#101211] p-3">
          <div>
            <span className="font-jakarta text-[9px] font-bold uppercase tracking-wider text-mirava-accent">
              {isFr ? "Détail Campagne" : "Detalle Campaña"}
            </span>
            <div className="relative mt-2 aspect-[3/4] w-full overflow-hidden rounded-lg border border-mirava-line/50">
              <Image
                src="/visual-engine/univers/beauty-close-up.webp"
                alt="Détail Campagne"
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>
          </div>
          <span className="mt-2 block font-jakarta text-[10px] font-medium text-mirava-ink-muted text-center">
            Format 1:1 Macro
          </span>
        </div>
      </div>
    </div>
  )
}
