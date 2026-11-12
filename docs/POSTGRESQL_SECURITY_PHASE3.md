# Sécurité PostgreSQL — Phase 3

## Portée et état

Cette phase prépare des corrections de code et des migrations; elle n’établit aucune connexion et n’exécute aucune migration. Le commit de départ attendu est `ee19fbe` sur `fix/production-build-feat-school-backend-v1`.

Une note historique de validation mentionne un projet Supabase réservé aux tests. La présente phase ne traite pas cette affirmation comme une preuve suffisante d’isolation : l’identité/allowlist existante de `scripts/test-database-guard.mjs` reste inchangée. Les écritures d’intégration demeurent bloquées tant que la cible effective n’est pas confirmée séparément.

## Garde des migrations

`pnpm db:migrate` cible le mode `non-production`. Il refuse avant connexion si l’empreinte URL n’est pas explicitement autorisée. Après connexion TLS, il compare également l’empreinte de l’identité SQL (base, rôle, adresse du serveur, port, schéma et version majeure) avant toute écriture, y compris la création du journal de migrations. Chaque migration doit commencer par `BEGIN;` et terminer par `COMMIT;`; le migrateur retire ces enveloppes et exécute le corps et l’enregistrement dans `schema_migrations` dans la même transaction.

Les empreintes URL excluent le mot de passe. Les erreurs et sorties ne reproduisent ni URL ni secret. `DATABASE_SSL=disable` est interdit. `DATABASE_URL` n’est jamais traité comme une preuve qu’il s’agit d’une base de test.

Les empreintes se calculent avec les fonctions pures `postgresUrlFingerprint` et `postgresIdentityFingerprint` de `scripts/database-target-guard.mjs`. La première ne nécessite aucune connexion; la seconde reçoit les seuls champs d’identité issus d’un contrôle SELECT autorisé. Stocker les empreintes uniquement dans l’environnement de l’opérateur après vérification indépendante, jamais dans le dépôt. Les noms `MIGRATION_*` absents font échouer les commandes avant connexion.

La migration production est distincte :

```text
pnpm db:migrate:production -- --confirm-production
```

Elle requiert des empreintes `MIGRATION_PRODUCTION_URL_FINGERPRINT` et `MIGRATION_PRODUCTION_DATABASE_FINGERPRINT` préparées après vérification indépendante de la destination. Cette commande n’a pas été exécutée. L’absence de ces autorisations fait échouer le prévol fermé.

Pour le mode non-production, les noms attendus sont `MIGRATION_NON_PRODUCTION_URL_FINGERPRINT` et `MIGRATION_NON_PRODUCTION_DATABASE_FINGERPRINT`. Un opérateur autorisé doit les provisionner hors dépôt après avoir vérifié séparément l’identité. Ne pas recopier une empreinte ou une URL de test dans le profil production.

## Bootstrap initial du super-administrateur

Le bootstrap est séparé du migrateur et s’exécute uniquement par une commande explicite :

```text
pnpm db:bootstrap:super-admin -- --confirm-initial-super-admin
```

Pré-requis opérateur : appliquer préalablement les migrations autorisées, fournir séparément `BOOTSTRAP_DATABASE_URL`, `SUPER_ADMIN_BOOTSTRAP_URL_FINGERPRINT`, `SUPER_ADMIN_BOOTSTRAP_DATABASE_FINGERPRINT`, `BOOTSTRAP_SUPER_ADMIN_EMAIL`, `BOOTSTRAP_SUPER_ADMIN_NAME` et `BOOTSTRAP_SUPER_ADMIN_PASSWORD`. Le script exige `--confirm-initial-super-admin`, TLS, et la correspondance des deux empreintes avant l’INSERT. Le mot de passe n’est ni codé en dur, ni affiché, ni journalisé.

Le bootstrap prend un verrou transactionnel; s’il existe déjà un super-administrateur avec l’adresse fournie, il devient un no-op. S’il existe un autre super-administrateur ou si l’adresse appartient à un autre rôle, il refuse. Le rôle créé est uniquement `super_admin` avec `school_id = NULL`; aucune permission scolaire ne lui est ajoutée. Exécuter cette procédure nécessite une autorisation distincte et n’a pas été fait dans cette phase.

## Provisionnement du premier directeur : blocage métier

`createSchool` crée actuellement l’école et ses paramètres, mais pas le premier directeur. Le super-administrateur n’a pas `users:write`; il n’existe donc pas de parcours applicatif complet après création. Aucune méthode d’invitation, de remise d’un secret initial, de définition du mot de passe ou de réinitialisation obligatoire n’est définie. Cette phase ne choisit pas arbitrairement entre invitation par courriel et mot de passe temporaire, et ne modifie pas les pages/UI. Il faut décider du parcours de remise d’accès avant d’implémenter la création atomique de l’établissement et du directeur.

## Invariant du dernier directeur

Les actions `saveUser` et `deleteUser` verrouillent la ligne de l’établissement (`FOR UPDATE`) dans leur transaction avant de compter les directeurs actifs et de modifier le compte. Cela sérialise les mutations applicatives concurrentes. Les écritures administratives SQL directes ne passent pas par cette règle; une future protection par trigger SQL nécessiterait une migration et une revue dédiée.

## Isolation `attendance.recorded_by`

La nouvelle migration `004_attendance_recorder_tenant_fk.sql` vérifie les associations historiques et s’arrête avec une erreur si un auteur manque ou appartient à une autre école. Elle remplace la FK simple par une FK composite `(school_id, recorded_by) -> users(school_id, id)` et garde le `SET NULL` limité à `recorded_by`.

La liste de colonnes `ON DELETE SET NULL (recorded_by)` requiert PostgreSQL 15 ou ultérieur. Aucun nettoyage automatique n’est prévu : toute incohérence historique doit être examinée et autorisée avant une nouvelle tentative. Migration non exécutée.

## Audit plateforme durable

La migration `005_platform_activity_logs.sql` crée un journal plateforme indépendant des clés étrangères d’école : la trace de suppression survit à la cascade de l’établissement. Elle conserve l’identifiant acteur et l’instant, sans stocker mot de passe, adresse courriel ou détails d’élèves. Création et suppression d’établissement écrivent dans ce journal dans la même transaction que la mutation. Le bootstrap initial y écrit également un événement.

La migration révoque les droits de `PUBLIC`, `anon`, `authenticated` et `service_role`; le rôle serveur d’application doit être propriétaire de la table ou recevoir séparément le seul droit d’insertion requis. Cette table n’est pas un stockage immuable/WORM. L’accès en lecture, la rétention et la sauvegarde restent à définir avant d’exposer ce journal ou de le traiter comme une piste réglementaire.

## Proposition `bulletins:validate` — non implémentée

Aucune permission ni règle de validation n’est ajoutée tant que la délégation métier n’est pas précisée. Proposition technique à valider :

1. Créer une permission distincte `bulletins:validate`; ne pas accorder `grades:write` au secrétariat.
2. Ajouter une délégation datée et limitée à une école/période, accordée par un directeur, avec motif et expiration. Le secrétariat ne peut valider que si la délégation est active et si l’indisponibilité du directeur répond à une règle métier définie. Le code actuel ne définit ni cette règle ni qui la constate.
3. Identifier une période scolaire par établissement et empêcher une seconde validation contradictoire. Valider une période entière ou un lot de bulletins explicitement figé; le périmètre exact reste à décider.
4. Stocker un snapshot/version immuable du bulletin (notes, coefficients et calculs concernés) à la validation. Une modification ultérieure des notes crée une nouvelle version à revalider; elle ne change pas le bulletin validé.
5. Journaliser validateur, rôle, période, délégation, version/snapshot, date et motif; ne pas inclure de données personnelles inutiles.
6. Séparer strictement les actions de saisie/modification de notes des actions de validation. La validation n’accorde aucun droit de modifier les notes.

## Tests et opérations

`pnpm test` ne lance que les tests unitaires/statique. `pnpm test:db` reste l’unique commande des tests PostgreSQL et conserve l’identité de test épinglée; son rôle doit satisfaire les contrôles de privilèges minimaux. Le garde refuse désormais les rôles capables de créer bases, rôles ou schémas. Le profil de privilèges noté historiquement pour le projet dispose de ces capacités : le test DB refusera donc de se connecter jusqu’à la mise en place et l’autorisation d’un rôle restreint. Cette phase n’a pas modifié l’identité/allowlist ni le rôle réel.

Le contrôle local précédent avait aussi constaté `TEST_DATABASE_URL` configurée mais mal formée pour le garde; aucune connexion n’a été tentée. Aucun test PostgreSQL, aucune migration, aucun bootstrap et aucune connexion n’ont été exécutés pendant cette phase.
