import { describe, expect, it } from "vitest"
import { translateAuthError } from "./auth-errors"

describe("MIRAVA authentication error language", () => {
  it("keeps local email validation in the current interface language", () => {
    expect(translateAuthError("Saisissez une adresse email valide.", "es")).toBe("La dirección de correo ingresada no es válida.")
    expect(translateAuthError("Introduce una dirección de email válida.", "fr")).toBe("L'adresse email saisie n'est pas valide.")
  })

  it("keeps password confirmation errors translated after a language switch", () => {
    expect(translateAuthError("passwordMismatch", "fr")).toBe("Les mots de passe ne correspondent pas.")
    expect(translateAuthError("passwordMismatch", "es")).toBe("Las contraseñas no coinciden.")
  })
})
