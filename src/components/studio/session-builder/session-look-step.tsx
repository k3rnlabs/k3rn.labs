"use client"

import {
  MIRAVA_SESSION_SHOT_COUNT,
} from "@/lib/mirava/session-builder/schema"

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
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Shirt,
  Trash2,
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
  deleteMiravaSessionLookAssetClient,
  deleteMiravaSessionLookItemClient,
  updateMiravaSessionLookItemClient,
  uploadMiravaSessionLookAssets,
  replaceMiravaSessionLookAssetClient,
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
  shotCount?: number
  sessionId: string
  lookMode:
    MiravaSessionLookMode
  initialLookItems?:
    MiravaSessionLookClientItem[]
  persistedLookItemCount?: number
  persistedCustomLookReady?: boolean
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
      "Étape 4 · Look",
    title:
      "Habillez votre séance.",
    intro:
      (
        shotCount: number,
      ) =>
        shotCount === 1
          ? "Utilisez la tenue de votre référence artistique ou fournissez vos propres vêtements et accessoires. Le look choisi restera cohérent sur la photo."
          : `Utilisez la tenue de votre référence artistique ou fournissez vos propres vêtements et accessoires. Le look choisi restera cohérent sur les ${shotCount} photos.`,
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
      "Direction",
    continue:
      "Voir ma séance",
    continuing:
      "Préparation…",
    modeError:
      "Impossible de modifier le mode du look.",
    editArticle:
      "Modifier l’article",
    editArticleHint:
      "Modifiez les informations de ce vêtement et gérez ses différentes vues.",
    deleteView:
      "Supprimer cette vue",
    deletingView:
      "Suppression de la vue…",
    replaceView:
      "Remplacer cette vue",
    replacingView:
      "Remplacement…",
    lastViewRequired:
      "Un article doit conserver au moins une photo.",
    addView:
      "Ajouter une vue",
    addingView:
      "Ajout de la vue…",
    viewType:
      "Type de vue",
    viewLimit:
      "Maximum de six vues atteint.",
    saveChanges:
      "Enregistrer",
    savingChanges:
      "Enregistrement…",
    deleteArticle:
      "Supprimer l’article",
    deleteConfirmTitle:
      "Supprimer définitivement cet article ?",
    deleteConfirmBody:
      "Le vêtement et toutes ses photos privées seront supprimés de cette séance.",
    confirmDelete:
      "Confirmer la suppression",
    deletingArticle:
      "Suppression…",
    cancel:
      "Annuler",
    close:
      "Fermer",
    mutationError:
      "Cette modification n’a pas pu être enregistrée.",
  },
  es: {
    eyebrow:
      "Paso 4 · Look",
    title:
      "Viste tu sesión.",
    intro:
      (
        shotCount: number,
      ) =>
        shotCount === 1
          ? "Utiliza el vestuario de tu referencia artística o añade tus propias prendas y accesorios. El look elegido se mantendrá coherente en la foto."
          : `Utiliza el vestuario de tu referencia artística o añade tus propias prendas y accesorios. El look elegido se mantendrá coherente en las ${shotCount} fotos.`,
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
      "Dirección",
    continue:
      "Ver mi sesión",
    continuing:
      "Preparando…",
    modeError:
      "No se pudo modificar el modo del look.",
    editArticle:
      "Modificar la prenda",
    editArticleHint:
      "Modifica la información de esta prenda y gestiona sus diferentes vistas.",
    deleteView:
      "Eliminar esta vista",
    deletingView:
      "Eliminando la vista…",
    replaceView:
      "Reemplazar esta vista",
    replacingView:
      "Reemplazando…",
    lastViewRequired:
      "Una prenda debe conservar al menos una foto.",
    addView:
      "Añadir una vista",
    addingView:
      "Añadiendo vista…",
    viewType:
      "Tipo de vista",
    viewLimit:
      "Se alcanzó el máximo de seis vistas.",
    saveChanges:
      "Guardar",
    savingChanges:
      "Guardando…",
    deleteArticle:
      "Eliminar la prenda",
    deleteConfirmTitle:
      "¿Eliminar definitivamente esta prenda?",
    deleteConfirmBody:
      "La prenda y todas sus fotos privadas se eliminarán de esta sesión.",
    confirmDelete:
      "Confirmar eliminación",
    deletingArticle:
      "Eliminando…",
    cancel:
      "Cancelar",
    close:
      "Cerrar",
    mutationError:
      "No se pudo guardar esta modificación.",
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
  persistedCustomLookReady = false,
}: {
  lookMode:
    MiravaSessionLookMode
  lookItems:
    readonly MiravaSessionLookClientItem[]
  persistedCustomLookReady?: boolean
}): boolean {
  if (
    lookMode ===
    "REFERENCE"
  ) {
    return true
  }

  if (
    persistedCustomLookReady
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
  onEdit,
}: {
  item:
    MiravaSessionLookClientItem
  locale:
    Locale
  onEdit: () => void
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

  const title =
    item.label ??
    category

  return (
    <button
      type="button"
      data-mirava-look-item={
        item.id
      }
      data-mirava-look-item-edit-trigger
      onClick={
        onEdit
      }
      aria-label={
        `${copy.editArticle} · ${title}`
      }
      className="group block w-full overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.035] text-left transition hover:border-white/20 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7cab7]/60"
    >
      {assetCount > 0 ? (
        <div
          data-mirava-look-thumbnails
          className={cn(
            "grid gap-px border-b border-white/10 bg-white/10",
            assetCount === 1
              ? "grid-cols-1"
              : assetCount === 2
                ? "grid-cols-2"
                : "grid-cols-3",
          )}
        >
          {item.assets.map(
            (
              asset,
              index,
            ) => {
              const viewLabel =
                SESSION_LOOK_VIEW_LABELS[
                  locale
                ][
                  asset.viewKey
                ]

              return (
                <div
                  key={
                    `${item.id}-${index}-${asset.viewKey}`
                  }
                  className={cn(
                    "relative min-w-0 overflow-hidden bg-[#111212]",
                    assetCount === 1
                      ? "aspect-[16/10]"
                      : "aspect-square",
                  )}
                >
                  {asset.url ? (
                    <img
                      src={
                        asset.url
                      }
                      alt={
                        `${title} · ${viewLabel}`
                      }
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]"
                    />
                  ) : (
                    <div
                      data-mirava-look-thumbnail-unavailable
                      className="flex h-full w-full items-center justify-center bg-black/20 text-white/20"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}

                  <span className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-full border border-white/10 bg-black/65 px-2 py-1 font-jakarta text-[8px] font-medium text-white/70 backdrop-blur-md">
                    {
                      viewLabel
                    }
                  </span>
                </div>
              )
            },
          )}
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="font-jakarta text-[9px] font-bold uppercase tracking-[0.15em] text-[#bda995]">
              {
                category
              }
            </span>

            <strong className="mt-1.5 block truncate font-jakarta text-sm font-semibold text-white">
              {
                title
              }
            </strong>

            {item.brand ? (
              <span className="mt-1 block truncate font-jakarta text-[11px] text-white/45">
                {
                  item.brand
                }
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-jakarta text-[9px] text-white/55">
              {assetCount}{" "}
              {assetCount === 1
                ? copy.photo
                : copy.photos}
            </span>

            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/40 transition group-hover:border-white/20 group-hover:text-white/75"
            >
              <Pencil className="h-3 w-3" />
            </span>
          </div>
        </div>

        {item.description ? (
          <p className="mt-3 line-clamp-2 font-jakarta text-[11px] leading-5 text-white/45">
            {
              item.description
            }
          </p>
        ) : null}
      </div>
    </button>
  )
}


export function SessionLookStep({
  locale,
  shotCount =
    MIRAVA_SESSION_SHOT_COUNT,
  sessionId,
  lookMode,
  initialLookItems = [],
  persistedLookItemCount = 0,
  persistedCustomLookReady = false,
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

  const assetFileInputRef =
    useRef<HTMLInputElement>(
      null,
    )

  const replaceAssetFileInputRef =
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

  const [
    editingItem,
    setEditingItem,
  ] = useState<
    MiravaSessionLookClientItem | null
  >(null)

  const [
    editCategory,
    setEditCategory,
  ] = useState<
    MiravaSessionLookCategory
  >(
    "TOP",
  )

  const [
    editLabel,
    setEditLabel,
  ] = useState("")

  const [
    editBrand,
    setEditBrand,
  ] = useState("")

  const [
    editDescription,
    setEditDescription,
  ] = useState("")

  const [
    itemMutationBusy,
    setItemMutationBusy,
  ] = useState<
    | "save"
    | "delete"
    | "asset-delete"
    | "asset-add"
    | "asset-replace"
    | null
  >(null)

  const [
    deletingAssetId,
    setDeletingAssetId,
  ] = useState<
    string | null
  >(null)

  const [
    replacingAssetId,
    setReplacingAssetId,
  ] = useState<
    string | null
  >(null)

  const [
    newAssetViewKey,
    setNewAssetViewKey,
  ] = useState<
    MiravaSessionLookViewKey
  >(
    "UNKNOWN",
  )

  const [
    deleteConfirm,
    setDeleteConfirm,
  ] = useState(false)

  const [
    itemMutationError,
    setItemMutationError,
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
          Array.isArray(
            receipt.session.lookItems,
          ) &&
          receipt.session.lookItems.length > 0
            ? [
                ...receipt.session.lookItems,
              ]
            : (
                current,
              ) => [
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

  const openLookItemEditor =
    (
      item:
        MiravaSessionLookClientItem,
    ) => {
      if (
        uploading ||
        itemMutationBusy
      ) {
        return
      }

      setEditingItem(
        item,
      )

      setEditCategory(
        item.category,
      )

      setEditLabel(
        item.label ??
        "",
      )

      setEditBrand(
        item.brand ??
        "",
      )

      setEditDescription(
        item.description ??
        "",
      )

      setDeleteConfirm(
        false,
      )

      setReplacingAssetId(
        null,
      )

      setItemMutationError(
        null,
      )
    }

  const closeLookItemEditor =
    () => {
      if (
        itemMutationBusy
      ) {
        return
      }

      setEditingItem(
        null,
      )

      setDeleteConfirm(
        false,
      )

      setItemMutationError(
        null,
      )
    }

  const saveLookItemChanges =
    async () => {
      if (
        !editingItem ||
        itemMutationBusy
      ) {
        return
      }

      const nextLabel =
        editLabel.trim() ||
        null

      const nextBrand =
        editBrand.trim() ||
        null

      const nextDescription =
        editDescription.trim() ||
        null

      setItemMutationBusy(
        "save",
      )

      setItemMutationError(
        null,
      )

      try {
        const refreshed =
          await updateMiravaSessionLookItemClient({
            sessionId,
            lookItemId:
              editingItem.id,
            locale,
            input: {
              category:
                editCategory,
              label:
                nextLabel,
              brand:
                nextBrand,
              description:
                nextDescription,
            },
          })

        if (
          Array.isArray(
            refreshed.lookItems,
          )
        ) {
          setLookItems(
            [
              ...refreshed.lookItems,
            ],
          )
        } else {
          setLookItems(
            (
              current,
            ) =>
              current.map(
                (
                  item,
                ) =>
                  item.id ===
                  editingItem.id
                    ? {
                        ...item,
                        category:
                          editCategory,
                        label:
                          nextLabel,
                        brand:
                          nextBrand,
                        description:
                          nextDescription,
                      }
                    : item,
              ),
          )
        }

        onSessionChange?.(
          refreshed,
        )

        setEditingItem(
          null,
        )

        setDeleteConfirm(
          false,
        )
      } catch (
        mutationError
      ) {
        setItemMutationError(
          mutationError instanceof
            Error
            ? mutationError.message
            : copy.mutationError,
        )
      } finally {
        setItemMutationBusy(
          null,
        )
      }
    }

  const addLookAsset =
    async (
      event:
        ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[
          0
        ]

      event.target.value =
        ""

      if (
        !editingItem ||
        itemMutationBusy ||
        !file ||
        editingItem.assets.length >=
          MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM
      ) {
        return
      }

      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(
          file.type,
        ) ||
        file.size <=
          0
      ) {
        setItemMutationError(
          locale ===
            "fr"
            ? "Ajoutez une image JPEG, PNG ou WebP valide."
            : "Añade una imagen JPEG, PNG o WebP válida.",
        )

        return
      }

      setItemMutationBusy(
        "asset-add",
      )

      setItemMutationError(
        null,
      )

      try {
        const currentItemId =
          editingItem.id

        const refreshed =
          await uploadMiravaSessionLookAssets({
            sessionId,
            lookItemId:
              currentItemId,
            locale,
            files: [
              {
                file,
                viewKey:
                  newAssetViewKey,
              },
            ],
          })

        if (
          !Array.isArray(
            refreshed.lookItems,
          )
        ) {
          throw new Error(
            copy.mutationError,
          )
        }

        const refreshedItems = [
          ...refreshed.lookItems,
        ]

        const refreshedEditingItem =
          refreshedItems.find(
            (item) =>
              item.id ===
              currentItemId,
          )

        if (
          !refreshedEditingItem
        ) {
          throw new Error(
            copy.mutationError,
          )
        }

        setLookItems(
          refreshedItems,
        )

        setEditingItem(
          refreshedEditingItem,
        )

        setNewAssetViewKey(
          "UNKNOWN",
        )

        onSessionChange?.(
          refreshed,
        )
      } catch (
        mutationError
      ) {
        setItemMutationError(
          mutationError instanceof
            Error
            ? mutationError.message
            : copy.mutationError,
        )
      } finally {
        setItemMutationBusy(
          null,
        )
      }
    }

  const replaceLookAsset =
    async (
      event:
        ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[
          0
        ]

      event.target.value =
        ""

      const currentAsset =
        editingItem?.assets.find(
          (asset) =>
            asset.id ===
            replacingAssetId,
        )

      if (
        !editingItem ||
        itemMutationBusy ||
        !file ||
        !currentAsset?.id
      ) {
        setReplacingAssetId(
          null,
        )

        return
      }

      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(
          file.type,
        ) ||
        file.size <=
          0
      ) {
        setItemMutationError(
          locale ===
            "fr"
            ? "Ajoutez une image JPEG, PNG ou WebP valide."
            : "Añade una imagen JPEG, PNG o WebP válida.",
        )

        setReplacingAssetId(
          null,
        )

        return
      }

      setItemMutationBusy(
        "asset-replace",
      )

      setItemMutationError(
        null,
      )

      try {
        const currentItemId =
          editingItem.id

        const refreshed =
          await replaceMiravaSessionLookAssetClient({
            sessionId,
            lookItemId:
              currentItemId,
            assetId:
              currentAsset.id,
            locale,
            file: {
              file,
              viewKey:
                currentAsset.viewKey,
            },
          })

        if (
          !Array.isArray(
            refreshed.lookItems,
          )
        ) {
          throw new Error(
            copy.mutationError,
          )
        }

        const refreshedItems = [
          ...refreshed.lookItems,
        ]

        const refreshedEditingItem =
          refreshedItems.find(
            (item) =>
              item.id ===
              currentItemId,
          )

        if (
          !refreshedEditingItem
        ) {
          throw new Error(
            copy.mutationError,
          )
        }

        setLookItems(
          refreshedItems,
        )

        setEditingItem(
          refreshedEditingItem,
        )

        onSessionChange?.(
          refreshed,
        )
      } catch (
        mutationError
      ) {
        setItemMutationError(
          mutationError instanceof
            Error
            ? mutationError.message
            : copy.mutationError,
        )
      } finally {
        setReplacingAssetId(
          null,
        )

        setItemMutationBusy(
          null,
        )
      }
    }

  const openReplaceLookAsset =
    (
      assetId:
        string | undefined,
    ) => {
      if (
        !assetId ||
        itemMutationBusy
      ) {
        return
      }

      setReplacingAssetId(
        assetId,
      )

      replaceAssetFileInputRef
        .current
        ?.click()
    }

  const deleteLookAsset =
    async (
      assetId:
        string | undefined,
    ) => {
      if (
        !editingItem ||
        itemMutationBusy ||
        !assetId ||
        editingItem.assets.length <=
          1
      ) {
        return
      }

      setItemMutationBusy(
        "asset-delete",
      )

      setDeletingAssetId(
        assetId,
      )

      setItemMutationError(
        null,
      )

      try {
        const currentItemId =
          editingItem.id

        const refreshed =
          await deleteMiravaSessionLookAssetClient({
            sessionId,
            lookItemId:
              currentItemId,
            assetId,
            locale,
          })

        if (
          Array.isArray(
            refreshed.lookItems,
          )
        ) {
          const refreshedItems = [
            ...refreshed.lookItems,
          ]

          setLookItems(
            refreshedItems,
          )

          const refreshedEditingItem =
            refreshedItems.find(
              (item) =>
                item.id ===
                currentItemId,
            )

          if (
            refreshedEditingItem
          ) {
            setEditingItem(
              refreshedEditingItem,
            )
          } else {
            setEditingItem(
              null,
            )
          }
        } else {
          const nextEditingItem = {
            ...editingItem,
            assets:
              editingItem.assets.filter(
                (asset) =>
                  asset.id !==
                  assetId,
              ),
          }

          setEditingItem(
            nextEditingItem,
          )

          setLookItems(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  currentItemId
                    ? nextEditingItem
                    : item,
              ),
          )
        }

        onSessionChange?.(
          refreshed,
        )
      } catch (
        mutationError
      ) {
        setItemMutationError(
          mutationError instanceof
            Error
            ? mutationError.message
            : copy.mutationError,
        )
      } finally {
        setDeletingAssetId(
          null,
        )

        setItemMutationBusy(
          null,
        )
      }
    }

  const deleteLookItem =
    async () => {
      if (
        !editingItem ||
        itemMutationBusy
      ) {
        return
      }

      if (
        !deleteConfirm
      ) {
        setDeleteConfirm(
          true,
        )

        setItemMutationError(
          null,
        )

        return
      }

      setItemMutationBusy(
        "delete",
      )

      setItemMutationError(
        null,
      )

      try {
        const removedId =
          editingItem.id

        const refreshed =
          await deleteMiravaSessionLookItemClient({
            sessionId,
            lookItemId:
              removedId,
            locale,
          })

        if (
          Array.isArray(
            refreshed.lookItems,
          )
        ) {
          setLookItems(
            [
              ...refreshed.lookItems,
            ],
          )
        } else {
          setLookItems(
            (
              current,
            ) =>
              current.filter(
                (
                  item,
                ) =>
                  item.id !==
                  removedId,
              ),
          )
        }

        onSessionChange?.(
          refreshed,
        )

        setEditingItem(
          null,
        )

        setDeleteConfirm(
          false,
        )
      } catch (
        mutationError
      ) {
        setItemMutationError(
          mutationError instanceof
            Error
            ? mutationError.message
            : copy.mutationError,
        )
      } finally {
        setItemMutationBusy(
          null,
        )
      }
    }

  const effectiveLookItemCount =
    Math.max(
      persistedLookItemCount,
      lookItems.length,
    )

  const canContinue =
    canContinueMiravaSessionLook(
      {
        lookMode,
        lookItems,
        persistedCustomLookReady,
      },
    )

  const itemLimitReached =
    effectiveLookItemCount >=
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
                copy.intro(
                  shotCount,
                )
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
                      onEdit={() =>
                        openLookItemEditor(
                          item,
                        )
                      }
                    />
                  ),
                )}

                <div className="pt-2 text-right font-jakarta text-[10px] tabular-nums text-white/30">
                  {
                    effectiveLookItemCount
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

      {editingItem ? (
        <DialogPrimitive.Root
          open
          onOpenChange={(
            open,
          ) => {
            if (!open) {
              closeLookItemEditor()
            }
          }}
        >
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
              data-mirava-look-editor-overlay
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            />

            <DialogPrimitive.Content
              data-mirava-look-editor
              onOpenAutoFocus={(
                event,
              ) => {
                event.preventDefault()
              }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#111212] p-5 text-[#f1f1ed] shadow-[0_-24px_80px_rgba(0,0,0,0.55)] outline-none sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-[min(92vw,620px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-jakarta text-[9px] font-bold uppercase tracking-[0.16em] text-[#c7b6a4]">
                    MIRAVA / LOOK
                  </span>

                  <DialogPrimitive.Title className="mt-2 font-jakarta text-2xl font-semibold tracking-[-0.035em] text-white">
                    {
                      copy.editArticle
                    }
                  </DialogPrimitive.Title>

                  <DialogPrimitive.Description className="mt-2 max-w-md font-jakarta text-xs leading-5 text-white/45">
                    {
                      copy.editArticleHint
                    }
                  </DialogPrimitive.Description>
                </div>

                <DialogPrimitive.Close
                  type="button"
                  disabled={
                    Boolean(
                      itemMutationBusy,
                    )
                  }
                  aria-label={
                    copy.close
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/65 transition hover:bg-white/[0.08] disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              </div>

              {editingItem.assets.length >
              0 ? (
                <div
                  className={cn(
                    "mt-5 grid gap-1 overflow-hidden rounded-[18px] border border-white/10 bg-white/10",
                    editingItem.assets.length === 1
                      ? "grid-cols-1"
                      : editingItem.assets.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-3",
                  )}
                >
                  {editingItem.assets.map(
                    (
                      asset,
                      index,
                    ) => (
                      <div
                        key={
                          asset.id ??
                          `${editingItem.id}-editor-${index}-${asset.viewKey}`
                        }
                        className={cn(
                          "relative overflow-hidden bg-black/30",
                          editingItem.assets.length === 1
                            ? "aspect-[16/9] max-h-[260px]"
                            : "aspect-square",
                        )}
                      >
                        {asset.url ? (
                          <img
                            src={
                              asset.url
                            }
                            alt={
                              SESSION_LOOK_VIEW_LABELS[
                                locale
                              ][
                                asset.viewKey
                              ]
                            }
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/20">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}

                        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-1 font-jakarta text-[8px] text-white/70">
                          {
                            SESSION_LOOK_VIEW_LABELS[
                              locale
                            ][
                              asset.viewKey
                            ]
                          }
                        </span>

                        <button
                          type="button"
                          data-mirava-look-asset-replace
                          data-mirava-look-asset-id={
                            asset.id
                          }
                          aria-label={
                            copy.replaceView
                          }
                          title={
                            copy.replaceView
                          }
                          disabled={
                            Boolean(
                              itemMutationBusy,
                            ) ||
                            !asset.id
                          }
                          onClick={() =>
                            openReplaceLookAsset(
                              asset.id,
                            )
                          }
                          className="absolute right-11 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white/80 backdrop-blur-xl transition hover:border-white/30 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {
                            itemMutationBusy ===
                              "asset-replace" &&
                            replacingAssetId ===
                              asset.id
                              ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                )
                              : (
                                  <Upload className="h-3.5 w-3.5" />
                                )
                          }
                        </button>

                        <button
                          type="button"
                          data-mirava-look-asset-delete
                          data-mirava-look-asset-id={
                            asset.id
                          }
                          aria-label={
                            copy.deleteView
                          }
                          title={
                            editingItem.assets.length <=
                            1
                              ? copy.lastViewRequired
                              : copy.deleteView
                          }
                          disabled={
                            Boolean(
                              itemMutationBusy,
                            ) ||
                            editingItem.assets.length <=
                              1 ||
                            !asset.id
                          }
                          onClick={() =>
                            void deleteLookAsset(
                              asset.id,
                            )
                          }
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white/80 backdrop-blur-xl transition hover:border-red-300/35 hover:bg-red-400/20 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {
                            itemMutationBusy ===
                              "asset-delete" &&
                            deletingAssetId ===
                              asset.id
                              ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                )
                              : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )
                          }
                        </button>
                      </div>
                    ),
                  )}
                </div>
              ) : null}

              <input
                ref={
                  replaceAssetFileInputRef
                }
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                data-mirava-look-asset-replace-input
                onChange={(
                  event,
                ) =>
                  void replaceLookAsset(
                    event,
                  )
                }
              />

              <input
                ref={
                  assetFileInputRef
                }
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                data-mirava-look-asset-add-input
                onChange={(
                  event,
                ) =>
                  void addLookAsset(
                    event,
                  )
                }
              />

              <div
                data-mirava-look-asset-add
                className="mt-3 rounded-[16px] border border-white/10 bg-white/[0.025] p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1">
                    <span className="mb-2 block font-jakarta text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      {
                        copy.viewType
                      }
                    </span>

                    <select
                      value={
                        newAssetViewKey
                      }
                      disabled={
                        Boolean(
                          itemMutationBusy,
                        ) ||
                        editingItem.assets.length >=
                          MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewAssetViewKey(
                          event.target
                            .value as
                            MiravaSessionLookViewKey,
                        )
                      }
                      className="min-h-[44px] w-full rounded-xl border border-white/10 bg-[#171818] px-3 font-jakarta text-xs text-white outline-none focus:border-white/30 disabled:opacity-40"
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
                  </label>

                  <button
                    type="button"
                    data-mirava-look-asset-add-trigger
                    disabled={
                      Boolean(
                        itemMutationBusy,
                      ) ||
                      editingItem.assets.length >=
                        MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM
                    }
                    onClick={() =>
                      assetFileInputRef
                        .current
                        ?.click()
                    }
                    className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 font-jakarta text-xs font-semibold text-white/75 transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {
                      itemMutationBusy ===
                        "asset-add"
                        ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )
                        : (
                            <Plus className="h-3.5 w-3.5" />
                          )
                    }

                    {
                      itemMutationBusy ===
                        "asset-add"
                        ? copy.addingView
                        : copy.addView
                    }
                  </button>
                </div>

                {
                  editingItem.assets.length >=
                  MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM
                    ? (
                        <p className="mt-2 font-jakarta text-[10px] text-white/35">
                          {
                            copy.viewLimit
                          }
                        </p>
                      )
                    : null
                }
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-jakarta text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    {
                      copy.category
                    }
                  </span>

                  <select
                    value={
                      editCategory
                    }
                    disabled={
                      Boolean(
                        itemMutationBusy,
                      )
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditCategory(
                        event.target
                          .value as
                          MiravaSessionLookCategory,
                      )
                    }
                    className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#171818] px-3 font-jakarta text-sm text-white outline-none focus:border-white/30 disabled:opacity-50"
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
                  <span className="mb-2 block font-jakarta text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    {
                      copy.label
                    }
                  </span>

                  <input
                    value={
                      editLabel
                    }
                    maxLength={
                      80
                    }
                    disabled={
                      Boolean(
                        itemMutationBusy,
                      )
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditLabel(
                        event.target
                          .value,
                      )
                    }
                    placeholder={
                      copy.labelPlaceholder
                    }
                    className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#171818] px-3 font-jakarta text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30 disabled:opacity-50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-jakarta text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    {
                      copy.brand
                    }
                  </span>

                  <input
                    value={
                      editBrand
                    }
                    maxLength={
                      80
                    }
                    disabled={
                      Boolean(
                        itemMutationBusy,
                      )
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditBrand(
                        event.target
                          .value,
                      )
                    }
                    placeholder={
                      copy.brandPlaceholder
                    }
                    className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#171818] px-3 font-jakarta text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30 disabled:opacity-50"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block font-jakarta text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    {
                      copy.description
                    }
                  </span>

                  <textarea
                    value={
                      editDescription
                    }
                    maxLength={
                      300
                    }
                    rows={
                      3
                    }
                    disabled={
                      Boolean(
                        itemMutationBusy,
                      )
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditDescription(
                        event.target
                          .value,
                      )
                    }
                    placeholder={
                      copy.descriptionPlaceholder
                    }
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#171818] px-3 py-3 font-jakarta text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30 disabled:opacity-50"
                  />
                </label>
              </div>

              {itemMutationError ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-2.5 font-jakarta text-xs leading-5 text-red-200"
                >
                  {
                    itemMutationError
                  }
                </p>
              ) : null}

              <button
                type="button"
                data-mirava-look-editor-save
                disabled={
                  Boolean(
                    itemMutationBusy,
                  )
                }
                onClick={() =>
                  void saveLookItemChanges()
                }
                className="mt-5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#ede8df] px-5 font-jakarta text-sm font-semibold text-[#101111] transition hover:bg-white active:scale-[0.99] disabled:opacity-50"
              >
                {itemMutationBusy ===
                "save" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}

                {itemMutationBusy ===
                "save"
                  ? copy.savingChanges
                  : copy.saveChanges}
              </button>

              <div className="mt-6 border-t border-white/10 pt-5">
                {deleteConfirm ? (
                  <div
                    data-mirava-look-delete-confirm
                    className="rounded-[18px] border border-red-400/20 bg-red-400/[0.055] p-4"
                  >
                    <strong className="block font-jakarta text-sm font-semibold text-red-100">
                      {
                        copy.deleteConfirmTitle
                      }
                    </strong>

                    <p className="mt-2 font-jakarta text-xs leading-5 text-white/45">
                      {
                        copy.deleteConfirmBody
                      }
                    </p>

                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        disabled={
                          Boolean(
                            itemMutationBusy,
                          )
                        }
                        onClick={() =>
                          setDeleteConfirm(
                            false,
                          )
                        }
                        className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-4 font-jakarta text-xs font-semibold text-white/65 disabled:opacity-40"
                      >
                        {
                          copy.cancel
                        }
                      </button>

                      <button
                        type="button"
                        data-mirava-look-delete-confirm-button
                        disabled={
                          Boolean(
                            itemMutationBusy,
                          )
                        }
                        onClick={() =>
                          void deleteLookItem()
                        }
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-4 font-jakarta text-xs font-semibold text-red-200 transition hover:bg-red-400/15 disabled:opacity-40"
                      >
                        {itemMutationBusy ===
                        "delete" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}

                        {itemMutationBusy ===
                        "delete"
                          ? copy.deletingArticle
                          : copy.confirmDelete}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-mirava-look-delete-trigger
                    disabled={
                      Boolean(
                        itemMutationBusy,
                      )
                    }
                    onClick={() =>
                      void deleteLookItem()
                    }
                    className="flex min-h-[44px] items-center gap-2 rounded-xl px-1 font-jakarta text-xs font-semibold text-red-300/80 transition hover:text-red-200 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                    {
                      copy.deleteArticle
                    }
                  </button>
                )}
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      ) : null}

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
