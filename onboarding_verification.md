# Rapport de Vérification — Infrastructure Onboarding Supabase
**Projet :** k3rn (`grdghxkowakgiqhybnrp`) — région `eu-central-1`
**Date :** 2026-03-10
**Statut final :** ✅ Tous les checks passent

---

## Contexte

Ce rapport documente la vérification et la mise en place de l'automatisation onboarding pour le système billing/crédit/mission de k3rn.labs.

L'objectif est de garantir que l'insertion d'un nouvel utilisateur déclenche automatiquement :
1. La création d'un **wallet de crédits** (`credit_wallets`)
2. L'attribution d'une **souscription freemium** (`subscriptions`)

Et que la fonction helper `grant_credits()` permet d'alimenter le wallet et de tracer chaque opération dans le ledger (`credit_transactions`).

---

## Architecture — Deux tables utilisateurs

> [!IMPORTANT]
> Ce projet contient **deux tables `users` distinctes**, chacune avec son propre flux onboarding.

| Table | Clé primaire | Utilisée par |
|-------|-------------|--------------|
| `public.users` | `uuid` (auto-généré) + `telegram_user_id bigint` | n8n, Kael, bot Telegram |
| `public."User"` | `text` (cuid Prisma) | SaaS web app, Prisma ORM |

Les triggers d'onboarding sont actifs sur **les deux tables**.

---

## État initial constaté

Avant intervention, la migration d'onboarding référencée dans les tickets **n'avait jamais été appliquée**.

| Élément | État initial |
|---------|-------------|
| Triggers sur `public.users` | ❌ Absents |
| Triggers sur `public."User"` | ❌ Absents |
| Fonctions trigger | ❌ Absentes |
| Plan freemium | ❌ Absent (`plans` vide) |
| `grant_credits()` | ❌ Absente |
| Tables billing (`credit_wallets`, `subscriptions`, `credit_transactions`) | ✅ Existantes mais vides |

Un problème de type supplémentaire a été détecté : les tables billing avaient `user_id uuid` avec FK vers une table `public.users` legacy de Supabase Auth, incompatible avec les deux systèmes utilisateurs actuels.

---

## Migrations appliquées

### 1. `add_onboarding_triggers_and_freemium_plan`

Création de l'infrastructure initiale sur `public."User"` (Prisma) :

- Insertion du plan `freemium` dans `plans`
- Création de `handle_new_user_wallet()`
- Création de `handle_new_user_subscription()`
- Création de `grant_credits()`
- Triggers `trg_users_create_wallet` et `trg_users_create_subscription` sur `public."User"`

---

### 2. `fix_billing_user_id_type`

Correction du type `user_id` dans les tables billing :

- Suppression des FK obsolètes vers `public.users` uuid legacy
- Passage de `user_id uuid → text` dans `credit_wallets`, `subscriptions`, `credit_transactions`
- Mise à jour des fonctions trigger (suppression du cast `::uuid`)
- Mise à jour de `grant_credits()` pour accepter `text`

---

### 3. `fix_grant_credits_type_casing`

Correction du type de transaction :

- `credit_transactions.type` a un CHECK constraint avec valeurs **lowercase**
- `'GRANT'` → `'grant'` dans `grant_credits()`

Valeurs autorisées : `grant`, `reserve`, `consume`, `release`, `topup`, `refund`, `adjustment`

---

### 4. `add_onboarding_triggers_on_telegram_users`

Ajout des triggers sur `public.users` (table Telegram/n8n) :

- Mise à jour des fonctions pour utiliser `NEW.id::text` (compatible uuid et cuid)
- Triggers `trg_users_create_wallet` et `trg_users_create_subscription` sur `public.users`

---

## Résultats de vérification

### Triggers

| Trigger | Table | Timing | Fonction | Statut |
|---------|-------|--------|----------|--------|
| `trg_users_create_wallet` | `public.users` | AFTER INSERT | `handle_new_user_wallet()` | ✅ ENABLED |
| `trg_users_create_subscription` | `public.users` | AFTER INSERT | `handle_new_user_subscription()` | ✅ ENABLED |
| `trg_users_create_wallet` | `public."User"` | AFTER INSERT | `handle_new_user_wallet()` | ✅ ENABLED |
| `trg_users_create_subscription` | `public."User"` | AFTER INSERT | `handle_new_user_subscription()` | ✅ ENABLED |

---

### Fonctions

| Fonction | Signature | Statut |
|----------|-----------|--------|
| `handle_new_user_wallet` | `() → trigger` | ✅ |
| `handle_new_user_subscription` | `() → trigger` | ✅ |
| `grant_credits` | `(p_user_id text, p_amount integer) → void` | ✅ |

---

### Plan Freemium

```
id:              b719037c-65f2-447d-bd66-e0e77998fe1c
code:            freemium
name:            Freemium
monthly_credits: 5
price_amount:    0 EUR
is_active:       true
```

---

## Test End-to-End — `public.users` (Telegram)

```sql
INSERT INTO public.users (telegram_user_id, telegram_username, first_name)
VALUES (999999999, 'test_user', 'Test')
RETURNING id;
```

### Résultats automatiquement générés

**`credit_wallets`**
```
user_id  = <uuid retourné>
balance  = 0
```

**`subscriptions`**
```
user_id  = <uuid retourné>
plan_id  = b719037c-65f2-447d-bd66-e0e77998fe1c  (freemium)
status   = active
starts_at = now()
```

### Test `grant_credits(user_id, 5)`

**`credit_wallets`** après appel :
```
balance = 5
```

**`credit_transactions`** :
```
user_id      = <uuid retourné>
type         = grant
amount       = 5
balance_after = 5
source       = system
```

---

## Flux Kael — Éligibilité mission

```
INSERT users
  → trg_users_create_wallet      → credit_wallets (balance = 0)
  → trg_users_create_subscription → subscriptions (plan = freemium, status = active)

Plan freemium
  → monthly_credits = 5

grant_credits(user_id, 5)
  → credit_wallets.balance += 5
  → credit_transactions (type = 'grant')

Kael évalue :
  user → subscription (freemium, active) → wallet (balance ≥ 1) → mission éligible
```

---

## Notes importantes pour n8n

> [!NOTE]
> `grant_credits()` prend un **`text`** en premier argument.
> - Pour `public.users` : passer `id::text` (représentation string de l'uuid)
> - Pour `public."User"` : passer directement le cuid Prisma

> [!WARNING]
> Ne pas confondre les deux tables `users`. Les workflows n8n liés au bot Telegram doivent utiliser `public.users`. Le SaaS web utilise `public."User"`.
