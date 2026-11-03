# Validation PostgreSQL de FOUKOU-NEXA

## Objectif général

Valider le fonctionnement réel de FOUKOU-NEXA avec PostgreSQL, ses migrations, les parcours de gestion scolaire, les comptes, les transactions et l’isolation inter-établissements. Corriger uniquement les défauts confirmés, ajouter des tests de non-régression et conserver une progression reprenable sans utiliser de base de production.

## Référence du dépôt

- Dépôt : `futuristic77/FOUKOU-NEXA-v1`
- Branche obligatoire : `fix/production-build-feat-school-backend-v1`
- Commit de départ attendu : `8caa5002fd169765151d01ef0e61e77c660d1c25`
- Branche et commit constatés le 2026-11-03 : conformes aux références ci-dessus.
- État Git à l’ouverture : propre (`git status --porcelain=v1` et `git diff --stat` sans sortie).
- Dernier commit de code validé : `8caa5002fd169765151d01ef0e61e77c660d1c25` — uniquement l’état de départ confirmé; aucune validation PostgreSQL n’a été exécutée dans cette phase.
- Aucun changement à `main`, aucune fusion, aucun déploiement et aucune connexion à une base n’ont été effectués.

## Phase actuelle

**Phase 1 — préparation de la base de test : BLOQUÉE, non commencée.** Le runtime ne fournit pas de PostgreSQL local ni de cible de test configurée. La création ou la sélection d’une base isolée ne peut donc pas être garantie. Ne pas lancer de migration ni de test d’intégration avant de lever ce blocage.

## Phases terminées

### Phase 0 — vérification et préparation

**Terminée le 2026-11-03.** Vérifications en lecture seule uniquement. Aucun test, aucune connexion PostgreSQL, aucune migration et aucune modification du code métier.

### Vérifications réellement exécutées et résultats

- `git status --short --branch` : `## fix/production-build-feat-school-backend-v1`.
- `git branch --show-current` : `fix/production-build-feat-school-backend-v1`.
- `git rev-parse HEAD` : `8caa5002fd169765151d01ef0e61e77c660d1c25`.
- `git status --porcelain=v1` : aucune sortie; arbre propre à l’ouverture.
- `git diff --stat` : aucune sortie à l’ouverture.
- Version Node détectée : `v24.16.0`.
- Détection des outils `psql`, `pg_isready`, `postgres`, `initdb`, `docker` et `podman` : aucun exécutable trouvé dans le `PATH`. `pg_isready` et `docker info` n’ont donc pas pu être exécutés; la présence d’un serveur PostgreSQL local n’a pas pu être démontrée.
- Vérification de présence des variables, sans afficher leurs valeurs, en chargeant `/vercel/share/.env.project` et `.env.development.local` : `DATABASE_URL`, `TEST_DATABASE_URL`, `DATABASE_SSL`, `PGHOST`, `PGPORT` et `PGDATABASE` absentes.
- Vérification des variables d’amorçage, sans afficher leurs valeurs : `SEED_SCHOOL_NAME`, `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` absentes.
- Inventaire des intégrations et variables v0 : seule l’intégration Vercel AI Gateway est connectée; le seul nom de variable de projet retourné est `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`. Aucune intégration de base PostgreSQL n’est disponible dans cet inventaire.
- Lecture statique des migrations et du lanceur : les trois fichiers demandés existent; `scripts/migrate.mjs` utilise `DATABASE_URL`, crée/consulte `schema_migrations` puis applique les fichiers SQL numérotés non enregistrés. Il peut aussi créer un établissement et un compte si les variables `SEED_*` sont fournies.
- Lecture des tests : les tests d’intégration dans `tests/database.integration.test.mjs` utilisent `TEST_DATABASE_URL` et vérifient que l’hôte est local (`localhost`, `127.0.0.1` ou `::1`) et que le nom de la base contient `test` avant la connexion.
- **Risque de sécurité confirmé à traiter avant les tests** : `tests/database.test.mjs` contient un test de connexion qui utilise directement `DATABASE_URL` et ne vérifie que l’absence de la variable pour décider de l’ignorer. Si une URL de production était héritée dans `DATABASE_URL`, `pnpm test` tenterait une connexion à cette base pour exécuter `SELECT 1`. Le test est en lecture seule, mais il ne constitue pas une protection contre l’accès à la production.
- Aucune requête au catalogue ni à `schema_migrations` n’a été faite : l’état des migrations d’une base existante est inconnu.
- Aucun test ni aucune migration n’a été exécuté, conformément à la consigne de rester en phase 0 et faute de cible isolée vérifiable.

## Défauts, risques et corrections

- **Blocage d’infrastructure** : aucune URL de base ni instance PostgreSQL locale détectable n’est disponible dans le runtime actuel; une base exclusivement dédiée aux tests ne peut pas être garantie.
- **Risque de ciblage des tests** : le test de connexion de `tests/database.test.mjs` accepte `DATABASE_URL` sans garde-fou local ou test-only. Ne jamais exécuter la suite avec une URL de production dans cette variable. Ce risque est consigné; aucune correction de code n’a été faite en phase 0.
- **Corrections effectuées** : aucune. Seul le présent document de suivi a été créé.

## Tests et travaux restant à exécuter

- Phase 1 : rendre disponible et vérifier une base PostgreSQL de test exclusivement dédiée.
- Phase 2 : vérifier l’historique puis appliquer, dans l’ordre, `001_initial.sql`, `002_tenant_integrity.sql` et `003_school_contact_details.sql`; vérifier tables, colonnes, index, contraintes et relations, notamment adresse, téléphone et e-mail.
- Phase 3 : tester avec PostgreSQL la création, lecture, modification et persistance des établissements, les champs facultatifs et le rejet des valeurs invalides; corriger les défauts confirmés et ajouter les tests de non-régression.
- Phase 4 : tester les rôles, comptes, liaisons aux profils enseignants, connexion/déconnexion, comptes désactivés, profils absents et associations erronées ou multiples.
- Phase 5 : tester les transactions de `saveUser`, `saveSettings` et `saveSchool`, avec erreurs contrôlées et vérification des annulations en cas d’échec d’écriture ou de journalisation.
- Phase 6 : tester l’isolation de deux établissements, la manipulation de `schoolId`, les requêtes SQL, clés étrangères composites, permissions par rôle, actions serveur, espace plateforme et périmètre des enseignants.
- Phase 7 : exécuter et consigner `pnpm typecheck`, `pnpm test`, les tests PostgreSQL, `pnpm build` et `git diff --check`; vérifier que les tests PostgreSQL ne sont pas ignorés lorsque la base est disponible et effectuer la revue complète du diff.
- À ce jour, tous ces travaux restent non exécutés dans le cadre de cette mission; ne pas leur attribuer de résultat à partir d’anciens documents ou de résultats non revérifiés sur ce commit.

## Prérequis pour reprendre en phase 1

1. Rendre accessible au runtime des tests une instance PostgreSQL de test dédiée, locale et non partagée, PostgreSQL 13+ selon le prérequis du dépôt. Les tests d’intégration actuels refusent les hôtes autres que `localhost`, `127.0.0.1` ou `::1`.
2. Créer une base dont le nom contient `test` (par exemple un suffixe `_test`) et fournir `TEST_DATABASE_URL` vers cette cible; garder les identifiants hors du dépôt et des journaux.
3. Pour les migrations et le test de connexion, `DATABASE_URL` devra viser **la même base de test locale**, jamais une base de production. Garder `SEED_*` absentes pour éviter tout amorçage involontaire. Définir `DATABASE_SSL=disable` uniquement si l’instance locale n’utilise pas TLS.
4. Avant toute migration, vérifier l’identité exacte de la cible et consulter son historique `schema_migrations`; ne pas réappliquer une migration déjà enregistrée. Cette vérification n’a pas encore été possible.

Si une base PostgreSQL locale ne peut pas être rendue accessible au runtime, la phase 1 demeure bloquée. Une base distante ne satisfait pas les garde-fous locaux actuels des tests d’intégration; ne pas modifier ces garde-fous ni contourner la protection dans cette phase sans décision explicite.

## Fichiers examinés et modifiés

- Examinés : `package.json`, `.env.example`, `README.md`, `PROGRESS.md`, `scripts/migrate.mjs`, `migrations/001_initial.sql`, `migrations/002_tenant_integrity.sql`, `migrations/003_school_contact_details.sql`, `tests/database.test.mjs`, `tests/database.integration.test.mjs`, et références à `DATABASE_URL` dans `lib/db.ts`.
- Modifié : `docs/POSTGRESQL_VALIDATION_PROGRESS.md` uniquement.

## Prochaine action précise

Fournir au runtime une instance PostgreSQL locale exclusivement dédiée aux tests, puis définir `TEST_DATABASE_URL` et `DATABASE_URL` vers cette même base de test (sans URL de production et sans variables `SEED_*`). À la reprise, relire ce document, revérifier branche, commit et état Git, confirmer l’identité locale et le nom de la base, puis terminer uniquement la phase 1. N’exécuter aucune migration avant la validation écrite de la phase 1.
