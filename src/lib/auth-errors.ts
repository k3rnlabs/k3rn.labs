/**
 * Traduit et formate toutes les erreurs d'authentification Supabase/Réseau
 * pour garantir que l'utilisateur reçoit TOUJOURS des messages dans sa langue (Français).
 */
export function translateAuthError(errorMessage?: string | null): string {
  if (!errorMessage || typeof errorMessage !== "string" || !errorMessage.trim()) {
    return "Une erreur est survenue. Veuillez réessayer."
  }

  const msg = errorMessage.trim()
  const lowerMsg = msg.toLowerCase()

  // 1. Si le message est DÉJÀ en français, on le retourne directement
  const isFrench =
    /[éèêëàâäôöûüçîï]/i.test(msg) ||
    lowerMsg.includes("compte") ||
    lowerMsg.includes("mot de passe") ||
    lowerMsg.includes("erreur") ||
    lowerMsg.includes("échec") ||
    lowerMsg.includes("connexion") ||
    lowerMsg.includes("inscription") ||
    lowerMsg.includes("adresse email") ||
    lowerMsg.includes("réessayer") ||
    lowerMsg.includes("patiente") ||
    lowerMsg.includes("tentatives") ||
    lowerMsg.includes("vérifie") ||
    lowerMsg.includes("valide")

  if (isFrench) {
    return msg
  }

  // 2. Traduction des erreurs Supabase / Réseau en anglais
  if (lowerMsg.includes("email rate limit exceeded") || lowerMsg.includes("rate limit")) {
    return "Trop de tentatives en peu de temps. Patiente 2 minutes avant de réessayer, ou connecte-toi si ton compte est déjà créé."
  }

  if (lowerMsg.includes("user already registered") || lowerMsg.includes("already exists") || lowerMsg.includes("user_already_exists")) {
    return "Un compte existe déjà avec cette adresse email. Essaye de te connecter."
  }

  if (lowerMsg.includes("invalid login credentials") || lowerMsg.includes("invalid credentials")) {
    return "Email ou mot de passe incorrect."
  }

  if (lowerMsg.includes("email not confirmed")) {
    return "Ton adresse email n'a pas encore été confirmée. Vérifie ta boîte de réception."
  }

  if (lowerMsg.includes("user not found")) {
    return "Aucun compte associé à cette adresse email."
  }

  if (lowerMsg.includes("invalid email") || lowerMsg.includes("email address is invalid")) {
    return "L'adresse email saisie n'est pas valide."
  }

  if (lowerMsg.includes("password should be at least") || lowerMsg.includes("password minimum") || lowerMsg.includes("weak password")) {
    return "Le mot de passe doit contenir au moins 6 caractères."
  }

  if (lowerMsg.includes("token is expired") || lowerMsg.includes("token has expired") || lowerMsg.includes("jwt expired")) {
    return "Le lien de réinitialisation est expiré. Veuillez faire une nouvelle demande."
  }

  if (lowerMsg.includes("invalid token") || lowerMsg.includes("token is invalid")) {
    return "Le lien de réinitialisation est invalide ou expiré."
  }

  if (lowerMsg.includes("same password") || lowerMsg.includes("new password should be different")) {
    return "Le nouveau mot de passe doit être différent de l'ancien."
  }

  if (lowerMsg.includes("too many requests")) {
    return "Trop de requêtes envoyées. Patiente un instant avant de réessayer."
  }

  if (lowerMsg.includes("fetch failed") || lowerMsg.includes("network") || lowerMsg.includes("failed to fetch")) {
    return "Problème de connexion réseau au serveur. Vérifie ta connexion et réessaie."
  }

  if (lowerMsg.includes("login failed")) {
    return "Échec de la connexion. Vérifie tes identifiants et réessaie."
  }

  if (lowerMsg.includes("signup failed")) {
    return "Échec de l'inscription. Vérifie tes informations et réessaie."
  }

  return msg
}
