# FOUKOU-NEXA-V1 — suivi de reprise

## Source de vérité

- Dépôt : `futuristic77/FOUKOU-NEXA-v1`
- Branche de travail : `feat/school-backend-v1`
- Dernier commit de code distant confirmé : `99953f01225f727e7ad3c2bff6ec6969778a5932`
- Le dernier commit vérifié est le lot de filtrage SQL des enseignants décrit ci-dessous. Cette mise à jour de suivi sera publiée en commit documentaire distinct ; relire l’état distant avant toute reprise.
- Aucun changement n’a été poussé sur `main`. Aucun déploiement ni accès à une base de production n’a été effectué.

## Phase actuelle

Phase 2 — sécurité, isolation des établissements et fiabilité des écritures. Le premier lot est publié ; les contrôles et limites ci-dessous restent à suivre.

### Résultats confirmés

- **VALIDÉ** — La migration `002_tenant_integrity.sql` s’applique sur une base PostgreSQL 16 locale vide.
- **VALIDÉ** — Des tests PostgreSQL confirment le rejet de références entre établissements pour les utilisateurs enseignants, classes, élèves, affectations, notes, présences, emplois du temps, communications et journaux d’activité.
- **VALIDÉ** — Sur une base jetable contenant une ancienne référence élève/classe inter-établissements, la migration échoue et sa transaction laisse les données intactes.
- **VALIDÉ** — `pnpm test` avec `TEST_DATABASE_URL` local : 26 tests réussis, 0 échec, 0 ignoré.
- **VALIDÉ** — `pnpm typecheck` : réussite.
- **VALIDÉ** — `pnpm install --frozen-lockfile` : réussite après synchronisation du lockfile avec `package.json`.
- **VALIDÉ** — Le chargeur SQL enseignant a été testé sur PostgreSQL UTF-8 : il ne renvoie que la classe affectée, ses élèves/notes/présences/emplois du temps, les annonces explicitement ouvertes et les journaux de l’enseignant. Les données d’une classe non affectée sont exclues avant mapping.
- **IMPLÉMENTÉ NON VALIDÉ** — `saveAttendance` utilise désormais une transaction, verrouille les écritures élève/date et recontrôle l’ancienne et la nouvelle classe. Le helper d’autorisation est testé, mais l’action serveur n’a pas encore de test de bout en bout ni de test de concurrence.
- **BLOQUÉ** — Le build de production ne termine pas dans l’environnement de travail. Turbopack a signalé une compilation réussie puis n’a pas terminé ; une seconde tentative Webpack est restée sans étape ni erreur jusqu’à son arrêt. Ne pas annoncer le build comme réussi.
- **INCONNU** — Aucun résultat GitHub Actions n’a été trouvé pour cette branche lors du contrôle ; aucun statut CI n’est établi.

## Lot publié

Commit : `d64de1bc1ce39c66f19bc629a1e4e46e4e92246e` — `fix: enforce tenant-safe attendance and database relations`

- Remplacement de l’upsert de présence par une transaction avec vérification des classes autorisées.
- Ajout de clés étrangères composites et validation explicite des relations entre établissements.
- Mise à jour du lanceur pour appliquer les migrations SQL numérotées dans l’ordre.
- Ajout de tests unitaires et d’intégration PostgreSQL ; documentation des prérequis de test et de migration.
- Synchronisation du lockfile, exclusion des fichiers TypeScript générés et suppression de données de démonstration inutilisées.

Fichiers touchés : `.gitignore`, `README.md`, `app/actions.ts`, `components/foukou/data.ts` (supprimé), `lib/db.ts`, `lib/teacher-scope.mjs`, `migrations/002_tenant_integrity.sql`, `pnpm-lock.yaml`, `scripts/migrate.mjs`, `tests/database.integration.test.mjs`, `tests/database.test.mjs`, `tests/security.test.mjs`.

Commit : `99953f01225f727e7ad3c2bff6ec6969778a5932` — `fix: scope teacher reads at query time`

- Les requêtes de lecture enseignante filtrent maintenant les lignes autorisées en SQL, avec les vérifications `school_id` dans les jointures.
- Les profils, affectations et utilisateurs sont verrouillés en lecture pendant le chargement enseignant afin que les droits restent cohérents jusqu’à la fin de la requête.
- Les tests d’intégration utilisent le chargeur réel contre PostgreSQL UTF-8 et couvrent une classe assignée, une classe non assignée et les audiences/journaux.

Fichiers touchés : `lib/school-data.ts`, `lib/school-data-queries.mjs`, `lib/school-data-queries.d.mts`, `tests/database.integration.test.mjs`.

## Travaux à poursuivre

1. Définir et tester les audiences de communication, l’accès aux brouillons et le périmètre des familles ; le schéma n’a actuellement ni rôle parent ni association parent-élève.
2. Construire et tester le portail superadministrateur et l’amorçage du premier compte directeur ; l’interface actuelle ne donne pas encore un parcours complet à ce rôle.
3. Implémenter le manifeste et le service worker PWA, puis vérifier installation et mode hors ligne.
4. Ajouter les tests de bout en bout pour les actions sensibles, les refus positifs/négatifs et les écritures concurrentes.
5. Diagnostiquer puis relancer le build de production. Le dépôt ne déclare pas de script `lint` ; ne pas confondre l’absence de ce script avec une validation lint réussie.
6. Ne pas déclarer RLS active : l’application utilise un pool PostgreSQL partagé et doit d’abord appliquer un contexte de tenant transactionnel cohérent à toutes les requêtes.

## Commandes de validation

Utiliser pnpm `12.3.4` via Corepack dans cet environnement :

```sh
COREPACK_ENABLE_PROJECT_SPEC=0 corepack pnpm@12.3.4 install --frozen-lockfile
DATABASE_URL="$DATABASE_URL" TEST_DATABASE_URL="$TEST_DATABASE_URL" DATABASE_SSL=disable COREPACK_ENABLE_PROJECT_SPEC=0 corepack pnpm@12.3.4 test
COREPACK_ENABLE_PROJECT_SPEC=0 corepack pnpm@12.3.4 typecheck
COREPACK_ENABLE_PROJECT_SPEC=0 corepack pnpm@12.3.4 build
```

Les tests d’intégration exigent une base locale jetable dont le nom contient `test`, avec les migrations appliquées. Ne jamais leur fournir une URL de production. Pour relancer les migrations sur une base locale vierge, configurer `DATABASE_URL`, puis exécuter `DATABASE_SSL=disable COREPACK_ENABLE_PROJECT_SPEC=0 corepack pnpm@12.3.4 db:migrate`.

## Reprise exacte

```sh
git clone --branch feat/school-backend-v1 --single-branch https://github.com/futuristic77/FOUKOU-NEXA-v1.git FOUKOU-NEXA-v1
cd FOUKOU-NEXA-v1
cat PROGRESS.md
git fetch --prune origin
git rev-parse origin/feat/school-backend-v1
git status --short --branch
```

Reprendre par le filtrage SQL des données enseignant, puis traiter les communications et les liens parent-élève. Utiliser uniquement des commits ciblés, sans force push, et revérifier les contrôles avant chaque publication.
