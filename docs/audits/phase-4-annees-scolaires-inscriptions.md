# FOUKOU-NEXA-V1 — Phase 4 : années scolaires et historique des inscriptions

- **Date :** 25 novembre 2026
- **Branche de travail :** `fix/production-build-feat-school-backend-v1`
- **Verdict :** **MODÈLE, CODE ET INTERFACE PRÉPARÉS — MIGRATION ET VALIDATION PostgreSQL EN ATTENTE**

> Cette phase prépare une structure additive et les parcours applicatifs. Elle ne prouve pas l’état d’une base distante et ne constitue pas une autorisation de migration, de reprise des données historiques ou de déploiement.

## 1. Périmètre

Audit puis ajout d’une gestion des années scolaires, d’inscriptions par année et d’un historique des changements de classe, dans l’application Next.js existante. Aucun remplacement de PostgreSQL, de l’authentification, des Server Actions, des permissions ou de l’architecture n’a été réalisé.

## 2. État initial vérifié dans le dépôt

- `migrations/001_initial.sql` définit `students.class_id` comme classe portée directement par la fiche élève, avec `school_id`, statut et `enrolled_at`. Il n’existe pas de table d’inscription annuelle ni d’année scolaire relationnelle.
- Les classes sont propres à un établissement, mais ne portent pas d’année scolaire. Les migrations `002` et `004` renforcent plusieurs liens avec des clés étrangères composites comprenant `school_id`.
- `school_settings` contient déjà un seul libellé `academic_year`, un `current_term` et des dates facultatives `year_start`/`year_end`.
- Les notes portent un terme (`grades.term`), mais aucun identifiant d’année scolaire. Les présences portent une date et une classe. Les emplois du temps, affectations, communications et synthèses du tableau de bord ne portent pas non plus de référence annuelle commune.
- `app/actions.ts` utilise des Server Actions, une session authentifiée, des permissions existantes et des transactions PostgreSQL. `requireSchool` dérive l’établissement de la session; les permissions existantes distinguent la gestion des paramètres et celle des élèves.
- Les listes d’élèves et classes utilisent la classe de la fiche. Les requêtes d’enseignant sont restreintes aux affectations. Les tableaux de bord sont calculés sur les données existantes et ne filtrent pas par année.
- La base réelle et ses rangées n’ont pas été consultées. L’inventaire automatique de schéma de l’intégration Supabase a renvoyé une erreur; le rapport de Phase 3 indique que la cible et le schéma PostgreSQL opérationnel ne sont pas confirmés. Aucune requête sur les rangées ni donnée réelle d’élève n’a été lue.

## 3. Décisions techniques retenues

### Années scolaires

- Nouvelle table `school_years`, isolée par `school_id`, avec libellé libre (2–100 caractères), dates `DATE`, statut `prepared`, `active` ou `closed`, et créateur facultatif.
- Les dates doivent être calendaires et la date de début strictement antérieure à la date de fin. Aucun format de libellé ni calendrier annuel standard n’est imposé. Les chevauchements entre années ne sont pas interdits, faute de règle métier établie.
- Un index unique partiel interdit plusieurs années `active` dans un même établissement. Le libellé est unique sans distinction de casse dans l’établissement.
- L’activation d’une année préparée clôture l’année précédemment active dans la même transaction. Une année clôturée n’est pas réactivable par les actions applicatives. La clôture rend ses inscriptions consultables en lecture seule.

### Inscriptions et changements de classe

- `student_enrollments` relie une fiche élève existante, un établissement, une année, une classe, un statut, une date d’inscription et un créateur; aucune fiche personnelle n’est dupliquée.
- Une contrainte unique `(school_id, school_year_id, student_id)` interdit les inscriptions en double dans une année. Les statuts sont `enrolled`, `withdrawn`, `transferred` et `completed`.
- `student_enrollment_class_changes` conserve l’affectation initiale et chaque changement de classe avec date d’effet et auteur. Les mises à jour passent par une transaction qui modifie l’inscription et ajoute l’événement; aucune action applicative ne modifie ou supprime cet historique.
- Les clés étrangères composites vérifient que l’année, l’élève, la classe, l’auteur et l’établissement concordent. Les classes encore référencées par une inscription ou un historique ne peuvent pas être supprimées.

### Compatibilité délibérée

L’activation ne met **pas** à jour `school_settings.academic_year`. Les notes et bulletins utilisent aujourd’hui ce champ, alors que les notes ne portent pas d’année; le synchroniser requalifierait implicitement des données historiques. L’écran Paramètres conserve donc son rôle existant. Notes, présences, emplois du temps, affectations, communications et tableaux de bord ne sont pas automatiquement filtrés par la nouvelle année. L’interface le signale explicitement. Leur rattachement nécessite une analyse et un plan de migration historique distincts, avec approbation.

## 4. Fichiers créés ou modifiés

- `migrations/006_academic_year_enrollments.sql` — nouvelle migration additive.
- `app/actions.ts` — création, activation/clôture des années, inscription et changement de classe; validations serveur, permissions existantes, transactions, verrouillage applicatif et journal d’activité.
- `lib/academic-year-domain.mjs`, `lib/academic-year-data.mjs`, `lib/academic-year-data.d.mts` — règles de dates/statuts, requêtes tenant-scoped et types des résultats.
- `lib/school-data.ts`, `lib/types.ts`, `components/foukou/types.ts` — chargement et typage des données annuelles.
- `components/foukou/academic-years-view.tsx` — interface française pour années, inscriptions et historique d’un élève.
- `components/foukou/sidebar.tsx`, `components/foukou/app-shell.tsx` — entrée de navigation et rendu de la nouvelle vue.
- `components/foukou/management-view.tsx` — clarification du libellé de création de dossier élève.
- `components/foukou/settings-view.tsx` — distinction explicite entre les paramètres historiques des notes et les inscriptions annuelles.
- `app/globals.css` — styles responsive cohérents avec l’interface existante.
- `app/layout.tsx` — métadonnées descriptives actualisées.
- `tests/academic-years.test.mjs` — tests unitaires et contrats statiques.
- `tests/database.integration.test.mjs` — scénario PostgreSQL synthétique, exécuté uniquement par le harnais de test protégé.
- `package.json` — ajout du test unitaire Phase 4 à `test:unit`; aucune dépendance ajoutée.
- `docs/audits/phase-4-annees-scolaires-inscriptions.md` — présent rapport.

Aucun autre rôle ni module métier non concerné n’a été modifié.

## 5. Migration

`006_academic_year_enrollments.sql` crée les trois tables, contraintes et index dans une transaction. Elle ne modifie aucune table existante, n’insère aucune année, ne crée aucune inscription, ne modifie aucun élève et n’effectue aucun backfill.

**État : créée dans le dépôt, non exécutée.** Aucune connexion PostgreSQL applicative, migration ou écriture n’a été exécutée; l’inventaire automatique du schéma via l’intégration a échoué. Aucune base n’a été réinitialisée. La migration ne comporte pas de down-migration : supprimer ces tables après leur alimentation détruirait les nouvelles inscriptions et leur historique; tout retour arrière devra d’abord vérifier et préserver ces données.

## 6. Sécurité

- Chaque mutation vérifie la permission existante appropriée : `settings:write` pour les années (direction) et `students:write` pour les inscriptions (direction, administration et vie scolaire, conformément à la matrice actuelle). Aucun rôle n’a été ajouté ou modifié.
- `school_id` vient de la session serveur et n’est pas accepté depuis le formulaire. Les lectures et écritures sont paramétrées et filtrées par `school_id`.
- Les références élève/classe/année sont vérifiées dans l’établissement avant l’écriture; les clés étrangères composites renforcent cette séparation en base.
- Les dates, identifiants, statuts, doublons, états clôturés et changements de classe sont validés côté serveur. Les changements d’année et d’inscription utilisent des transactions; les verrous sérialisent l’activation et les créations concurrentes pertinentes.
- Les requêtes enseignant ne renvoient que les inscriptions dont la classe est dans ses affectations; les noms de classes antérieures hors de cette portée sont masqués.
- Le dépôt n’utilise pas actuellement RLS comme barrière principale : l’isolation dépend du serveur applicatif, des permissions, des filtres SQL et des contraintes tenant. Ce choix hérité n’a pas été remplacé dans cette phase. L’historique de changement est protégé par les parcours applicatifs; une écriture SQL directe privilégiée pourrait contourner ces règles.

## 7. Tests exécutés

- `pnpm test` — **58 réussis, 0 échec, 0 ignoré**, dont les tests Phase 4 sur dates, statuts, contraintes, permissions, portée tenant, historique et absence de réattribution des notes.
- `pnpm typecheck` — réussi (`tsc --noEmit`).
- `pnpm build` — réussi avec Next.js 16.4.6.
- `node --check lib/academic-year-data.mjs && node --check lib/academic-year-domain.mjs && node --check tests/database.integration.test.mjs` — réussi; contrôle syntaxique seulement.
- `git diff --check` — réussi.
- Vérification navigateur à 369 × 564, thème sombre : la page de connexion s’affiche correctement. La vue annuelle authentifiée n’a pas été parcourue, faute de session de test confirmée et de base ayant reçu la migration.

## 8. Tests non exécutés

- Le scénario `tests/database.integration.test.mjs` n’a pas été lancé : la cible PostgreSQL et son identité ne sont pas confirmées et la migration 006 n’est pas appliquée. Aucun test n’a tenté de connexion à une base inconnue.
- Les opérations SQL réelles, contraintes PostgreSQL, concurrence, création/activation/clôture en base, doublons, liens inter-établissements, historique persistant et rendu de l’interface avec données authentifiées restent donc **non vérifiés dynamiquement**.
- Aucune donnée réelle ni synthétique n’a été créée pendant cette phase.

## 9. État des données, risques et approbations restantes

- **Données existantes :** non lues, non migrées, non modifiées et non supprimées. Il est impossible de confirmer leur volume ou leur état dans une base, faute de cible vérifiée.
- Les dossiers préexistants ne sont pas automatiquement repris dans `student_enrollments`. Il faut approuver une règle de rattachement avant tout backfill; les données actuelles ne permettent pas d’inférer sûrement toutes les années ni les anciennes classes.
- Le code de lecture de la nouvelle structure requiert la migration 006. Ne pas déployer le code applicatif sur un environnement qui n’a pas reçu cette migration.
- Les modules notes, présences, horaires et tableaux de bord ne sont pas encore année-scoped. Les données historiques ne doivent pas être attribuées à une année sur la seule base du terme ou de la date sans plan approuvé.
- L’activation automatique clôt l’année active précédente; cette règle doit être confirmée par le responsable métier avant utilisation opérationnelle.
- **Approbations restantes :** confirmer une cible PostgreSQL non-production et son identité avant tout test/migration; autoriser explicitement l’exécution de la migration sur cette cible; décider séparément si et comment reprendre les inscriptions historiques; valider les règles métier de transition et les rattachements annuels des modules historiques.

## 10. Contrôle final et verdict

- Le travail reste limité à la Phase 4 et aux fichiers énumérés ci-dessus; l’architecture, l’authentification et les rôles sont conservés.
- Aucune donnée existante n’a été supprimée ou modifiée; aucune donnée réelle d’élève n’a été créée.
- L’isolation multi-établissements et les permissions existantes sont conservées dans les mutations et renforcées par les relations composites préparées.
- Les tests unitaires, TypeScript, build et contrôles statiques indiqués ont réussi. La validation PostgreSQL demeure non exécutée.
- La migration n’a pas été appliquée sur une base inconnue; aucun déploiement n’a été effectué.

**Verdict final : Phase 4 implémentée dans le dépôt et préparée pour revue, mais non validée en base et non prête à être déployée avant confirmation de la cible, approbation de migration et décision sur l’historique existant. La Phase 5 n’a pas commencé.**
