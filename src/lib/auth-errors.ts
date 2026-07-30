/**
 * Traduit et formate toutes les erreurs d'authentification Supabase/Réseau
 * pour garantir que l'utilisateur reçoit TOUJOURS des messages dans sa langue (Français).
 */
export function translateAuthError(errorMessage?: string | null): string {
  if (!errorMessage) return "Une erreur est survenue. Veuillez réessayer."

  const msg = errorMessage.toLowerCase()

  if (msg.includes("email rate limit exceeded") || msg.includes("rate limit")) {
    return "Trop de tentatives en peu de temps. Patiente 2 minutes avant de réessayer, ou connecte-toi si ton compte est déjà créé."
  }

  if (msg.includes("user already registered") || msg.includes("already exists")) {
    return "Un compte existe déjà avec cette adresse email. Essaye de te connecter."
  }

  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return "Email ou mot de passe incorrect."
  }

  if (msg.includes("email not confirmed")) {
    return "Ton adresse email n'a pas encore été confirmée. Vérifie ta boîte de réception."
  }

  if (msg.includes("user not found")) {
    return "Aucun compte associé à cette adresse email."
  }

  if (msg.includes("invalid email") || msg.includes("email address is invalid")) {
    return "L'adresse email saisie n'est pas valide."
  }

  if (msg.includes("password should be at least") || msg.includes("password minimum") || msg.includes("weak password")) {
    return "Le mot de passe doit contenir au moins 6 caractères."
  }

  if (msg.includes("token is expired") || msg.includes("token has expired") || msg.includes("jwt expired")) {
    return "Le lien de réinitialisation est expiré. Veuillez faire une nouvelle demande."
  }

  if (msg.includes("invalid token") || msg.includes("token is invalid")) {
    return "Le lien de réinitialisation est invalide ou expiré."
  }

  if (msg.includes("same password") || msg.includes("new password should be different")) {
    return "Le nouveau mot de passe doit être différent de l'ancien."
  }

  if (msg.includes("too many requests")) {
    return "Trop de requêtes envoyées. Patiente un instant avant de réessayer."
  }

  if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("failed to fetch")) {
    return "Problème de connexion réseau au serveur. Vérifie ta connexion et réessaie."
  }

  if (msg.includes("login failed")) {
    return "Échec de la connexion. Vérifie tes identifiants et réessaie."
  }

  if (msg.includes("signup failed")) {
    return "Échec de l'inscription. Vérifie tes informations et réessaie."
  }

  // Détection si le message restant contient de l'anglais technique Supabase
  const containsEnglish = /[a-zA-Z]/.test(errorMessage) && !/[éèêëàâäôöûüçîï]/i.test(errorMessage)
  if (containsEnglish) {
    return "Une erreur d'authentification est survenue. Vérifie tes informations et réessaie."
  }

  return errorMessage
}
