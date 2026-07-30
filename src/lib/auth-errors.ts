/**
 * Traduit et formate toutes les erreurs et messages d'authentification Supabase/Réseau
 * pour garantir que l'utilisateur reçoit TOUJOURS des messages dans la langue sélectionnée (FR/ES).
 */
export function translateAuthError(
  errorMessage?: string | null,
  lang: "fr" | "es" = "fr"
): string {
  if (!errorMessage || typeof errorMessage !== "string" || !errorMessage.trim()) {
    return lang === "es"
      ? "Ocurrió un error. Por favor inténtalo de nuevo."
      : "Une erreur est survenue. Veuillez réessayer."
  }

  const msg = errorMessage.trim()
  const lowerMsg = msg.toLowerCase()

  // 1. Notice succès création de compte
  if (
    lowerMsg.includes("compte créé — vérifiez votre email") ||
    lowerMsg.includes("cuenta creada — revisa tu email") ||
    lowerMsg.includes("cuenta creada — revisa tu correo") ||
    lowerMsg.includes("compte créé — vérifiez votre email pour confirmer") ||
    lowerMsg.includes("cuenta creada — revisa tu email para confirmar") ||
    lowerMsg.includes("cuenta creada — revisa tu correo para confirmar")
  ) {
    return lang === "es"
      ? "Cuenta creada — revisa tu correo para confirmar."
      : "Compte créé — vérifiez votre email pour confirmer."
  }

  if (
    lowerMsg.includes("compte créé ! vérifiez votre boîte mail") ||
    lowerMsg.includes("¡cuenta creada! revisa tu correo") ||
    lowerMsg.includes("compte créé ! vérifie ta boîte mail")
  ) {
    return lang === "es"
      ? "¡Cuenta creada! Revisa tu correo (y tu carpeta de Spam). Si la confirmación automática está activa, también puedes iniciar sesión directamente."
      : "Compte créé ! Vérifiez votre boîte mail (et vos indésirables/Spam). Si la confirmation automatique est activée, vous pouvez aussi vous connecter directement."
  }

  // 2. Erreurs de Rate Limit
  if (
    lowerMsg.includes("email rate limit exceeded") ||
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("trop de tentatives") ||
    lowerMsg.includes("demasiados intentos")
  ) {
    return lang === "es"
      ? "Demasiados intentos en poco tiempo. Espera 2 minutos antes de reintentar, o inicia sesión si tu cuenta ya existe."
      : "Trop de tentatives en peu de temps. Patiente 2 minutes avant de réessayer, ou connecte-toi si ton compte est déjà créé."
  }

  // 3. Compte déjà existant
  if (
    lowerMsg.includes("user already registered") ||
    lowerMsg.includes("already exists") ||
    lowerMsg.includes("user_already_exists") ||
    lowerMsg.includes("un compte existe déjà") ||
    lowerMsg.includes("ya existe una cuenta")
  ) {
    return lang === "es"
      ? "Ya existe una cuenta con este correo electrónico. Intenta iniciar sesión."
      : "Un compte existe déjà avec cette adresse email. Essaye de te connecter."
  }

  // 4. Identifiants invalides
  if (
    lowerMsg.includes("invalid login credentials") ||
    lowerMsg.includes("invalid credentials") ||
    lowerMsg.includes("email ou mot de passe incorrect") ||
    lowerMsg.includes("correo electrónico o contraseña incorrectos")
  ) {
    return lang === "es"
      ? "Correo electrónico o contraseña incorrectos."
      : "Email ou mot de passe incorrect."
  }

  // 5. Email non confirmé
  if (
    lowerMsg.includes("email not confirmed") ||
    lowerMsg.includes("adresse email n'a pas encore été confirmée") ||
    lowerMsg.includes("correo electrónico aún no ha sido confirmado")
  ) {
    return lang === "es"
      ? "Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada."
      : "Ton adresse email n'a pas encore été confirmée. Vérifie ta boîte de réception."
  }

  // 6. Utilisateur non trouvé
  if (
    lowerMsg.includes("user not found") ||
    lowerMsg.includes("aucun compte associé") ||
    lowerMsg.includes("no hay ninguna cuenta")
  ) {
    return lang === "es"
      ? "No hay ninguna cuenta asociada a este correo electrónico."
      : "Aucun compte associé à cette adresse email."
  }

  // 7. Email invalide
  if (
    lowerMsg.includes("invalid email") ||
    lowerMsg.includes("email address is invalid") ||
    lowerMsg.includes("l'adresse email saisie n'est pas valide") ||
    lowerMsg.includes("la dirección de correo ingresada no es válida")
  ) {
    return lang === "es"
      ? "La dirección de correo ingresada no es válida."
      : "L'adresse email saisie n'est pas valide."
  }

  // 8. Mot de passe trop court
  if (
    lowerMsg.includes("password should be at least") ||
    lowerMsg.includes("password minimum") ||
    lowerMsg.includes("weak password") ||
    lowerMsg.includes("mot de passe doit contenir au moins") ||
    lowerMsg.includes("contraseña debe tener al menos") ||
    lowerMsg === "passwordshort"
  ) {
    return lang === "es"
      ? "La contraseña debe tener al menos 6 caracteres."
      : "Le mot de passe doit contenir au moins 6 caractères."
  }

  // 9. Mots de passe ne correspondent pas
  if (
    lowerMsg.includes("mots de passe ne correspondent pas") ||
    lowerMsg.includes("contraseñas no coinciden") ||
    lowerMsg.includes("passwords do not match") ||
    lowerMsg === "passwordmismatch"
  ) {
    return lang === "es"
      ? "Las contraseñas no coinciden."
      : "Les mots de passe ne correspondent pas."
  }

  // 10. Token expiré
  if (
    lowerMsg.includes("token is expired") ||
    lowerMsg.includes("token has expired") ||
    lowerMsg.includes("jwt expired") ||
    lowerMsg.includes("lien de réinitialisation est expiré") ||
    lowerMsg.includes("enlace de restablecimiento ha expirado")
  ) {
    return lang === "es"
      ? "El enlace de restablecimiento ha expirado. Por favor haz una nueva solicitud."
      : "Le lien de réinitialisation est expiré. Veuillez faire une nouvelle demande."
  }

  // 11. Token invalide
  if (
    lowerMsg.includes("invalid token") ||
    lowerMsg.includes("token is invalid") ||
    lowerMsg.includes("lien de réinitialisation est invalide") ||
    lowerMsg.includes("enlace de restablecimiento no es válido")
  ) {
    return lang === "es"
      ? "El enlace de restablecimiento no es válido o ha expirado."
      : "Le lien de réinitialisation est invalide ou expiré."
  }

  // 12. Même mot de passe
  if (
    lowerMsg.includes("same password") ||
    lowerMsg.includes("new password should be different") ||
    lowerMsg.includes("nouveau mot de passe doit être différent") ||
    lowerMsg.includes("nueva contraseña debe ser diferente")
  ) {
    return lang === "es"
      ? "La nueva contraseña debe ser diferente de la anterior."
      : "Le nouveau mot de passe doit être différent de l'ancien."
  }

  // 13. Lien mot de passe envoyé
  if (
    lowerMsg.includes("si un compte est associé à cet email") ||
    lowerMsg.includes("si un compte existe avec cet email") ||
    lowerMsg.includes("si hay una cuenta asociada")
  ) {
    return lang === "es"
      ? "Si hay una cuenta asociada a este correo, se acaba de enviar un enlace."
      : "Si un compte est associé à cet email, un lien vient d'être envoyé."
  }

  // 14. Mot de passe réinitialisé / mis à jour
  if (
    lowerMsg.includes("mot de passe mis à jour avec succès") ||
    lowerMsg.includes("contraseña actualizada con éxito") ||
    lowerMsg.includes("mot de passe réinitialisé avec succès")
  ) {
    return lang === "es"
      ? "¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión…"
      : "Mot de passe mis à jour avec succès ! Redirection vers la connexion…"
  }

  // 15. Trop de requêtes
  if (
    lowerMsg.includes("too many requests") ||
    lowerMsg.includes("trop de requêtes") ||
    lowerMsg.includes("demasiadas solicitudes")
  ) {
    return lang === "es"
      ? "Demasiadas solicitudes enviadas. Espera un momento antes de reintentar."
      : "Trop de requêtes envoyées. Patiente un instant avant de réessayer."
  }

  // 16. Erreur réseau / fetch failed
  if (
    lowerMsg.includes("fetch failed") ||
    lowerMsg.includes("network") ||
    lowerMsg.includes("failed to fetch") ||
    lowerMsg.includes("problème de connexion réseau") ||
    lowerMsg.includes("problema de conexión de red")
  ) {
    return lang === "es"
      ? "Problema de conexión de red al servidor. Revisa tu conexión e inténtalo de nuevo."
      : "Problème de connexion réseau au serveur. Vérifie ta connexion et réessaie."
  }

  // 17. Échec de connexion par défaut
  if (
    lowerMsg.includes("login failed") ||
    lowerMsg.includes("échec de la connexion") ||
    lowerMsg.includes("error de inicio de sesión")
  ) {
    return lang === "es"
      ? "Error de inicio de sesión. Revisa tus credenciales e inténtalo de nuevo."
      : "Échec de la connexion. Vérifie tes identifiants et réessaie."
  }

  // 18. Échec d'inscription par défaut
  if (
    lowerMsg.includes("signup failed") ||
    lowerMsg.includes("échec de l'inscription") ||
    lowerMsg.includes("error de registro")
  ) {
    return lang === "es"
      ? "Error de registro. Revisa tu información e inténtalo de nuevo."
      : "Échec de l'inscription. Vérifie tes informations et réessaie."
  }

  // 19. Confirmation d'email
  if (
    lowerMsg.includes("confirmation_failed") ||
    lowerMsg.includes("lien de confirmation est invalide") ||
    lowerMsg.includes("enlace de confirmación no es válido")
  ) {
    return lang === "es"
      ? "El enlace de confirmación no es válido o ha expirado."
      : "Le lien de confirmation est invalide ou expiré."
  }

  if (
    lowerMsg.includes("email_confirmed") ||
    lowerMsg.includes("confirmed_success") ||
    lowerMsg.includes("email confirmé avec succès") ||
    lowerMsg.includes("correo confirmado con éxito")
  ) {
    return lang === "es"
      ? "¡Correo confirmado con éxito! Ya puedes acceder a tu estudio."
      : "Email confirmé avec succès ! Vous pouvez maintenant accéder à votre studio."
  }

  // 20. Renvoi d'email de confirmation
  if (
    lowerMsg.includes("resend_success") ||
    lowerMsg.includes("email de confirmation renvoyé") ||
    lowerMsg.includes("correo de confirmación reenviado")
  ) {
    return lang === "es"
      ? "¡Correo de confirmación reenviado! Revisa tu bandeja de entrada (y tu carpeta de Spam)."
      : "Email de confirmation renvoyé ! Vérifiez votre boîte mail (et vos indésirables/Spam)."
  }

  if (
    lowerMsg.includes("resend_email_required") ||
    lowerMsg.includes("veuillez saisir votre adresse email pour renvoyer") ||
    lowerMsg.includes("ingresa tu correo electrónico pour reenviar")
  ) {
    return lang === "es"
      ? "Por favor ingresa tu correo electrónico para reenviar el enlace."
      : "Veuillez saisir votre adresse email ci-dessus pour renvoyer le lien."
  }

  // 21. Erreurs PKCE & Code Verifier Supabase (ouverture cross-navigateur / cross-device)
  if (
    lowerMsg.includes("code challenge does not match") ||
    lowerMsg.includes("code verifier") ||
    lowerMsg.includes("flow_state_not_found") ||
    lowerMsg.includes("pkce_cookie_missing")
  ) {
    return lang === "es"
      ? "El enlace de confirmación no es válido o se abrió en otro navegador. Por favor ingresa tu correo para recibir un nuevo enlace."
      : "Le lien de confirmation est invalide ou a été ouvert dans un autre navigateur. Veuillez saisir votre email pour renvoyer un nouveau lien."
  }

  if (
    lowerMsg.includes("invalid grant") ||
    lowerMsg.includes("invalid_grant") ||
    lowerMsg.includes("session not found") ||
    lowerMsg.includes("auth session missing")
  ) {
    return lang === "es"
      ? "La sesión de confirmación ha expirado. Por favor solicita un nuevo enlace."
      : "La session de confirmation a expiré. Veuillez demander un nouvel email."
  }

  // 22. Sécurité : Si le message contient encore du texte anglais non traduit, on retourne un fallback propre
  if (/code challenge|verifier|grant|token|auth|session|invalid|expired/i.test(msg)) {
    return lang === "es"
      ? "Ocurrió un error con el enlace de confirmación. Por favor solicita un nuevo correo."
      : "Une erreur est survenue avec le lien de confirmation. Veuillez demander un nouvel email."
  }

  return msg
}
