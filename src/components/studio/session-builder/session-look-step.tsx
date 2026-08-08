"use client"

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import {
  motion,
  useReducedMotion,
} from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImageIcon,
  Loader2,
  Plus,
  Shirt,
  Upload,
  X,
} from "lucide-react"

import {
  MIRAVA_SESSION_LOOK_CATEGORIES,
  MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM,
  MIRAVA_SESSION_LOOK_MAX_ITEMS,
  MIRAVA_SESSION_LOOK_VIEW_KEYS,
  type MiravaSessionLookCategory,
  type MiravaSessionLookViewKey,
} from "@/lib/mirava/session-builder/look"
import {
  type MiravaSessionLookMode,
} from "@/lib/mirava/session-builder/schema"
import {
  uploadMiravaSessionLookItem,
  type MiravaSessionLookClientItem,
  type MiravaSessionLookClientSession,
} from "@/lib/mirava/session-builder/session-look-upload.client"
import {
  cn,
} from "@/lib/utils"

type Locale =
  | "fr"
  | "es"

type LocalLookFile = {
  id: string
  file: File
  previewUrl: string
  viewKey:
    MiravaSessionLookViewKey
}

type SessionLookStepProps = {
  locale: Locale
  sessionId: string
  lookMode:
    MiravaSessionLookMode
  initialLookItems?:
    MiravaSessionLookClientItem[]
  onLookModeChange:
    (
      mode:
        MiravaSessionLookMode,
    ) =>
      | void
      | Promise<void>
  onSessionChange?:
    (
      session:
        MiravaSessionLookClientSession,
    ) => void
  onBack: () => void
  onContinue: () => void
  continueBusy?: boolean
}

export const SESSION_LOOK_COPY = {
  fr: {
    eyebrow:
      "Étape 3 · Look",
    title:
      "Habillez votre séance.",
    intro:
      "Utilisez la tenue de votre référence artistique ou fournissez vos propres vêtements et accessoires. Le look choisi restera cohérent sur les six photos.",
    referenceTitle:
      "Utiliser la référence",
    referenceBody:
      "MIRAVA reprend la direction vestimentaire de votre référence artistique.",
    customTitle:
      "Créer mon look",
    customBody:
      "Ajoutez vos vêtements, chaussures et accessoires. Plusieurs vues peuvent décrire un même article.",
    customHeading:
      "Ajouter un article",
    customHint:
      "1 à 6 images du même article · JPEG, PNG ou WebP.",
    category:
      "Catégorie",
    label:
      "Nom de l’article",
    labelPlaceholder:
      "Ex. blazer noir",
    brand:
      "Marque",
    brandPlaceholder:
      "Optionnel",
    description:
      "Détails utiles",
    descriptionPlaceholder:
      "Coupe, matière, détails à préserver…",
    addPhotos:
      "Ajouter des photos",
    anotherPhoto:
      "Ajouter une vue",
    uploadItem:
      "Ajouter au look",
    uploading:
      "Envoi privé…",
    lookHeading:
      "Votre look",
    referenceReady:
      "La référence artistique fournira la tenue de la séance.",
    customEmpty:
      "Ajoutez au moins un article pour utiliser un look personnalisé.",
    photos:
      "photos",
    photo:
      "photo",
    ready:
      "Look prêt",
    maxItems:
      "Nombre maximum d’articles atteint.",
    back:
      "Lumière",
    continue:
      "Voir ma séance",
    continuing:
      "Préparation…",
    modeError:
      "Impossible de modifier le mode du look.",
  },
  es: {
    eyebrow:
      "Paso 3 · Look",
    title:
      "Viste tu sesión.",
    intro:
      "Utiliza el vestuario de tu referencia artística o añade tus propias prendas y accesorios. El look elegido se mantendrá coherente en las seis fotos.",
    referenceTitle:
      "Usar la referencia",
    referenceBody:
      "MIRAVA retoma la dirección de vestuario de tu referencia artística.",
    customTitle:
      "Crear mi look",
    customBody:
      "Añade tu ropa, calzado y accesorios. Varias vistas pueden describir una misma prenda.",
    customHeading:
      "Añadir una prenda",
    customHint:
      "De 1 a 6 imágenes de la misma prenda · JPEG, PNG o WebP.",
    category:
      "Categoría",
    label:
      "Nombre de la prenda",
    labelPlaceholder:
      "Ej. blazer negro",
    brand:
      "Marca",
    brandPlaceholder:
      "Opcional",
    description:
      "Detalles útiles",
    descriptionPlaceholder:
      "Corte, tejido, detalles que deben conservarse…",
    addPhotos:
      "Añadir fotos",
    anotherPhoto:
      "Añadir una vista",
    uploadItem:
      "Añadir al look",
    uploading:
      "Envío privado…",
    lookHeading:
      "Tu look",
    referenceReady:
      "La referencia artística proporcionará el vestuario de la sesión.",
    customEmpty:
      "Añade al menos una prenda para utilizar un look personalizado.",
    photos:
      "fotos",
    photo:
      "foto",
    ready:
      "Look listo",
    maxItems:
      "Se alcanzó el número máximo de prendas.",
    back:
      "Luz",
    continue:
      "Ver mi sesión",
    continuing:
      "Preparando…",
    modeError:
      "No se pudo modificar el modo del look.",
  },
} as const

export const SESSION_LOOK_CATEGORY_LABELS:
  Record<
    Locale,
    Record<
      MiravaSessionLookCategory,
      string
    >
  > = {
    fr: {
      TOP:
        "Haut",
      BOTTOM:
        "Bas",
      DRESS:
        "Robe / combinaison",
      OUTERWEAR:
        "Veste / manteau",
      SHOES:
        "Chaussures",
      BAG:
        "Sac",
      WATCH:
        "Montre",
      JEWELRY:
        "Bijoux",
      EYEWEAR:
        "Lunettes",
      OTHER:
        "Autre",
    },
    es: {
      TOP:
        "Parte superior",
      BOTTOM:
        "Parte inferior",
      DRESS:
        "Vestido / mono",
      OUTERWEAR:
        "Chaqueta / abrigo",
      SHOES:
        "Calzado",
      BAG:
        "Bolso",
      WATCH:
        "Reloj",
      JEWELRY:
        "Joyas",
      EYEWEAR:
        "Gafas",
      OTHER:
        "Otro",
    },
  }

export const SESSION_LOOK_VIEW_LABELS:
  Record<
    Locale,
    Record<
      MiravaSessionLookViewKey,
      string
    >
  > = {
    fr: {
      FRONT:
        "Face",
      BACK:
        "Dos",
      SIDE:
        "Côté",
      DETAIL:
        "Détail",
      PRODUCT:
        "Produit",
      UNKNOWN:
        "Vue libre",
    },
    es: {
      FRONT:
        "Frontal",
      BACK:
        "Espalda",
      SIDE:
        "Lateral",
      DETAIL:
        "Detalle",
      PRODUCT:
        "Producto",
      UNKNOWN:
        "Vista libre",
    },
  }

export function canContinueMiravaSessionLook({
  lookMode,
  lookItems,
}: {
  lookMode:
    MiravaSessionLookMode
  lookItems:
    readonly MiravaSessionLookClientItem[]
}): boolean {
  if (
    lookMode ===
    "REFERENCE"
  ) {
    return true
  }

  return lookItems.some(
    (item) =>
      Array.isArray(
        item.assets,
      ) &&
      item.assets.length > 0,
  )
}

function ModeCard({
  title,
  body,
  selected,
  icon,
  disabled,
  onClick,
}: {
  title: string
  body: string
  selected: boolean
  icon:
    React.ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={
        selected
      }
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      whileTap={
        disabled
          ? undefined
          : {
              scale: 0.985,
            }
      }
      className={cn(
        "relative flex min-h-[148px] flex-col items-start rounded-[22px] border p-5 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#ede8df] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0e0e]",
        selected
          ? "border-[#ede8df] bg-white/[0.09] shadow-[0_14px_38px_rgba(0,0,0,0.34)] ring-1 ring-[#ede8df]/65"
          : "border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.055]",
        disabled &&
          "cursor-wait opacity-60",
      )}
    >
      <div className="flex w-full items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-[#ded7cc]">
          {icon}
        </div>

        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border transition-all",
            selected
              ? "border-[#ede8df] bg-[#ede8df] text-[#101111]"
              : "border-white/20 bg-black/20 text-transparent",
          )}
        >
          <Check className="h-4 w-4 stroke-[3]" />
        </div>
      </div>

      <strong className="mt-5 font-jakarta text-[15px] font-semibold text-white">
        {title}
      </strong>

      <span className="mt-2 max-w-sm font-jakarta text-[11px] leading-[1.55] text-white/55">
        {body}
      </span>
    </motion.button>
  )
}

function LookItemCard({
  item,
  locale,
}: {
  item:
    MiravaSessionLookClientItem
  locale:
    Locale
}) {
  const category =
    SESSION_LOOK_CATEGORY_LABELS[
      locale
    ][
      item.category
    ]

  const assetCount =
    item.assets.length

  const copy =
    SESSION_LOOK_COPY[
      locale
    ]

  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="font-jakarta text-[9px] font-bold uppercase tracking-[0.15em] text-[#bda995]">
            {category}
          </span>

          <strong className="mt-1.5 block truncate font-jakarta text-sm font-semibold text-white">
            {item.label ??
              category}
          </strong>

          {item.brand ? (
            <span className="mt-1 block truncate font-jakarta text-[11px] text-white/45">
              {
                item.brand
              }
            </span>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-jakarta text-[9px] text-white/55">
          {assetCount}{" "}
          {assetCount === 1
            ? copy.photo
            : copy.photos}
        </span>
      </div>

      {item.description ? (
        <p className="mt-3 line-clamp-2 font-jakarta text-[11px] leading-5 text-white/45">
          {
            item.description
          }
        </p>
      ) : null}
    </div>
  )
}

export function SessionLookStep({
  locale,
  sessionId,
  lookMode,
  initialLookItems = [],
  onLookModeChange,
  onSessionChange,
  onBack,
  onContinue,
  continueBusy = false,
}: SessionLookStepProps) {
  const reduceMotion =
    useReducedMotion()

  const copy =
    SESSION_LOOK_COPY[
      locale
    ]

  const fileInputRef =
    useRef<HTMLInputElement>(
      null,
    )

  const previewUrlsRef =
    useRef(
      new Set<string>(),
    )

  const [
    lookItems,
    setLookItems,
  ] = useState<
    MiravaSessionLookClientItem[]
  >(
    () => [
      ...initialLookItems,
    ],
  )

  const [
    files,
    setFiles,
  ] = useState<
    LocalLookFile[]
  >([])

  const [
    category,
    setCategory,
  ] = useState<
    MiravaSessionLookCategory
  >(
    "TOP",
  )

  const [
    label,
    setLabel,
  ] = useState("")

  const [
    brand,
    setBrand,
  ] = useState("")

  const [
    description,
    setDescription,
  ] = useState("")

  const [
    uploading,
    setUploading,
  ] = useState(false)

  const [
    modeBusy,
    setModeBusy,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null)

  useEffect(
    () => {
      const urls =
        previewUrlsRef.current

      return () => {
        urls.forEach(
          (url) => {
            URL.revokeObjectURL(
              url,
            )
          },
        )

        urls.clear()
      }
    },
    [],
  )

  const clearFiles =
    () => {
      for (
        const item
        of files
      ) {
        URL.revokeObjectURL(
          item.previewUrl,
        )

        previewUrlsRef.current.delete(
          item.previewUrl,
        )
      }

      setFiles([])
    }

  const handleModeChange =
    async (
      nextMode:
        MiravaSessionLookMode,
    ) => {
      if (
        nextMode ===
        lookMode ||
        modeBusy ||
        uploading
      ) {
        return
      }

      setError(null)
      setModeBusy(true)

      try {
        await onLookModeChange(
          nextMode,
        )
      } catch (
        modeError
      ) {
        setError(
          modeError instanceof
            Error &&
            modeError.message
            ? modeError.message
            : copy.modeError,
        )
      } finally {
        setModeBusy(false)
      }
    }

  const handleFiles =
    (
      event:
        ChangeEvent<HTMLInputElement>,
    ) => {
      const incoming =
        Array.from(
          event.target.files ??
            [],
        )

      event.target.value =
        ""

      if (
        incoming.length === 0
      ) {
        return
      }

      const remaining =
        Math.max(
          0,
          MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM -
            files.length,
        )

      const accepted =
        incoming
          .filter(
            (file) =>
              [
                "image/jpeg",
                "image/png",
                "image/webp",
              ].includes(
                file.type,
              ) &&
              file.size > 0,
          )
          .slice(
            0,
            remaining,
          )

      const nextFiles =
        accepted.map(
          (
            file,
            index,
          ) => {
            const previewUrl =
              URL.createObjectURL(
                file,
              )

            previewUrlsRef.current.add(
              previewUrl,
            )

            return {
              id:
                `${Date.now()}-${index}-${file.name}`,
              file,
              previewUrl,
              viewKey:
                "UNKNOWN" as const,
            }
          },
        )

      setFiles(
        (current) => [
          ...current,
          ...nextFiles,
        ],
      )

      setError(null)
    }

  const removeFile =
    (
      id: string,
    ) => {
      setFiles(
        (current) =>
          current.filter(
            (item) => {
              if (
                item.id !== id
              ) {
                return true
              }

              URL.revokeObjectURL(
                item.previewUrl,
              )

              previewUrlsRef.current.delete(
                item.previewUrl,
              )

              return false
            },
          ),
      )
    }

  const updateViewKey =
    (
      id: string,
      viewKey:
        MiravaSessionLookViewKey,
    ) => {
      setFiles(
        (current) =>
          current.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    viewKey,
                  }
                : item,
          ),
      )
    }

  const uploadItem =
    async () => {
      if (
        lookMode !==
          "CUSTOM" ||
        uploading ||
        files.length < 1 ||
        lookItems.length >=
          MIRAVA_SESSION_LOOK_MAX_ITEMS
      ) {
        return
      }

      setUploading(true)
      setError(null)

      try {
        const receipt =
          await uploadMiravaSessionLookItem(
            {
              sessionId,
              locale,
              item: {
                category,
                label:
                  label.trim() ||
                  undefined,
                brand:
                  brand.trim() ||
                  undefined,
                description:
                  description.trim() ||
                  undefined,
                files:
                  files.map(
                    (
                      item,
                    ) => ({
                      file:
                        item.file,
                      viewKey:
                        item.viewKey,
                    }),
                  ),
              },
            },
          )

        setLookItems(
          (current) => [
            ...current,
            receipt.lookItem,
          ],
        )

        clearFiles()
        setLabel("")
        setBrand("")
        setDescription("")
        setCategory(
          "TOP",
        )

        onSessionChange?.(
          receipt.session,
        )
      } catch (
        uploadError
      ) {
        setError(
          uploadError instanceof
            Error
            ? uploadError.message
            : locale ===
                "fr"
              ? "L’envoi privé du look a échoué."
              : "Falló el envío privado del look.",
        )
      } finally {
        setUploading(false)
      }
    }

  const canContinue =
    canContinueMiravaSessionLook(
      {
        lookMode,
        lookItems,
      },
    )

  const itemLimitReached =
    lookItems.length >=
    MIRAVA_SESSION_LOOK_MAX_ITEMS

  return (
    <section
      data-testid="mirava-session-look-step"
      className="relative min-h-full w-full bg-[#0d0e0e] text-[#f1f1ed]"
    >
      <div className="mx-auto grid w-full max-w-[1520px] gap-8 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:px-8 lg:pb-10 lg:pt-8 xl:gap-12">
        <div className="min-w-0">
          <motion.div
            initial={
              reduceMotion
                ? false
                : {
                    opacity: 0,
                    y: 10,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.28,
            }}
          >
            <span className="font-jakarta text-[10px] font-bold uppercase tracking-[0.18em] text-[#c7b6a4]">
              {
                copy.eyebrow
              }
            </span>

            <h1 className="mt-3 max-w-xl font-jakarta text-[32px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#f3f1ec] sm:text-[40px] lg:text-[46px]">
              {
                copy.title
              }
            </h1>

            <p className="mt-4 max-w-2xl font-jakarta text-sm leading-6 text-white/58">
              {
                copy.intro
              }
            </p>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ModeCard
              title={
                copy.referenceTitle
              }
              body={
                copy.referenceBody
              }
              selected={
                lookMode ===
                "REFERENCE"
              }
              disabled={
                modeBusy ||
                uploading
              }
              icon={
                <ImageIcon className="h-5 w-5" />
              }
              onClick={() =>
                void handleModeChange(
                  "REFERENCE",
                )
              }
            />

            <ModeCard
              title={
                copy.customTitle
              }
              body={
                copy.customBody
              }
              selected={
                lookMode ===
                "CUSTOM"
              }
              disabled={
                modeBusy ||
                uploading
              }
              icon={
                <Shirt className="h-5 w-5" />
              }
              onClick={() =>
                void handleModeChange(
                  "CUSTOM",
                )
              }
            />
          </div>

          {lookMode ===
          "CUSTOM" ? (
            <div className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.025] p-4 sm:p-6">
              <div>
                <h2 className="font-jakarta text-base font-semibold text-white">
                  {
                    copy.customHeading
                  }
                </h2>

                <p className="mt-1.5 font-jakarta text-[11px] leading-5 text-white/45">
                  {
                    copy.customHint
                  }
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-jakarta text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                    {
                      copy.category
                    }
                  </span>

                  <select
                    value={
                      category
                    }
                    disabled={
                      uploading
                    }
                    onChange={(
                      event,
                    ) =>
                      setCategory(
                        event.target
                          .value as
                          MiravaSessionLookCategory,
                      )
                    }
                    className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#171818] px-3 font-jakarta text-sm text-white outline-none focus:border-white/30"
                  >
                    {MIRAVA_SESSION_LOOK_CATEGORIES.map(
                      (
                        value,
                      ) => (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
                        >
                          {
                            SESSION_LOOK_CATEGORY_LABELS[
                              locale
                            ][
                              value
                            ]
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block font-jakarta text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                    {
                      copy.label
                    }
                  </span>

                  <input
                    value={
                      label
                    }
                    maxLength={
                      80
                    }
                    disabled={
                      uploading
                    }
                    onChange={(
                      event,
                    ) =>
                      setLabel(
                        event.target
                          .value,
                      )
                    }
                    placeholder={
                      copy.labelPlaceholder
                    }
                    className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#171818] px-3 font-jakarta text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-jakarta text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                    {
                      copy.brand
                    }
                  </span>

                  <input
                    value={
                      brand
                    }
                    maxLength={
                      80
                    }
                    disabled={
                      uploading
                    }
                    onChange={(
                      event,
                    ) =>
                      setBrand(
                        event.target
                          .value,
                      )
                    }
                    placeholder={
                      copy.brandPlaceholder
                    }
                    className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#171818] px-3 font-jakarta text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-jakarta text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                    {
                      copy.description
                    }
                  </span>

                  <input
                    value={
                      description
                    }
                    maxLength={
                      300
                    }
                    disabled={
                      uploading
                    }
                    onChange={(
                      event,
                    ) =>
                      setDescription(
                        event.target
                          .value,
                      )
                    }
                    placeholder={
                      copy.descriptionPlaceholder
                    }
                    className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#171818] px-3 font-jakarta text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </label>
              </div>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={
                  handleFiles
                }
              />

              {files.length ===
              0 ? (
                <button
                  type="button"
                  disabled={
                    uploading ||
                    itemLimitReached
                  }
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="mt-5 flex min-h-[126px] w-full flex-col items-center justify-center rounded-[20px] border border-dashed border-white/15 bg-black/15 px-5 text-center transition hover:border-white/30 hover:bg-white/[0.025] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Upload className="h-5 w-5 text-[#c9b7a3]" />

                  <strong className="mt-3 font-jakarta text-sm font-semibold text-white">
                    {
                      copy.addPhotos
                    }
                  </strong>

                  <span className="mt-1 font-jakarta text-[10px] text-white/35">
                    1–
                    {
                      MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM
                    }
                  </span>
                </button>
              ) : (
                <div className="mt-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {files.map(
                      (
                        item,
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="overflow-hidden rounded-[18px] border border-white/10 bg-black/25"
                        >
                          <div className="relative aspect-square overflow-hidden bg-black">
                            <img
                              src={
                                item.previewUrl
                              }
                              alt={
                                item.file.name
                              }
                              className="h-full w-full object-cover"
                            />

                            <button
                              type="button"
                              aria-label="Remove"
                              disabled={
                                uploading
                              }
                              onClick={() =>
                                removeFile(
                                  item.id,
                                )
                              }
                              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white backdrop-blur-xl"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="p-2">
                            <select
                              value={
                                item.viewKey
                              }
                              disabled={
                                uploading
                              }
                              onChange={(
                                event,
                              ) =>
                                updateViewKey(
                                  item.id,
                                  event.target
                                    .value as
                                    MiravaSessionLookViewKey,
                                )
                              }
                              className="h-9 w-full rounded-lg border border-white/10 bg-[#171818] px-2 font-jakarta text-[10px] text-white outline-none"
                            >
                              {MIRAVA_SESSION_LOOK_VIEW_KEYS.map(
                                (
                                  viewKey,
                                ) => (
                                  <option
                                    key={
                                      viewKey
                                    }
                                    value={
                                      viewKey
                                    }
                                  >
                                    {
                                      SESSION_LOOK_VIEW_LABELS[
                                        locale
                                      ][
                                        viewKey
                                      ]
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  {files.length <
                  MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM ? (
                    <button
                      type="button"
                      disabled={
                        uploading
                      }
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="mt-3 flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 font-jakarta text-xs font-semibold text-white/65 transition hover:bg-white/[0.07]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {
                        copy.anotherPhoto
                      }
                    </button>
                  ) : null}
                </div>
              )}

              {itemLimitReached ? (
                <p className="mt-4 font-jakarta text-xs text-[#d1a99a]">
                  {
                    copy.maxItems
                  }
                </p>
              ) : null}

              <button
                type="button"
                disabled={
                  uploading ||
                  files.length < 1 ||
                  itemLimitReached
                }
                onClick={() =>
                  void uploadItem()
                }
                className={cn(
                  "mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 font-jakarta text-sm font-semibold transition",
                  !uploading &&
                    files.length > 0 &&
                    !itemLimitReached
                    ? "bg-[#ede8df] text-[#101111] hover:bg-white"
                    : "cursor-not-allowed bg-white/[0.07] text-white/25",
                )}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}

                <span>
                  {uploading
                    ? copy.uploading
                    : copy.uploadItem}
                </span>
              </button>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/[0.06] px-4 py-3 font-jakarta text-xs leading-5 text-red-100/80"
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-6 lg:sticky lg:top-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-jakarta text-[9px] font-bold uppercase tracking-[0.16em] text-[#bda995]">
                  {
                    copy.lookHeading
                  }
                </span>

                <h2 className="mt-1.5 font-jakarta text-xl font-semibold tracking-[-0.025em] text-white">
                  {lookMode ===
                  "REFERENCE"
                    ? copy.referenceTitle
                    : copy.customTitle}
                </h2>
              </div>

              {canContinue ? (
                <span className="flex items-center gap-1.5 rounded-full border border-[#d7cab7]/20 bg-[#d7cab7]/10 px-3 py-1.5 font-jakarta text-[9px] font-semibold text-[#e5ddd2]">
                  <Check className="h-3 w-3" />
                  {
                    copy.ready
                  }
                </span>
              ) : null}
            </div>

            {lookMode ===
            "REFERENCE" ? (
              <div className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-[22px] border border-white/8 bg-black/15 px-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#c9b7a3]">
                  <ImageIcon className="h-5 w-5" />
                </div>

                <p className="mt-4 max-w-xs font-jakarta text-xs leading-6 text-white/48">
                  {
                    copy.referenceReady
                  }
                </p>
              </div>
            ) : lookItems.length >
              0 ? (
              <div className="mt-6 space-y-3">
                {lookItems.map(
                  (
                    item,
                  ) => (
                    <LookItemCard
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      locale={
                        locale
                      }
                    />
                  ),
                )}

                <div className="pt-2 text-right font-jakarta text-[10px] tabular-nums text-white/30">
                  {
                    lookItems.length
                  }
                  {" / "}
                  {
                    MIRAVA_SESSION_LOOK_MAX_ITEMS
                  }
                </div>
              </div>
            ) : (
              <div className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-black/10 px-8 text-center">
                <Shirt className="h-6 w-6 text-white/25" />

                <p className="mt-4 max-w-xs font-jakarta text-xs leading-6 text-white/40">
                  {
                    copy.customEmpty
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0e0e]/88 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl lg:sticky lg:bottom-0 lg:bg-[#0d0e0e]/92 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1520px] items-center justify-between gap-3">
          <button
            type="button"
            disabled={
              uploading ||
              modeBusy
            }
            onClick={
              onBack
            }
            className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 font-jakarta text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] active:scale-[0.985] disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>
              {
                copy.back
              }
            </span>
          </button>

          <button
            type="button"
            disabled={
              !canContinue ||
              uploading ||
              modeBusy ||
              continueBusy
            }
            onClick={
              onContinue
            }
            className={cn(
              "group flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl px-6 font-jakarta text-sm font-semibold transition-all duration-200 sm:flex-none sm:min-w-[220px]",
              canContinue &&
                !uploading &&
                !modeBusy &&
                !continueBusy
                ? "bg-[#ede8df] text-[#101111] shadow-[0_8px_30px_rgba(237,232,223,0.12)] hover:bg-white active:scale-[0.985]"
                : "cursor-not-allowed bg-white/[0.07] text-white/25",
            )}
          >
            <span>
              {continueBusy
                ? copy.continuing
                : copy.continue}
            </span>

            <ArrowRight
              className={cn(
                "h-4 w-4 transition-transform",
                canContinue &&
                  !continueBusy &&
                  "group-hover:translate-x-0.5",
              )}
            />
          </button>
        </div>
      </div>
    </section>
  )
}

export default SessionLookStep
