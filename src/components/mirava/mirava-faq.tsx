"use client"

import { useState } from "react"
import posthog from "posthog-js"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, HelpCircle, ShieldCheck, Sparkles } from "lucide-react"

interface MiravaFaqProps {
  locale: "fr" | "es"
}

const FAQ_ITEMS = [
  {
    id: "fidelity",
    question: {
      fr: "Est-ce que les images créées vont réellement me ressembler ?",
      es: "¿Las imágenes creadas se parecerán realmente a mí?",
    },
    answer: {
      fr: "Oui. MIRAVA crée votre Profil identité privé à partir de trois vues essentielles : face, trois-quarts gauche et trois-quarts droit. Vous pouvez aussi ajouter vos cheveux et votre silhouette. Le moteur adapte la lumière, la pose et le décor sans vous appliquer un filtre générique.",
      es: "Sí. MIRAVA crea tu Perfil de Identidad privado a partir de tres vistas esenciales: frente, tres cuartos izquierdo y derecho. También puedes añadir tu cabello y silueta. El motor adapta la luz, postura y escenario sin aplicarte un filtro genérico.",
    },
  },
  {
    id: "privacy",
    question: {
      fr: "Mes photos d'identité et de référence restent-elles confidentielles ?",
      es: "¿Mis fotos de identidad y referencia permanecen confidenciales?",
    },
    answer: {
      fr: "Oui. Vos images de référence créatives sont supprimées après leur analyse. Votre Profil identité est stocké dans un espace privé et vous pouvez le supprimer à tout moment en un clic.",
      es: "Sí. Tus imágenes de referencia creativas se eliminan después de su análisis. Tu Perfil de Identidad se guarda en un espacio privado y puedes eliminarlo en cualquier momento con un clic.",
    },
  },
  {
    id: "custom-studios",
    question: {
      fr: "Puis-je importer mes propres photos d'inspiration ou créer mon propre décor ?",
      es: "¿Puedo subir mis propias fotos de inspiración o crear mi propio escenario?",
    },
    answer: {
      fr: "Oui ! En plus des 7 univers créatifs pré-conçus (Escapade Solaire, Éditorial Mode, Glamour Nocturne...), vous pouvez glisser n'importe quelle photo de référence. L'agent IA MIRAVA en extrait la direction artistique (lumière, palette, cadrage) pour composer votre studio personnel.",
      es: "¡Sí! Además de los 7 universos creativos preiseñados (Escapada Solar, Editorial Moda...), puedes subir cualquier foto de referencia. El agente IA MIRAVA extraerá la dirección artística para componer tu estudio personal.",
    },
  },
  {
    id: "rights",
    question: {
      fr: "Quels usages puis-je faire de mes créations ?",
      es: "¿Qué usos puedo hacer de mis creaciones?",
    },
    answer: {
      fr: "Vos images sont livrées dans votre galerie privée pour vos usages éditoriaux et sociaux. Les droits d’utilisation applicables sont précisés dans les conditions du service avant toute ouverture publique.",
      es: "Tus imágenes se entregan en tu galería privada para tus usos editoriales y sociales. Los derechos de uso aplicables se detallan en las condiciones del servicio antes de cualquier apertura pública.",
    },
  },
]

export function MiravaFaq({ locale }: MiravaFaqProps) {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id)

  const copy = {
    fr: {
      eyebrow: "TRANSPARENCE & ENGAGEMENTS",
      title: "Vos questions sur le Studio MIRAVA",
      intro: "Tout ce que vous devez savoir sur la fidélité de votre identité, la confidentialité et l'utilisation de vos campagnes.",
    },
    es: {
      eyebrow: "TRANSPARENCIA Y COMPROMISOS",
      title: "Tus preguntas sobre MIRAVA Studio",
      intro: "Todo lo que necesitas saber sobre la fidelidad de tu identidad, la privacidad y el uso de tus campañas.",
    },
  }[locale]

  const handleToggle = (id: string) => {
    const isOpening = openId !== id
    setOpenId(isOpening ? id : null)
    if (isOpening) {
      try {
        posthog.capture("faq_opened", { faq_id: id })
      } catch (_) {}
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <p className="mirava-label inline-flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5 text-mirava-accent" />
          {copy.eyebrow}
        </p>
        <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{copy.title}</h2>
        <p className="mirava-copy mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
          {copy.intro}
        </p>
      </div>

      <div className="mt-10 grid gap-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openId === item.id
          return (
            <div
              key={item.id}
              className="mirava-surface-raised overflow-hidden rounded-[var(--mirava-radius-md)] border border-mirava-line transition-colors"
            >
              <button
                onClick={() => handleToggle(item.id)}
                className="flex w-full min-h-[44px] items-center justify-between p-5 text-left transition-colors hover:bg-mirava-surface-hover/50 sm:p-6"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3.5 pr-4">
                  <span className="tabular-nums font-jakarta text-xs font-bold text-mirava-accent">
                    0{index + 1}
                  </span>
                  <h3 className="font-jakarta text-base font-semibold text-mirava-ink sm:text-lg">
                    {item.question[locale]}
                  </h3>
                </div>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-mirava-line bg-mirava-surface text-mirava-ink transition-transform duration-300 ${
                    isOpen ? "rotate-180 bg-mirava-ink text-mirava-canvas" : ""
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <div className="border-t border-mirava-line/60 p-5 pt-4 text-sm leading-relaxed text-mirava-copy sm:p-6 sm:pt-4">
                      {item.answer[locale]}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
