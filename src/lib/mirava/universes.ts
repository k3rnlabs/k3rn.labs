import type { MiravaStudioPresetId } from "@/lib/mirava/brand"

type LocalizedText = { fr: string; es: string }
type LocalizedList = { fr: string[]; es: string[] }

export type MiravaUniverseDirection = {
  location: LocalizedText
  styling: LocalizedText
  energy: LocalizedText
  light: LocalizedText
  photoStyle: LocalizedText
  refinements: {
    locations: LocalizedList
    stylings: LocalizedList
    energies: LocalizedList
    lights: LocalizedList
  }
}

export type MiravaUniverse = {
  id: MiravaStudioPresetId
  name: LocalizedText
  eyebrow: LocalizedText
  tagline: LocalizedText
  description: LocalizedText
  image: string
  keyElements: { fr: string[]; es: string[] }
  sampleBriefs: { fr: string[]; es: string[] }
  creativeDirection: MiravaUniverseDirection
}

export const MIRAVA_UNIVERSES: MiravaUniverse[] = [
  {
    id: "escapade-solaire",
    name: { fr: "Escapade solaire", es: "Escapada solar" },
    eyebrow: { fr: "MER · PIERRE · LUMIÈRE", es: "MAR · PIEDRA · LUZ" },
    tagline: { fr: "La lumière dorée devient votre décor.", es: "La luz dorada se convierte en tu escenario." },
    description: {
      fr: "Une campagne solaire baignée par la fin de journée, entre pierre minérale, eau claire et présence magnétique.",
      es: "Una campaña solar bañada por la última luz del día, entre piedra mineral, agua clara y presencia magnética.",
    },
    image: "/visual-engine/univers/escapade-solaire.webp",
    keyElements: {
      fr: ["Lumière dorée rasante", "Pierre ivoire et eau claire", "Bijoux en or patiné", "Peau lumineuse naturelle"],
      es: ["Luz dorada rasante", "Piedra marfil y agua clara", "Joyas de oro envejecido", "Piel luminosa natural"],
    },
    sampleBriefs: {
      fr: ["Une campagne solaire sur une terrasse privée en Méditerranée.", "Une silhouette ivoire au bord d’une piscine minérale.", "Un portrait de fin de journée avec la mer en arrière-plan."],
      es: ["Una campaña solar en una terraza privada del Mediterráneo.", "Una silueta marfil junto a una piscina mineral.", "Un retrato al final del día con el mar al fondo."],
    },
    creativeDirection: {
      location: { fr: "Terrasse minérale en Méditerranée", es: "Terraza mineral en el Mediterráneo" },
      styling: { fr: "Silhouette ivoire et bijoux patinés", es: "Silueta marfil y joyas envejecidas" },
      energy: { fr: "Solaire, libre et magnétique", es: "Solar, libre y magnética" },
      light: { fr: "Lumière dorée de fin de journée", es: "Luz dorada de última hora" },
      photoStyle: { fr: "Éditorial solaire aux tons minéraux", es: "Editorial solar de tonos minerales" },
      refinements: {
        locations: { fr: ["Crique rocheuse", "Terrasse méditerranéenne", "Piscine en pierre", "Plage minérale"], es: ["Cala rocosa", "Terraza mediterránea", "Piscina de piedra", "Playa mineral"] },
        stylings: { fr: ["Silhouette ivoire", "Tailoring resort", "Maillot sculptural"], es: ["Silueta marfil", "Sastrería resort", "Bañador escultórico"] },
        energies: { fr: ["Libre", "Magnétique", "Contemplative"], es: ["Libre", "Magnética", "Contemplativa"] },
        lights: { fr: ["Soleil rasant", "Contre-jour doré", "Après-midi minérale"], es: ["Sol rasante", "Contraluz dorado", "Tarde mineral"] },
      },
    },
  },
  {
    id: "destination-iconique",
    name: { fr: "Destination iconique", es: "Destino icónico" },
    eyebrow: { fr: "ROOFTOP · SUITE · SKYLINE", es: "ROOFTOP · SUITE · SKYLINE" },
    tagline: { fr: "Votre présence prend la dimension du voyage.", es: "Tu presencia toma la dimensión del viaje." },
    description: {
      fr: "Suites d’exception, lignes architecturales et horizons urbains composent une campagne internationale et assurée.",
      es: "Suites excepcionales, líneas arquitectónicas y horizontes urbanos crean una campaña internacional y segura.",
    },
    image: "/visual-engine/univers/destination-iconique.webp",
    keyElements: {
      fr: ["Tailoring architectural", "Heure bleue indigo", "Vue urbaine abstraite", "Allure jet-set maîtrisée"],
      es: ["Sastrería arquitectónica", "Hora azul índigo", "Vista urbana abstracta", "Actitud jet-set controlada"],
    },
    sampleBriefs: {
      fr: ["Un power suit ivoire sur un rooftop à l’heure bleue.", "Une arrivée dans une suite panoramique avant un événement.", "Une campagne urbaine très luxe, nette et minimaliste."],
      es: ["Un traje marfil en un rooftop durante la hora azul.", "Una llegada a una suite panorámica antes de un evento.", "Una campaña urbana muy lujosa, nítida y minimalista."],
    },
    creativeDirection: {
      location: { fr: "Rooftop architectural à l’heure bleue", es: "Rooftop arquitectónico en la hora azul" },
      styling: { fr: "Power suit net et accessoires précieux", es: "Power suit nítido y accesorios preciosos" },
      energy: { fr: "Assurée, internationale et maîtrisée", es: "Segura, internacional y controlada" },
      light: { fr: "Heure bleue et reflets urbains", es: "Hora azul y reflejos urbanos" },
      photoStyle: { fr: "Campagne voyage nette et cinématographique", es: "Campaña de viaje nítida y cinematográfica" },
      refinements: {
        locations: { fr: ["Rooftop skyline", "Suite panoramique", "Lobby architectural", "Terrasse d’hôtel"], es: ["Rooftop skyline", "Suite panorámica", "Lobby arquitectónico", "Terraza de hotel"] },
        stylings: { fr: ["Power suit ivoire", "Tailoring noir", "Robe de voyage structurée"], es: ["Power suit marfil", "Sastrería negra", "Vestido de viaje estructurado"] },
        energies: { fr: ["Assurée", "Jet-set maîtrisée", "Contemplative"], es: ["Segura", "Jet-set controlada", "Contemplativa"] },
        lights: { fr: ["Heure bleue", "Reflets de skyline", "Lumière intérieure chaude"], es: ["Hora azul", "Reflejos de skyline", "Luz interior cálida"] },
      },
    },
  },
  {
    id: "beauty-close-up",
    name: { fr: "Beauté rapprochée", es: "Primer plano de belleza" },
    eyebrow: { fr: "PEAU · REGARD · ÉCLAT", es: "PIEL · MIRADA · BRILLO" },
    tagline: { fr: "Chaque détail devient une signature.", es: "Cada detalle se convierte en una firma." },
    description: {
      fr: "Un très gros plan beauté pensé pour révéler le regard, la texture naturelle de la peau et la précision du style.",
      es: "Un primerísimo plano de belleza pensado para revelar la mirada, la textura natural de la piel y la precisión del estilismo.",
    },
    image: "/visual-engine/univers/beauty-close-up.webp",
    keyElements: {
      fr: ["Flash éditorial précis", "Texture de peau préservée", "Cheveux wet-look", "Bijou sculptural"],
      es: ["Flash editorial preciso", "Textura de piel preservada", "Cabello wet-look", "Joya escultórica"],
    },
    sampleBriefs: {
      fr: ["Un portrait beauté ultra rapproché, wet-look et bijoux or.", "Un regard frontal avec flash direct et peau très naturelle.", "Une couverture beauté sombre, précise et magnétique."],
      es: ["Un retrato beauty muy cercano, wet-look y joyas doradas.", "Una mirada frontal con flash directo y piel muy natural.", "Una portada beauty oscura, precisa y magnética."],
    },
    creativeDirection: {
      location: { fr: "Studio beauté sombre et épuré", es: "Estudio beauty oscuro y depurado" },
      styling: { fr: "Beauté précise et bijou sculptural", es: "Beauty preciso y joya escultórica" },
      energy: { fr: "Frontale, intime et magnétique", es: "Frontal, íntima y magnética" },
      light: { fr: "Flash beauté précis et peau naturelle", es: "Flash beauty preciso y piel natural" },
      photoStyle: { fr: "Très gros plan éditorial haute définition", es: "Primerísimo plano editorial de alta definición" },
      refinements: {
        locations: { fr: ["Fond noir profond", "Miroir fumé", "Cyclorama ivoire", "Studio wet-look"], es: ["Fondo negro profundo", "Espejo ahumado", "Ciclorama marfil", "Estudio wet-look"] },
        stylings: { fr: ["Bijou sculptural", "Wet-look minimal", "Liner graphique"], es: ["Joya escultórica", "Wet-look minimal", "Liner gráfico"] },
        energies: { fr: ["Frontale", "Intime", "Insaisissable"], es: ["Frontal", "Íntima", "Inasible"] },
        lights: { fr: ["Flash frontal doux", "Lumière latérale beauté", "Halo argenté"], es: ["Flash frontal suave", "Luz lateral beauty", "Halo plateado"] },
      },
    },
  },
  {
    id: "editorial-mode",
    name: { fr: "Éditorial mode", es: "Editorial de moda" },
    eyebrow: { fr: "COUTURE · OMBRE · ATTITUDE", es: "COUTURE · SOMBRA · ACTITUD" },
    tagline: { fr: "La silhouette devient architecture.", es: "La silueta se convierte en arquitectura." },
    description: {
      fr: "Une direction haute mode où les volumes, les ombres et la posture construisent une image sculpturale.",
      es: "Una dirección de alta moda donde los volúmenes, las sombras y la postura construyen una imagen escultórica.",
    },
    image: "/visual-engine/univers/editorial-mode.webp",
    keyElements: {
      fr: ["Silhouette sculpturale", "Ombres géométriques", "Palette monochrome", "Posture couture"],
      es: ["Silueta escultórica", "Sombras geométricas", "Paleta monocromática", "Postura couture"],
    },
    sampleBriefs: {
      fr: ["Une robe sculpturale bordeaux dans une galerie minérale.", "Une campagne monochrome aux ombres très graphiques.", "Une silhouette couture, immobile et imposante."],
      es: ["Un vestido escultórico burdeos en una galería mineral.", "Una campaña monocromática con sombras muy gráficas.", "Una silueta couture, inmóvil e imponente."],
    },
    creativeDirection: {
      location: { fr: "Galerie minérale aux lignes graphiques", es: "Galería mineral de líneas gráficas" },
      styling: { fr: "Silhouette couture sculpturale", es: "Silueta couture escultórica" },
      energy: { fr: "Imposante, précise et distante", es: "Imponente, precisa y distante" },
      light: { fr: "Ombres architecturales très dessinées", es: "Sombras arquitectónicas muy marcadas" },
      photoStyle: { fr: "Éditorial mode monochrome et sculptural", es: "Editorial de moda monocromo y escultórico" },
      refinements: {
        locations: { fr: ["Galerie minérale", "Cyclorama graphique", "Escalier brutaliste", "Mur d’ombres"], es: ["Galería mineral", "Ciclorama gráfico", "Escalera brutalista", "Muro de sombras"] },
        stylings: { fr: ["Robe sculpturale", "Tailoring oversize", "Silhouette monochrome"], es: ["Vestido escultórico", "Sastrería oversize", "Silueta monocroma"] },
        energies: { fr: ["Imposante", "Radicale", "Silencieuse"], es: ["Imponente", "Radical", "Silenciosa"] },
        lights: { fr: ["Ombres géométriques", "Faisceau latéral", "Lumière zénithale"], es: ["Sombras geométricas", "Haz lateral", "Luz cenital"] },
      },
    },
  },
  {
    id: "night-glamour",
    name: { fr: "Glamour nocturne", es: "Glamour nocturno" },
    eyebrow: { fr: "FLASH · VELOURS · NUIT", es: "FLASH · TERCIOPELO · NOCHE" },
    tagline: { fr: "Une arrivée que personne n’oublie.", es: "Una llegada que nadie olvida." },
    description: {
      fr: "Flash nocturne, velours noir et lumière d’hôtel composent une image confidentielle, spontanée et très maîtrisée.",
      es: "Flash nocturno, terciopelo negro y luz de hotel componen una imagen confidencial, espontánea y muy controlada.",
    },
    image: "/visual-engine/univers/night-glamour.webp",
    keyElements: {
      fr: ["Flash direct nocturne", "Velours noir", "Grain 35 mm", "Arrivée confidentielle"],
      es: ["Flash directo nocturno", "Terciopelo negro", "Grano de 35 mm", "Llegada confidencial"],
    },
    sampleBriefs: {
      fr: ["Une arrivée nocturne dans un hôtel privé, flash direct.", "Une robe noire et un bolide vintage sans marque visible.", "Une image de soirée spontanée, élégante et très VIP."],
      es: ["Una llegada nocturna a un hotel privado, flash directo.", "Un vestido negro y un coche vintage sin marca visible.", "Una imagen de noche espontánea, elegante y muy VIP."],
    },
    creativeDirection: {
      location: { fr: "Arrivée nocturne dans un hôtel privé", es: "Llegada nocturna a un hotel privado" },
      styling: { fr: "Velours noir et bijoux de soirée", es: "Terciopelo negro y joyas de noche" },
      energy: { fr: "Confidentielle, spontanée et assurée", es: "Confidencial, espontánea y segura" },
      light: { fr: "Flash direct et lumières d’hôtel", es: "Flash directo y luces de hotel" },
      photoStyle: { fr: "Instantané nocturne 35 mm très maîtrisé", es: "Instantánea nocturna de 35 mm muy controlada" },
      refinements: {
        locations: { fr: ["Entrée d’hôtel", "Lounge feutré", "Rue nocturne", "Ascenseur miroir"], es: ["Entrada de hotel", "Lounge íntimo", "Calle nocturna", "Ascensor con espejo"] },
        stylings: { fr: ["Robe noire", "Velours profond", "Tailoring de soirée"], es: ["Vestido negro", "Terciopelo profundo", "Sastrería de noche"] },
        energies: { fr: ["Confidentielle", "Spontanée", "Très VIP"], es: ["Confidencial", "Espontánea", "Muy VIP"] },
        lights: { fr: ["Flash direct", "Néons diffus", "Lumière tungstène"], es: ["Flash directo", "Neones difusos", "Luz de tungsteno"] },
      },
    },
  },
  {
    id: "futuristic-muse",
    name: { fr: "Futuristic muse", es: "Musa futurista" },
    eyebrow: { fr: "PRISME · MÉTAL · EAU", es: "PRISMA · METAL · AGUA" },
    tagline: { fr: "Le futur, traité comme une matière précieuse.", es: "El futuro, tratado como una materia preciosa." },
    description: {
      fr: "Reflets aquatiques, métal liquide et lumière prismatique créent un néo-studio spectaculaire mais crédible.",
      es: "Reflejos acuáticos, metal líquido y luz prismática crean un neoestudio espectacular pero creíble.",
    },
    image: "/visual-engine/univers/futuristic-muse.webp",
    keyElements: {
      fr: ["Matière métallique", "Reflets prismatiques", "Eau miroir", "Lignes néo-studio"],
      es: ["Materia metálica", "Reflejos prismáticos", "Agua espejo", "Líneas neoestudio"],
    },
    sampleBriefs: {
      fr: ["Une muse argentée dans un studio d’eau prismatique.", "Un tailoring métallique avec des reflets turquoise.", "Une campagne futuriste minimaliste, nette et luxueuse."],
      es: ["Una musa plateada en un estudio de agua prismática.", "Sastrería metálica con reflejos turquesa.", "Una campaña futurista minimalista, nítida y lujosa."],
    },
    creativeDirection: {
      location: { fr: "Néo-studio d’eau et de métal", es: "Neoestudio de agua y metal" },
      styling: { fr: "Silhouette métallique liquide", es: "Silueta metálica líquida" },
      energy: { fr: "Froide, hypnotique et précieuse", es: "Fría, hipnótica y preciosa" },
      light: { fr: "Reflets prismatiques turquoise et argent", es: "Reflejos prismáticos turquesa y plata" },
      photoStyle: { fr: "Futurisme minimaliste net et crédible", es: "Futurismo minimalista nítido y creíble" },
      refinements: {
        locations: { fr: ["Studio d’eau miroir", "Paroi métallique", "Tunnel prismatique", "Plateau argenté"], es: ["Estudio de agua espejo", "Pared metálica", "Túnel prismático", "Set plateado"] },
        stylings: { fr: ["Tailoring métallique", "Seconde peau argentée", "Volume translucide"], es: ["Sastrería metálica", "Segunda piel plateada", "Volumen translúcido"] },
        energies: { fr: ["Hypnotique", "Souveraine", "Éthérée"], es: ["Hipnótica", "Soberana", "Etérea"] },
        lights: { fr: ["Reflets aquatiques", "Halo turquoise", "Prisme argenté"], es: ["Reflejos acuáticos", "Halo turquesa", "Prisma plateado"] },
      },
    },
  },
  {
    id: "lifestyle-creatrice",
    name: { fr: "Vie de créatrice", es: "Estilo de creadora" },
    eyebrow: { fr: "SUITE · MATIN · PRÉSENCE", es: "SUITE · MAÑANA · PRESENCIA" },
    tagline: { fr: "L’authenticité, élevée au rang de campagne.", es: "La autenticidad, elevada al nivel de campaña." },
    description: {
      fr: "Une matinée en suite, un café privé ou un lounge calme : des instants crédibles, composés avec une finition éditoriale.",
      es: "Una mañana en una suite, un café privado o un lounge tranquilo: momentos creíbles con un acabado editorial.",
    },
    image: "/visual-engine/univers/lifestyle-creatrice.webp",
    keyElements: {
      fr: ["Lumière de fenêtre", "Tailoring décontracté", "Gestes naturels", "Décor de créatrice"],
      es: ["Luz de ventana", "Sastrería relajada", "Gestos naturales", "Entorno de creadora"],
    },
    sampleBriefs: {
      fr: ["Une matinée de créatrice dans une suite lumineuse.", "Un portrait naturel avec carnet, café et caméra.", "Une image chic et spontanée avant une journée de tournage."],
      es: ["Una mañana de creadora en una suite luminosa.", "Un retrato natural con libreta, café y cámara.", "Una imagen chic y espontánea antes de un día de rodaje."],
    },
    creativeDirection: {
      location: { fr: "Suite lumineuse au début de la journée", es: "Suite luminosa al inicio del día" },
      styling: { fr: "Tailoring décontracté et objets personnels", es: "Sastrería relajada y objetos personales" },
      energy: { fr: "Naturelle, active et accessible", es: "Natural, activa y cercana" },
      light: { fr: "Lumière douce de fenêtre", es: "Luz suave de ventana" },
      photoStyle: { fr: "Lifestyle crédible élevé au rang de campagne", es: "Lifestyle creíble elevado a campaña" },
      refinements: {
        locations: { fr: ["Suite du matin", "Café privé", "Studio de créatrice", "Lounge calme"], es: ["Suite matinal", "Café privado", "Estudio creativo", "Lounge tranquilo"] },
        stylings: { fr: ["Tailoring décontracté", "Chemise blanche", "Maille premium"], es: ["Sastrería relajada", "Camisa blanca", "Punto premium"] },
        energies: { fr: ["Naturelle", "Concentrée", "Spontanée"], es: ["Natural", "Concentrada", "Espontánea"] },
        lights: { fr: ["Fenêtre du matin", "Lumière de café", "Fin d’après-midi douce"], es: ["Ventana de mañana", "Luz de café", "Final de tarde suave"] },
      },
    },
  },
]

export function getMiravaUniverse(id: string | null | undefined) {
  return MIRAVA_UNIVERSES.find((universe) => universe.id === id)
}
