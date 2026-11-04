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

## Revalidation 2026-11-04 — projet Supabase de test distant

L’utilisateur a confirmé que le projet Supabase `imwdxkvnfthtoklgesmk` est exclusivement dédié aux tests, ne contient aucune donnée réelle d’établissement et ne doit jamais servir à accéder à la production. L’adaptation du harnais distant est autorisée; aucun déploiement, migration ou écriture en base n’est autorisé dans cette phase.

- La recherche du projet Supabase confirme le projet FOUKOU-NEXA-V1 en région `eu-west-1`. Le snapshot intégré de schéma était en erreur; des requêtes MCP SELECT, limitées à l’identité, aux privilèges et aux métadonnées `information_schema`, ont été utilisées à la place.
- Identité lue en lecture seule : base `postgres`, rôle `postgres`, adresse serveur Supabase distante (non loopback), port serveur `5432`, PostgreSQL `17.11` (`server_version_num=170011`), schéma `public`.
- Profil de privilèges lu : `rolsuper=false`; `CONNECT`, `USAGE` et `CREATE` sont accordés, et le rôle peut créer des bases et des rôles. Le garde épingle donc l’URL et l’identité au projet de test exact, et refuse un superutilisateur ou tout profil qui ne correspond pas à celui revu.
- La requête de métadonnées sur les tables applicatives attendues a renvoyé `[]` : aucun schéma applicatif ni journal `schema_migrations` n’est actuellement présent dans `public`. Les tests d’intégration doivent donc refuser avant leurs INSERT; aucune migration ne sera lancée en phase 0.
- `TEST_DATABASE_URL` et `DATABASE_URL` sont absentes du runtime. `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `POSTGRES_HOST`, `POSTGRES_USER` et `SUPABASE_URL` sont configurées, mais les références vérifiées ne correspondent pas au projet FOUKOU-NEXA-V1 de test. Le harnais n’utilise aucune de ces variables génériques et ne fait jamais de fallback depuis `DATABASE_URL`.
- L’URL fournie dans le chat contient encore un placeholder de mot de passe; aucune valeur secrète n’a été exposée ni utilisée par les tests.

### Garde-fous implémentés

- `scripts/test-database-guard.mjs` n’accepte que `TEST_DATABASE_URL` épinglée au host pooler, port, base et utilisateur du projet de test; impose TLS, désactive les prepared statements du pooler transactionnel et vérifie l’identité serveur et le profil de privilèges avant toute écriture. Les erreurs de connexion ne révèlent pas l’URL.
- Le garde refuse une base sans journal de migrations avant les INSERT des tests d’intégration.
- `tests/database.test.mjs` et `tests/database.integration.test.mjs` utilisent uniquement le helper de garde, jamais `DATABASE_URL`.
- `scripts/run-database-tests.mjs` et `pnpm test:db` refusent explicitement une configuration de test absente ou non conforme. La suite générale peut continuer à signaler les tests DB comme ignorés lorsque la cible dédiée n’est pas configurée.
- `tests/test-database-guard.test.mjs` couvre les URLs conformes et déviantes, les identités de serveur et le profil de privilèges.
- Aucun changement à `scripts/migrate.mjs`, `lib/db.ts`, aux migrations ou à l’application runtime; aucune connexion de production n’a été tentée.

## Vérifications exécutées le 2026-11-04

- `pnpm test` : 43 tests, 40 réussis, 0 échec, 3 ignorés. Les 3 tests DB ont été ignorés parce que `TEST_DATABASE_URL` est absente; les nouveaux tests de garde passent.
- `pnpm test:db` : refus attendu avec code 1 et message `TEST_DATABASE_URL is required. No database connection was attempted.` Aucun appel de connexion n’est effectué quand l’URL manque.
- `git diff --check` : terminé sans sortie ni erreur.
- Aucun test d’intégration PostgreSQL n’a été exécuté : le runtime ne fournit pas de `TEST_DATABASE_URL` pour le projet cible et les migrations ne sont pas appliquées.

## Phase actuelle

**Phase 0 — protections du harnais : implémentées et vérifiées localement.** Le ciblage du projet Supabase de test a été confirmé par des requêtes MCP en lecture seule. La suite PostgreSQL distante reste bloquée : `TEST_DATABASE_URL` manque et le schéma FOUKOU n’est pas migré. La phase 1 reste bloquée; ne lancer aucune migration ni écriture avant son autorisation explicite.

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

### Constats historiques de l’audit local du 2026-11-03

- Le runtime ne fournissait alors aucune URL de base ni instance PostgreSQL locale détectable.
- `tests/database.test.mjs` utilisait `DATABASE_URL` sans garde-fou; ce risque est corrigé dans l’état actuel par l’usage exclusif de `TEST_DATABASE_URL` et la vérification d’identité.

### État après la revalidation distante du 2026-11-04

- Les variables génériques `POSTGRES_URL` du runtime pointent vers un autre projet Supabase; elles ne sont pas utilisées par les tests.
- Le projet de test est identifié et épinglé, mais `TEST_DATABASE_URL` est absent et le schéma applicatif n’existe pas encore. Les tests d’intégration et les migrations restent bloqués.
- Les garde-fous du harnais sont implémentés et les tests locaux passent; aucune migration, écriture de données ou connexion à la production n’a été effectuée.

## Tests et travaux restant à exécuter

- Phase 1 : rendre disponible `TEST_DATABASE_URL` dans l’environnement de test vers le projet Supabase épinglé, puis appliquer les migrations uniquement après autorisation explicite; le schéma applicatif est actuellement absent.
- Phase 2 : vérifier l’historique puis appliquer, dans l’ordre, `001_initial.sql`, `002_tenant_integrity.sql` et `003_school_contact_details.sql`; vérifier tables, colonnes, index, contraintes et relations, notamment adresse, téléphone et e-mail.
- Phase 3 : tester avec PostgreSQL la création, lecture, modification et persistance des établissements, les champs facultatifs et le rejet des valeurs invalides; corriger les défauts confirmés et ajouter les tests de non-régression.
- Phase 4 : tester les rôles, comptes, liaisons aux profils enseignants, connexion/déconnexion, comptes désactivés, profils absents et associations erronées ou multiples.
- Phase 5 : tester les transactions de `saveUser`, `saveSettings` et `saveSchool`, avec erreurs contrôlées et vérification des annulations en cas d’échec d’écriture ou de journalisation.
- Phase 6 : tester l’isolation de deux établissements, la manipulation de `schoolId`, les requêtes SQL, clés étrangères composites, permissions par rôle, actions serveur, espace plateforme et périmètre des enseignants.
- Phase 7 : exécuter et consigner `pnpm typecheck`, `pnpm test`, les tests PostgreSQL, `pnpm build` et `git diff --check`; vérifier que les tests PostgreSQL ne sont pas ignorés lorsque la base est disponible et effectuer la revue complète du diff.
- À ce jour, tous ces travaux restent non exécutés dans le cadre de cette mission; ne pas leur attribuer de résultat à partir d’anciens documents ou de résultats non revérifiés sur ce commit.

## Prérequis initiaux de l’audit local (2026-11-03, remplacés par l’autorisation distante du 2026-11-04)

1. Rendre accessible au runtime des tests une instance PostgreSQL de test dédiée, locale et non partagée, PostgreSQL 13+ selon le prérequis du dépôt. Les tests d’intégration actuels refusent les hôtes autres que `localhost`, `127.0.0.1` ou `::1`.
2. Créer une base dont le nom contient `test` (par exemple un suffixe `_test`) et fournir `TEST_DATABASE_URL` vers cette cible; garder les identifiants hors du dépôt et des journaux.
3. Pour les migrations et le test de connexion, `DATABASE_URL` devra viser **la même base de test locale**, jamais une base de production. Garder `SEED_*` absentes pour éviter tout amorçage involontaire. Définir `DATABASE_SSL=disable` uniquement si l’instance locale n’utilise pas TLS.
4. Avant toute migration, vérifier l’identité exacte de la cible et consulter son historique `schema_migrations`; ne pas réappliquer une migration déjà enregistrée. Cette vérification n’a pas encore été possible.

Si une base PostgreSQL locale ne peut pas être rendue accessible au runtime, la phase 1 demeure bloquée. Une base distante ne satisfait pas les garde-fous locaux actuels des tests d’intégration; ne pas modifier ces garde-fous ni contourner la protection dans cette phase sans décision explicite.

## Fichiers examinés et modifiés

- Examinés : `package.json`, `.env.example`, `README.md`, `PROGRESS.md`, `scripts/migrate.mjs`, `migrations/001_initial.sql`, `migrations/002_tenant_integrity.sql`, `migrations/003_school_contact_details.sql`, `tests/database.test.mjs`, `tests/database.integration.test.mjs`, `lib/db.ts` et les variables d’environnement sans en imprimer les secrets.
- Modifiés : `scripts/test-database-guard.mjs` (nouveau), `scripts/run-database-tests.mjs` (nouveau), `tests/test-database-guard.test.mjs` (nouveau), `tests/database.test.mjs`, `tests/database.integration.test.mjs`, `package.json` et le présent document.
- Inchangés : migrations SQL, `scripts/migrate.mjs`, `lib/db.ts`, configuration et données de la base Supabase.

## Prochaine action précise

1. Rendre disponible, dans l’environnement de test uniquement, `TEST_DATABASE_URL` vers le projet Supabase épinglé. Les variables `POSTGRES_URL` actuellement injectées ne pointent pas vers ce projet et ne doivent pas être réutilisées; ne pas coller le mot de passe dans le chat.
2. Ne pas lancer `pnpm test:db` tant que le schéma applicatif n’a pas été installé dans une phase autorisée. À ce jour, le test de garde dédié refuse correctement l’absence de `TEST_DATABASE_URL`, sans connexion.
3. Après autorisation explicite de la phase suivante, appliquer les migrations uniquement à cette cible confirmée, puis exécuter `pnpm test:db`; ne jamais lancer de migration ou test sur une URL générique ou une base de production.
