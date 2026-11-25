# FOUKOU-NEXA-V1 — audit pré-opérationnel, Phase 3

- **Date de l’audit :** 25 novembre 2026
- **Référence observée :** branche `fix/production-build-feat-school-backend-v1`, commit `76fc0ceaac78`
- **Verdict :** **PARTIELLEMENT VÉRIFIÉ — RISQUES IDENTIFIÉS — DÉCISIONS DU FONDATEUR REQUISES**

> Cette revue est strictement préparatoire. Elle ne constitue ni une validation de sécurité exhaustive ni un avis juridique. Les recommandations ci-dessous ne sont pas des décisions prises au nom du fondateur.

## 1. Périmètre et méthode

L’audit porte sur la configuration et le code présents dans le dépôt, les cinq migrations SQL, les scripts de migration/test/bootstrap, la documentation existante, ainsi que les tests statiques et unitaires. Les constats décrivent l’état du dépôt et des noms de variables observés le 25 novembre 2026; les documents historiques ne sont pas assimilés à une preuve de l’état actuel d’un service externe.

- **VÉRIFIÉ** — Lecture statique de `lib/db.ts`, `lib/auth.ts`, `lib/permissions.mjs`, `lib/tenant-scope.mjs`, `lib/teacher-scope.mjs`, `lib/school-data-queries.mjs`, `app/actions.ts`, `app/connexion/actions.ts`, `scripts/`, `migrations/001_initial.sql` à `005_platform_activity_logs.sql`, `README.md`, `.env.example`, `PROGRESS.md` et des tests pertinents.
- **VÉRIFIÉ** — `pnpm test` : 51 tests réussis, 0 échec, 0 ignoré. Il s’agit de tests unitaires/statique; la commande ne lance pas `tests/database.integration.test.mjs`.
- **VÉRIFIÉ** — `pnpm typecheck` (`tsc --noEmit`) réussit.
- **VÉRIFIÉ** — Les tests PostgreSQL n’ont pas été lancés; aucune connexion ni requête vers un serveur PostgreSQL n’a été tentée pendant cet audit.
- **VÉRIFIÉ** — L’inventaire n’a rapporté que les noms/états de présence. La valeur de `TEST_DATABASE_URL` a été passée au contrôle local de format du garde, sans être affichée, copiée dans le rapport ou utilisée pour une connexion; aucune clé, aucun mot de passe ni donnée de personne n’a été exposé.
- **NON VÉRIFIÉ** — État réel du serveur SQL, schéma installé, journal `schema_migrations`, données existantes, privilèges effectifs et comportement réel des actions contre PostgreSQL.

## 2. Résumé exécutif

Le dépôt a des protections applicatives et SQL pertinentes : requêtes paramétrées avec `postgres`, TLS obligatoire dans le client, authentification par session stockée en base, matrice de permissions, portée scolaire tirée de la session, clés étrangères composites et garde-fous de cible pour migrations et tests. Les tests statiques correspondants passent.

Cela ne suffit pas à établir l’état opérationnel. `DATABASE_URL` est absente des fichiers d’environnement examinés; `TEST_DATABASE_URL` est présente, mais échoue au contrôle de format du garde. Aucune connexion n’a donc confirmé le fournisseur, l’identité, la région, la version ou les migrations de la cible actuelle. Les sauvegardes et la restauration ne sont pas documentées comme testées. En outre, la documentation opératoire est en décalage avec les scripts présents, et le rôle `viewer` peut actuellement consulter les brouillons de communication.

**Verdict opérationnel :** ne pas charger de données réelles d’élèves ni déclarer la Phase 4 prête avant confirmation des environnements/cibles, décisions du fondateur, clarification des audiences et vérification juridique/continuité. Aucune correction n’est effectuée dans cette phase.

## 3. A. Base de données et environnement

### Configuration et cohérence des variables

- **VÉRIFIÉ** — `lib/db.ts` utilise `DATABASE_URL`, refuse `DATABASE_SSL=disable` et configure `ssl: 'require'`. La connexion serveur principale ne fait pas de fallback vers `POSTGRES_URL` ou `SUPABASE_URL`.
- **VÉRIFIÉ** — `scripts/migrate.mjs` emploie `DATABASE_URL`, exige TLS et deux empreintes distinctes correspondant au profil `MIGRATION_NON_PRODUCTION` ou `MIGRATION_PRODUCTION`. Le profil production demande aussi `--confirm-production`. Le script fait un contrôle d’identité SQL avant de créer/consulter le journal ou d’appliquer un fichier.
- **VÉRIFIÉ** — Le bootstrap est séparé dans `scripts/bootstrap-super-admin.mjs`, utilise `BOOTSTRAP_DATABASE_URL`, ses propres empreintes, TLS et `--confirm-initial-super-admin`. Le migrateur refuse maintenant les variables `SEED_*`.
- **VÉRIFIÉ** — Le harnais PostgreSQL n’utilise que `TEST_DATABASE_URL`; `scripts/run-database-tests.mjs` retire de son environnement de sous-processus plusieurs variables de production ou Supabase pour éviter un fallback. `scripts/test-database-guard.mjs` épingle une cible de test, requiert TLS puis vérifie l’identité et un profil de privilèges avant les écritures d’intégration.
- **VÉRIFIÉ** — Dans `/vercel/share/.env.project` et `.env.development.local`, `DATABASE_URL` et `DATABASE_SSL` sont absentes; `TEST_DATABASE_URL` est présente. Les noms `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_HOST`, `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont aussi présents, mais leurs valeurs n’ont pas été consultées et le code applicatif/migrateur ne les substitue pas à `DATABASE_URL`.
- **RISQUE IDENTIFIÉ** — Le contrôle sans connexion de `TEST_DATABASE_URL` par `assertTestDatabaseUrl` renvoie « malformed » et précise qu’aucune connexion n’a été tentée. Le harnais dédié est donc bloqué; la présence du nom de variable n’est pas une preuve de cible valide.
- **RISQUE IDENTIFIÉ** — `README.md` documente un démarrage par `pnpm db:migrate` avec `SEED_*`, alors que `scripts/migrate.mjs` refuse ces variables et exige maintenant des empreintes qui ne figurent pas dans `.env.example`. Le README ne décrit pas non plus le bootstrap séparé. Un opérateur suivant le README actuel échouerait ou pourrait mal préparer la cible.
- **RISQUE IDENTIFIÉ** — `README.md` et `.env.example` recommandent `DATABASE_SSL=disable` pour PostgreSQL local sans TLS, mais `lib/db.ts` et `scripts/migrate.mjs` rejettent explicitement cette valeur et imposent `ssl: 'require'`. Le mode local décrit par la documentation ne correspond donc pas au comportement du code.

### Migrations, version et environnements

- **VÉRIFIÉ** — `migrations/001_initial.sql` à `005_platform_activity_logs.sql` existent. `scripts/migrate.mjs` parcourt les fichiers SQL numérotés dans l’ordre et enregistre les applications dans `schema_migrations`, dans des transactions. La simple présence des fichiers ne prouve pas qu’ils ont été exécutés.
- **NON VÉRIFIÉ** — Le contenu actuel de `schema_migrations`, l’état des contraintes en base et la cohérence effective schéma/code ne peuvent pas être établis sans connexion.
- **RISQUE IDENTIFIÉ** — `README.md` annonce PostgreSQL 13+, mais `migrations/004_attendance_recorder_tenant_fk.sql` utilise `ON DELETE SET NULL (recorded_by)`, indiqué dans `docs/POSTGRESQL_SECURITY_PHASE3.md` comme nécessitant PostgreSQL 15 ou ultérieur. La documentation est donc trop permissive. Le garde de test épingle une version majeure 17; cette exigence du garde ne vérifie pas le serveur actuellement configuré.
- **PARTIELLEMENT VÉRIFIÉ** — Dev/test/production sont différenciés par une variable de test séparée, des empreintes de migration par profil, une confirmation production et des empreintes distinctes pour le bootstrap. Toutefois les valeurs/liaisons Vercel et l’existence de projets séparés ne sont pas vérifiées. L’application et le migrateur utilisent tous deux `DATABASE_URL`; le nom du profil ne prouve pas à lui seul que l’URL correspond au bon environnement.
- **VÉRIFIÉ** — Le test d’intégration peut créer puis supprimer des données synthétiques sur la cible épinglée, avec nettoyage dans `finally`. Il n’a pas été exécuté. Le garde ne vérifie pas ici l’identité par une connexion, puisque l’URL ne passe pas le contrôle syntaxique.

## 4. B. Fournisseur PostgreSQL et hébergement

- **PARTIELLEMENT VÉRIFIÉ** — L’application utilise le pilote PostgreSQL `postgres` avec une URL PostgreSQL générique. Les noms de variables Supabase sont présents dans l’environnement du projet, mais aucune valeur n’a été lue. Cela ne confirme ni que `DATABASE_URL` pointe actuellement vers Supabase ni que le projet de test observé historiquement est la cible active.
- **NON VÉRIFIÉ** — Fournisseur effectif de la base applicative, identité de la base cible, adresse réseau, région actuelle, certificat/TLS effectivement négocié, règles réseau, plan/limites tarifaires, sauvegardes fournisseur, rétention fournisseur et restauration.
- **NON VÉRIFIÉ** — Un document antérieur, `docs/POSTGRESQL_VALIDATION_PROGRESS.md`, rapporte pour un projet de test Supabase une lecture historique en `eu-west-1` et PostgreSQL `17.11`. Cet élément n’a pas été reconfirmé pour l’environnement actuel; il ne constitue pas la preuve de la région ni de la base de production.
- **VÉRIFIÉ** — Le code demande TLS (`ssl: 'require'`) et les gardes rejettent les URLs de migration/test qui ne respectent pas leur profil. Cela prouve une configuration demandée par le client, pas l’établissement d’une session TLS réelle ni le niveau de sécurité réseau du fournisseur.
- **DÉCISION DU FONDATEUR REQUISE** — Confirmer le fournisseur, l’identité et la région autorisés pour chaque environnement avant toute connexion opérationnelle. Ne pas changer de fournisseur pendant cette phase.

## 5. C. Authentification et sessions

- **VÉRIFIÉ** — `lib/password.mjs` hache les mots de passe avec `scrypt`, sel aléatoire de 16 octets et comparaison de hachage en temps constant; la longueur validée est de 12 à 256 caractères. Les tests unitaires couvrent hachage, vérification et refus.
- **VÉRIFIÉ** — `app/connexion/actions.ts` limite les entrées invalides à 5 par fenêtre de 15 minutes, par empreinte IP + adresse e-mail, avec verrou transactionnel PostgreSQL. Le traitement d’un compte inconnu effectue aussi un `scrypt` afin de réduire une différence temporelle évidente.
- **RISQUE IDENTIFIÉ** — La limite dépend de `x-forwarded-for`; la confiance accordée à ce header par le proxy/déploiement n’a pas été vérifiée. La portée observée est une combinaison IP/e-mail, pas un verrouillage par compte ou une politique d’abus confirmée à la périphérie. La configuration d’une protection supplémentaire n’est pas vérifiée.
- **VÉRIFIÉ** — `lib/auth.ts` crée un jeton aléatoire de 32 octets, conserve son SHA-256 en base, définit une durée de session de 8 heures et le cookie `httpOnly`, `sameSite: 'lax'`, `path: '/'`, avec expiration. `secure` est activé lorsque `NODE_ENV === 'production'`; il est désactivé hors production.
- **VÉRIFIÉ** — Chaque résolution de session joint `sessions` à `users`, exige `expires_at > now()` et `users.active = true`, puis recharge le rôle actuel depuis la base. La déconnexion supprime la ligne et vide le cookie. Un changement de mot de passe par `saveUser` supprime les sessions du compte; la désactivation d’un compte le rend non admissible à la prochaine résolution.
- **PARTIELLEMENT VÉRIFIÉ** — `last_seen_at` est actualisé périodiquement, mais aucune échéance d’inactivité n’est appliquée. Une modification de rôle ne supprime pas explicitement les sessions; le rôle est néanmoins relu depuis la base au prochain chargement. Les sessions expirées/invalides sont refusées, mais aucun mécanisme de purge périodique n’a été trouvé.
- **NON VÉRIFIÉ** — Défense effective des cookies derrière chaque domaine/proxy, durée de session en production, alertes/limites amont, révocation opérationnelle, récupération de compte, supervision des tentatives et comportement end-to-end.
- **VÉRIFIÉ** — Aucun parcours de récupération de compte par l’utilisateur, de lien de réinitialisation ou de vérification d’adresse n’a été trouvé. Un directeur autorisé peut définir un nouveau mot de passe via la gestion des comptes; ce flux administratif n’est pas une récupération autonome.

## 6. D. Sécurité multi-établissements

### Protections vérifiées dans le code

- **VÉRIFIÉ** — `lib/auth.ts` charge l’utilisateur depuis la session et `requireSchool` dérive `schoolId` de cette session. Le wrapper `perform` dans `app/actions.ts` exige permission + établissement avant les mutations métier; les actions ne prennent pas le `schoolId` d’un formulaire pour leur périmètre.
- **VÉRIFIÉ** — `lib/school-data-queries.mjs` applique des filtres `school_id` aux établissements et données scolaires. Les jointures métier vérifient également les écoles correspondantes. Les requêtes enseignantes limitent les données aux classes/matières assignées; `lib/teacher-scope.mjs` filtre aussi les données renvoyées.
- **VÉRIFIÉ** — Les mises à jour/suppressions métier de `app/actions.ts` combinent l’identifiant de la ligne avec le `schoolId` de session. Les références de classes, élèves, enseignants et matières sont contrôlées côté serveur avant les écritures.
- **VÉRIFIÉ** — `migrations/002_tenant_integrity.sql` ajoute et valide des clés étrangères composites comprenant `school_id` pour enseignants, classes, élèves, affectations, notes, présences, horaires, communications et activité. `migrations/004_attendance_recorder_tenant_fk.sql` protège aussi `attendance.recorded_by` et vérifie les associations historiques avant la contrainte.
- **VÉRIFIÉ** — `super_admin` doit avoir `school_id IS NULL` selon `migrations/001_initial.sql`; `isPlatformAdmin` et `requirePlatformAdmin` distinguent ce rôle. Le super-administrateur peut lire les synthèses plateforme, créer/supprimer des établissements, mais `requireSchool` refuse un compte sans établissement. Aucune permission scolaire générale ne lui est accordée dans la matrice actuelle.
- **PARTIELLEMENT VÉRIFIÉ** — Les tests unitaires couvrent plusieurs règles de permissions et de filtrage; `tests/database.integration.test.mjs` contient des cas de clés étrangères croisées et de lecture enseignant. Les tests d’intégration n’ont pas été exécutés pendant cette mission; aucun résultat dynamique ne peut être affirmé.

### Limites et scénarios encore à tester

- **RISQUE IDENTIFIÉ** — Aucune politique RLS n’apparaît dans les migrations/code examinés; `PROGRESS.md` précise historiquement de ne pas déclarer RLS active avec le pool partagé actuel. L’isolation dépend donc du serveur applicatif, des filtres SQL et des clés étrangères; l’état effectif RLS et les privilèges du rôle runtime en base restent inconnus. Une fuite de credential SQL ou une requête non filtrée pourrait contourner les contrôles applicatifs.
- **NON VÉRIFIÉ** — Absence ou présence d’une fuite inter-écoles dans l’environnement réel. La revue statique n’a pas identifié de fuite directe dans les chemins principaux examinés, mais elle ne remplace pas des tests adversariaux autorisés.
- **DÉCISION DU FONDATEUR REQUISE** — Autoriser ultérieurement un plan de tests d’isolation sur une cible de test identifiée et non-production, après rétablissement de l’URL de test et vérification de son identité.
- **Scénarios à exécuter ultérieurement :** utilisateur de l’école A tentant lectures, créations, modifications et suppressions avec des identifiants de l’école B; manipulation de champs/formulaires et appels directs de Server Actions; tests par rôle (direction, administration, enseignant, vie scolaire, viewer, super-administrateur); enseignant hors affectation et mauvaise matière; associations FK composites et suppressions; audiences et brouillons; accès plateforme; concurrence sur dernier directeur actif, affectations et présence. Exécuter ces scénarios uniquement après approbation, sur une cible explicitement confirmée, avec données synthétiques.

## 7. E. Gouvernance des comptes et rôles

- **VÉRIFIÉ** — `users` porte un `school_id` unique par compte métier et une contrainte qui réserve `school_id IS NULL` à `super_admin`. L’adresse e-mail est unique globalement. Aucun `school_memberships` ni relation équivalente n’existe dans les migrations examinées.
- **VÉRIFIÉ** — Les rôles sont `director`, `administration`, `teacher`, `secretary`, `viewer` et `super_admin`. La matrice est dans `lib/permissions.mjs`. Les créations/changements de comptes scolaires sont servis par `saveUser`, réservé à `users:write` (direction); le formulaire n’autorise pas l’attribution de `super_admin`.
- **VÉRIFIÉ** — Le super-administrateur initial est provisionné par un script séparé exigeant une confirmation explicite et des empreintes. `createSchool` crée l’école et ses paramètres, mais pas son premier directeur. Il n’existe donc pas, dans le code observé, de parcours complet automatique de création du premier compte directeur depuis cette action plateforme.
- **VÉRIFIÉ** — `saveUser` peut créer, changer de rôle, désactiver ou réactiver un compte et peut définir un nouveau mot de passe. `deleteUser` supprime le compte, interdit l’auto-suppression et les deux actions protègent le dernier directeur actif par verrouillage de la ligne école. La suppression utilisateur supprime ses sessions par FK; la fiche enseignant associée est laissée dissociée par le `ON DELETE SET NULL` historique.
- **RISQUE IDENTIFIÉ** — Les mécanismes de désactivation/suppression, la remise initiale du mot de passe, l’assistance aux comptes et la récupération ne forment pas une politique de cycle de vie documentée. Les actions plateforme ne définissent pas le provisioning du premier directeur.
- **DÉCISION DU FONDATEUR REQUISE** — Déterminer si un compte appartient toujours à un seul établissement ou si des utilisateurs peuvent gérer plusieurs établissements.
  - **Garder le modèle actuel** : modèle simple, périmètre explicite et moins de changements; ne répond pas à un besoin futur d’accès multi-écoles par un même compte.
  - **Étudier `school_memberships` ultérieurement** : permettrait des rôles et accès distincts par école; demande de définir l’école active, les règles de permission, l’unicité/connexion, la révocation et une migration de l’existant. **Recommandation technique :** ne pas l’implémenter tant que le besoin métier et le modèle d’identité ne sont pas approuvés.
  - **Éléments à confirmer :** qui crée le premier directeur, comment l’accès initial est remis, qui peut désactiver/supprimer, les délais de désactivation et les modalités de récupération.

## 8. F. Communications et confidentialité

- **VÉRIFIÉ** — Selon `lib/permissions.mjs`, direction, administration et vie scolaire peuvent créer/modifier/supprimer des communications; enseignant, viewer et super-administrateur n’ont pas `communications:write`.
- **VÉRIFIÉ** — `app/actions.ts` valide le titre (2–180), le corps (2–5000), une audience libre (1–120) et l’état brouillon/publié. L’audience est un champ texte libre dans `migrations/001_initial.sql`, sans liste de valeurs SQL.
- **RISQUE IDENTIFIÉ** — `lib/school-data-queries.mjs` filtre les communications des enseignants aux annonces publiées dont l’audience correspond à une liste de chaînes codées en dur. Pour les autres rôles, la requête ne filtre que par `school_id` et renvoie les brouillons aussi. Le rôle `viewer`, bien que lecture seule, reçoit donc actuellement le texte de toutes les communications de son école, y compris les brouillons; le filtre d’audience ne s’applique pas à ces rôles. Ce comportement est vérifiable dans le code, mais l’intention métier n’est pas confirmée.
- **VÉRIFIÉ** — L’accès aux communications est toujours borné par l’établissement dans les requêtes principales; la FK composite de `communications` lie aussi auteur et école. L’interface indique que la publication est interne et qu’aucun e-mail/SMS n’est envoyé.
- **RISQUE IDENTIFIÉ** — Corps et audience libres peuvent contenir des informations personnelles ou confidentielles; aucune catégorisation, validation de destinataires, purge ou règle anti-diffusion n’est définie. Il n’existe pas de rôle parent/famille ni de relation parent-élève dans les tables visibles.
- **DÉCISION DU FONDATEUR REQUISE — Politique recommandée, non implémentée :** définir des audiences contrôlées (par exemple direction, équipe, enseignants, familles seulement après authentification et lien parent-élève); brouillons accessibles uniquement à leurs auteurs et rôles explicitement autorisés; communications publiées filtrées par audience pour chaque rôle, y compris `viewer`; interdire ou encadrer les données d’élèves/confidentielles en texte libre; conserver une séparation claire entre annonce interne et notification externe. Confirmer qui peut publier et qui peut supprimer.

## 9. G. Sauvegardes et continuité

- **NON VÉRIFIÉ** — Aucune preuve actuelle d’une sauvegarde configurée, de sa fréquence, de sa rétention, de son chiffrement, de son stockage distinct, d’un objectif RPO/RTO ou d’un exercice de restauration n’a été trouvée dans le code/documents revus.
- **NON VÉRIFIÉ** — Les fonctions de sauvegarde/restauration éventuellement incluses dans le plan du fournisseur ou la configuration du projet ne sont pas accessibles sans vérification du compte et de la cible; elles ne sont pas présumées disponibles.
- **VÉRIFIÉ** — `activity_logs` est rattachée à l’école et suit sa suppression en cascade. `platform_activity_logs` est volontairement sans FK école pour conserver une trace après suppression. La migration 005 révoque certains droits et crée des index, mais ne rend pas le journal immuable/WORM et ne définit pas de rétention. Aucun processus d’archivage/restauration n’est présent dans les scripts consultés.
- **RISQUE IDENTIFIÉ** — La suppression d’un élève cascade vers des notes/présences liées; la suppression d’un établissement cascade vers ses données scolaires. Sans sauvegarde/restauration vérifiée et politique d’archivage approuvée, une erreur ou suppression peut être irréversible en pratique.
- **DÉCISION DU FONDATEUR REQUISE** — Choisir exigences de sauvegarde/rétention, responsables, RPO/RTO, durée, chiffrement et lieu des copies; exiger un test de restauration isolé et consigné avant des données réelles. Le choix de produit ne constitue pas une preuve qu’une sauvegarde fonctionne.

## 10. H. Données scolaires et droit en Côte d’Ivoire

L’application contient les champs qui peuvent identifier des élèves, responsables légaux et personnels : noms, date de naissance, coordonnées, établissement/classe, notes, présences et textes libres (`migrations/001_initial.sql`, `migrations/003_school_contact_details.sql`). L’absence de données réelles a été respectée; aucun export ni transfert n’a été effectué.

- **NON VÉRIFIÉ** — Aucune analyse juridique, formalité ARTCI, registre des traitements, base légale, notice d’information, consentement/autorisation applicable, contrat de sous-traitance ou procédure relative aux droits des personnes n’a été vérifiée.
- **NON VÉRIFIÉ** — La région d’hébergement actuelle et les sous-traitants ne sont pas établis. Le portail officiel de l’Autorité de protection des données de Côte d’Ivoire liste notamment une demande d’autorisation préalable de traitement et une demande de transfert de données hors espace CEDEAO : [Formulaires – Autorité de protection](https://www.autoritedeprotection.ci/documents/). La pertinence et les formalités applicables au projet doivent être confirmées par un conseil juridique ivoirien et l’ARTCI; ce rapport ne conclut pas à la conformité.
- **DÉCISION DU FONDATEUR REQUISE** — Avant toute donnée réelle, identifier formellement le responsable du traitement et les sous-traitants, les finalités et bases juridiques, les personnes à informer (y compris parents/tuteurs et personnel), les droits et canaux de demande, les transferts internationaux éventuels, les obligations de sécurité/incident et la conservation/suppression. Faire vérifier la classification des données scolaires et les formalités qui s’appliquent aux mineurs par un professionnel local.
- **RISQUE IDENTIFIÉ** — Si une région hors Côte d’Ivoire/CEDEAO est retenue, la question du transfert international doit être examinée avant le transfert; l’hébergement historique documenté en Europe n’est pas une confirmation de la région actuelle.

## 11. Décisions à prendre par le fondateur

Aucune option ci-dessous n’est adoptée au nom du fondateur. Les recommandations sont des avis techniques préparatoires.

### 1. Fournisseur et région de la base

- **Question :** quelle base et quelle région sont autorisées pour test, préproduction et production?
- **État vérifié :** code PostgreSQL générique; variables Supabase présentes; `DATABASE_URL` absente; URL de test présente mais invalide. Région actuelle **NON VÉRIFIÉE**. Une note historique cite Supabase `eu-west-1`/PostgreSQL 17.11 pour une cible de test passée.
- **Options :** confirmer le projet actuel sans migration; choisir une région conforme aux contraintes métier/juridiques; comparer d’autres régions/fournisseurs seulement si le fondateur demande cette étude.
- **Avantages/inconvénients :** une cible unique confirmée réduit les erreurs opérationnelles; une région distante peut faciliter disponibilité et exploitation mais ajoute des questions de transfert, latence et dépendance fournisseur.
- **Recommandation technique :** conserver l’architecture actuelle; faire confirmer l’identifiant de projet/région hors du dépôt puis, avec autorisation, valider l’identité par une requête SELECT contrôlée.
- **Risques/à confirmer :** URL générique vers la mauvaise base, transfert international, coûts/quotas, réseau et sauvegardes du plan.

### 2. Environnements test et production

- **Question :** comment garantir que test, préproduction et production ne partagent ni cible ni credential?
- **État vérifié :** gardes par empreintes et profils production/non-production; URL test dédiée mais actuellement mal formée. Les affectations Vercel et l’isolation des projets ne sont pas vérifiées.
- **Options :** projets séparés (recommandé techniquement); bases distinctes dans un projet commun avec credentials/rôles différents; base partagée (déconseillée pour les tests d’écriture).
- **Avantages/inconvénients :** projets distincts réduisent les erreurs de ciblage et les accès croisés, au prix de configuration et d’exploitation supplémentaires; base partagée est plus simple mais augmente fortement le risque de dommages et de contamination.
- **Recommandation technique :** confirmer une cible de test synthétique distincte, credentials les moins privilégiés possibles, puis production séparée et empreintes préparées par un opérateur autorisé. Ne pas réutiliser les variables `POSTGRES_*` sans vérification de leur cible.
- **Risques/à confirmer :** identité d’hôte/projet, permissions DML requises par le harnais, rôles runtime, rotation et stockage des credentials.

### 3. Sauvegarde et restauration

- **Question :** quelle perte maximale et quelle interruption sont acceptables, et qui restaure?
- **État vérifié :** aucun plan ni test de restauration trouvé; sauvegardes fournisseur **NON VÉRIFIÉES**.
- **Options :** sauvegardes gérées avec restauration ponctuelle; export indépendant chiffré; combinaison des deux.
- **Avantages/inconvénients :** sauvegarde gérée facilite l’exploitation mais dépend du plan et fournisseur; copie indépendante améliore la résilience mais exige gestion des secrets, rétention et tests.
- **Recommandation technique :** fixer RPO/RTO, fréquence et rétention; documenter l’approbation et réaliser une restauration sur environnement isolé avant production.
- **Risques/à confirmer :** absence de preuve de récupérabilité, résidence des copies, suppression/cascade et exposition des exports.

### 4. Comptes et accès multi-établissements

- **Question :** un utilisateur peut-il appartenir à plusieurs écoles et porter des rôles différents par école?
- **État vérifié :** un `school_id` par compte métier, e-mail globalement unique; aucun `school_memberships`; création du premier directeur non intégrée à `createSchool`.
- **Options :** conserver l’appartenance unique; étudier `school_memberships` si un besoin multi-école est confirmé.
- **Avantages/inconvénients :** modèle actuel est plus simple à vérifier; memberships soutiendrait des opérateurs partagés mais augmente les règles d’autorisation et la complexité de migration.
- **Recommandation technique :** conserver pour l’instant; ne concevoir memberships qu’après définition de l’école active, des permissions contextuelles et du flux de provisionnement.
- **Risques/à confirmer :** remise initiale des accès, départs/changements de rôle, révocation, récupération et compte de plateforme.

### 5. Visibilité des communications

- **Question :** quels rôles peuvent lire brouillons et messages publiés de chaque audience?
- **État vérifié :** audience texte libre; enseignants soumis à une liste de valeurs publiée; autres rôles scolaires, y compris viewer, reçoivent les brouillons.
- **Options :** conserver la visibilité large; viewer publié seulement; règles d’audience structurées par rôle et association; audiences parents ultérieures avec relation vérifiée.
- **Avantages/inconvénients :** modèle large est simple mais divulgue les brouillons et ne formalise pas les destinataires; audiences strictes réduisent le risque mais nécessitent un référentiel métier et des tests de compatibilité.
- **Recommandation technique :** définir un modèle d’audience fermé, brouillons réservés aux rôles autorisés et tests dédiés pour chaque rôle avant toute modification.
- **Risques/à confirmer :** confidentialité, fuite de texte libre et incohérences entre UI, permissions, filtres et éventuels destinataires externes.

### 6. Conservation et archivage

- **Question :** combien de temps conserver dossiers, notes, présences, communications et journaux, et quand supprimer/anonymiser?
- **État vérifié :** aucune durée ni purge périodique trouvée; suppressions de l’école et de l’élève en cascade.
- **Options :** durée uniforme; durées distinctes par catégorie; archivage avant suppression.
- **Avantages/inconvénients :** suppression uniforme est simple mais peut contredire obligations scolaires; durées par catégorie mieux adaptées mais exigent gouvernance et traitement automatisé vérifié.
- **Recommandation technique :** établir la règle avec le conseil juridique et les établissements, documenter les exceptions et restaurations avant d’implémenter une purge.
- **Risques/à confirmer :** conservation excessive, effacement prématuré, journaux contenant des identifiants et rétention des copies de sauvegarde.

### 7. Préparation juridique avant données réelles

- **Question :** quelles formalités, informations et garanties sont requises pour chaque traitement et transfert?
- **État vérifié :** aucune formalité ou conformité juridique vérifiée; portail de l’Autorité de protection consulté pour les formulaires mentionnés plus haut.
- **Options :** validation juridique locale avant pilote; pilote sans données personnelles réelles; lancement avec données réelles (non recommandé avant validation).
- **Avantages/inconvénients :** validation préalable clarifie responsabilités et transferts mais nécessite une revue dédiée; pilote synthétique permet de tester l’application sans exposer les personnes.
- **Recommandation technique :** aucune donnée réelle avant identification des responsables, formalités applicables, notice/consentement selon le cas, conservation et hébergement approuvés.
- **Risques/à confirmer :** statut des mineurs, bases juridiques, transferts, contrats sous-traitants, notification d’incident et droits des personnes.

### 8. Tests d’isolation multi-établissements

- **Question :** quels tests autoriser avant la prochaine évolution et qui approuve la base de test?
- **État vérifié :** 51 tests unitaires/statique passent; tests d’intégration présents mais non exécutés; URL de test échoue au contrôle de format.
- **Options :** corriger la configuration puis exécuter un plan de tests synthétiques autorisé; rester bloqué aux seuls tests statiques.
- **Avantages/inconvénients :** intégration vérifie SQL/FK réels mais écrit sur la cible de test; statique n’a aucun effet sur la base, mais ne prouve pas le comportement runtime.
- **Recommandation technique :** confirmer cible et autorisation, vérifier l’identité/privilèges d’abord, puis exécuter scénarios d’isolation et de concurrence avec données exclusivement synthétiques. Migrations à part, avec approbation distincte.
- **Risques/à confirmer :** mauvais projet, schéma absent ou incomplet, privilèges insuffisants, état laissé par nettoyage interrompu.

## 12. Prérequis de la Phase 4

1. Approbation explicite du fondateur sur les décisions applicables ci-dessus; aucune recommandation de ce rapport ne vaut approbation.
2. Confirmation indépendante des cibles test et production, de leurs régions, rôles et séparation; rétablissement de `TEST_DATABASE_URL` dans un format conforme sans partager sa valeur.
3. Accord distinct avant toute connexion d’intégration, écriture de test, migration ou bootstrap; aucune migration n’est autorisée implicitement par ce rapport.
4. Mettre en cohérence le guide d’exploitation et `.env.example` avec les exigences actuelles (`MIGRATION_*`, bootstrap séparé, test dédié, PostgreSQL 15+ au minimum pour la migration 004).
5. Tests de restauration documentés; exigences de conservation et d’archivage définies.
6. Politique d’audience et de visibilité des brouillons validée, particulièrement pour `viewer`; critères précis de tests d’isolation approuvés.
7. Vérification juridique locale des traitements, sous-traitants, hébergement et transferts; ne fournir que des données synthétiques tant que ces prérequis ne sont pas réunis.

## 13. Contrôle final de Phase 3

- **VÉRIFIÉ** — Le seul fichier de projet créé/modifié pour ce livrable est `docs/audits/phase-3-pre-operationnelle.md`.
- **VÉRIFIÉ** — Aucun fichier source, configuration, dépendance ou migration SQL n’a été modifié; aucune migration SQL n’a été exécutée.
- **VÉRIFIÉ** — Aucun déploiement, test PostgreSQL ou accès à une base réelle n’a été effectué. Le contrôle purement local de `TEST_DATABASE_URL` a échoué au format sans connexion.
- **VÉRIFIÉ** — Aucun secret, aucune valeur d’environnement ni donnée réelle d’élève n’a été exposé. `TEST_DATABASE_URL` a été utilisée uniquement pour le contrôle local de format, sans connexion.
- **VÉRIFIÉ** — Le rapport Phase 3 a été créé au chemin demandé.
- **NON VÉRIFIÉ** — Identité et version de la base actuelle, migrations effectivement appliquées, sauvegarde/restauration et conformité juridique.

## 14. Verdict global

**PARTIELLEMENT VÉRIFIÉ — RISQUES IDENTIFIÉS — DÉCISION DU FONDATEUR REQUISE.** Les protections de code et de schéma sont vérifiables et les tests unitaires/statique passent; l’environnement PostgreSQL et la plupart des garanties d’exploitation ne le sont pas. Les écarts de documentation, la configuration de test invalide, les brouillons visibles par `viewer`, l’absence de preuve de restauration et les obligations juridiques non évaluées empêchent de conclure à une préparation suffisante pour des données réelles.

La Phase 3 s’arrête à ce rapport. **La Phase 4 n’est pas commencée. Aucune décision n’est prise au nom du fondateur; approbation explicite attendue.**
