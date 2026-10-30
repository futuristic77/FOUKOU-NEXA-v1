# FOUKOU-NEXA V1

Application Next.js 16 de gestion scolaire multi-établissements, avec authentification, autorisations serveur et persistance PostgreSQL.

## Fonctionnalités

- Sessions sécurisées par cookie `httpOnly`, mots de passe hachés avec `scrypt` (`node:crypto`), expiration et déconnexion.
- Rôles : direction, administration, enseignant, vie scolaire et lecture seule. Les enseignants sont limités à leurs affectations pour les notes et présences.
- CRUD : établissement, comptes, élèves, classes, enseignants, affectations, matières/coefficients, notes, présences, emplois du temps, communications et paramètres.
- Moyennes par matière normalisées sur 20, moyenne générale pondérée et bulletins imprimables/PDF via le navigateur.
- Tableau de bord calculé depuis les enregistrements et journal d’activité.
- Isolation systématique par `school_id`, validation des entrées et vérification des relations côté serveur.

## Configuration locale

Prérequis : Node.js 20+, pnpm 12 et PostgreSQL 13+.

1. Installer les dépendances : `pnpm install --frozen-lockfile`.
2. Copier `.env.example` vers `.env.local` et renseigner `DATABASE_URL`. Ne jamais committer ce fichier.
3. Pour une base locale sans TLS, définir `DATABASE_SSL=disable`. Pour un hébergeur géré, conserver `DATABASE_SSL=require` et utiliser l’URL TLS fournie.
4. Exécuter les migrations et créer le premier établissement/compte :

```bash
DATABASE_URL='postgresql://…' \
DATABASE_SSL='require' \
SEED_SCHOOL_NAME='Nom de l’établissement' \
SEED_ADMIN_EMAIL='direction@example.org' \
SEED_ADMIN_PASSWORD='un-mot-de-passe-long-et-unique' \
pnpm db:migrate
```

Les variables `SEED_*` ne sont utilisées qu’au premier amorçage. Les retirer ensuite, notamment `SEED_ADMIN_PASSWORD`. Pour rejouer seulement les migrations, lancer `pnpm db:migrate` sans aucune variable `SEED_*`. Les fichiers SQL numérotés du dossier `migrations/` sont appliqués dans l’ordre. La migration de clés composites vérifie les relations existantes et s’annule sans supprimer de données si elle détecte une référence entre établissements ; corrigez ces lignes avant de la relancer.

5. Démarrer : `pnpm dev`, puis ouvrir `/connexion`.

Aucune donnée de démonstration n’est insérée. L’application nécessite une vraie base configurée et migrée.

## Vérifications

```bash
pnpm typecheck
pnpm test
pnpm build
```

Les tests unitaires couvrent les calculs, les hachages et la matrice de permissions. Les tests PostgreSQL exigent une base locale dédiée dont le nom contient `test`, configurée via `TEST_DATABASE_URL`; ils échouent si la migration `002_tenant_integrity.sql` n’a pas été appliquée. N’utilisez jamais une URL de base de production pour ces tests.

## Déploiement Vercel

1. Créer une base PostgreSQL et appliquer `pnpm db:migrate` depuis un environnement sécurisé disposant des variables.
2. Dans Vercel, configurer `DATABASE_URL`, `NEXT_TELEMETRY_DISABLED=1` et, si nécessaire, `DATABASE_SSL`. Ne configurer aucune clé d’IA ou service de télémétrie : ils ne sont pas utilisés.
3. Déployer la branche après revue. Ne jamais placer les identifiants dans le code, les journaux ou GitHub.
4. Vérifier sur un compte de test : connexion/déconnexion, expiration, refus inter-établissements, droits enseignant, CRUD, appel dupliqué à la même date, unicité des évaluations et impression d’un bulletin.

La publication d’une communication est interne à l’application ; aucun e-mail ou SMS n’est envoyé.
