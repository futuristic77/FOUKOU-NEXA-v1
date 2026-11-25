# Phase 4B — Audit de validation pré-migration

- **Date :** 25 novembre 2026
- **Branche :** `fix/production-build-feat-school-backend-v1`
- **HEAD observé :** `218a173` — `Implement school years and enrollment history`
- **Périmètre :** audit statique du dépôt et préparation d’un protocole PostgreSQL. Aucun code fonctionnel n’a été modifié.
- **Verdict :** **NO-GO pour exécuter ou déployer la Phase 4 à ce stade.** La migration paraît additive au niveau du DDL, mais des écarts fonctionnels d’historique, une suppression en cascade de données annuelles et l’absence de validation PostgreSQL isolée bloquent le feu vert.

## 1. Résumé de l’audit

Le commit et le fichier `migrations/006_academic_year_enrollments.sql` sont présents dans le dépôt. La migration ajoute `school_years`, `student_enrollments` et `student_enrollment_class_changes`, avec des clés étrangères composites par établissement, des contraintes d’unicité, des contrôles de dates/statuts et des index. Elle ne fait ni `ALTER TABLE` sur les tables métier existantes, ni insertion, mise à jour ou reprise historique : **le DDL est additif sur le dépôt**.

L’isolation applicative est cohérente avec l’architecture serveur existante pour les chemins examinés : la session fournit `schoolId`, les actions contrôlent les permissions côté serveur, les requêtes filtrent par établissement et les relations SQL empêchent plusieurs liens inter-établissements. Ce n’est cependant pas une isolation SQL autonome : aucune politique RLS n’a été trouvée dans les migrations. Les lectures et certaines règles d’historique reposent donc sur le serveur applicatif.

Deux anomalies opérationnelles sont prioritaires :

1. l’ancienne édition du dossier élève change `students.class_id` sans écrire l’historique annuel, tandis que la nouvelle action change `student_enrollments.class_id` sans synchroniser `students.class_id` (`app/actions.ts`, lignes 77–97 et 587–620) ;
2. la suppression existante d’un élève supprime en cascade ses inscriptions annuelles et leur historique (`app/actions.ts`, lignes 100–109 ; migration 006, FK élève et FK historique).

Les tests statiques et unitaires annoncés dans le rapport Phase 4 ne démontrent pas l’exécution réelle de PostgreSQL. L’audit présent n’a consulté aucune base, n’a pas relancé les tests et n’a pas vérifié le ledger de migrations distant. Le rapport Phase 4 précédent indiquait que la migration n’était pas appliquée ; cet état distant ne peut pas être confirmé sans connexion, laquelle était explicitement interdite.

## 2. État réel de la migration

### Ce qui est vérifiable dans le dépôt

- `migrations/006_academic_year_enrollments.sql` est présent dans le commit `218a173` et contient son propre `BEGIN` / `COMMIT`.
- Le contenu crée trois tables, trois clés primaires UUID, plusieurs clés étrangères composites et des index. Aucune table existante n’est transformée et aucune ligne historique n’est reprise.
- Les FK composites dépendent des clés `UNIQUE (school_id, id)` installées par `migrations/002_tenant_integrity.sql` sur `users`, `students` et `classes`. Le migrateur applique les fichiers numériques dans l’ordre ; une cible dont le schéma ne contient pas ces prérequis ne pourra pas exécuter 006.
- `ON DELETE SET NULL (colonne)` est utilisé dans la migration 006. Cette syntaxe exige PostgreSQL 15 ou ultérieur ; la migration 004 existante l’utilise également. Le harnais de test est codé pour PostgreSQL majeur 17.
- Le migrateur (`scripts/migrate.mjs`) exige une cible et des empreintes explicitement autorisées, puis exécute chaque migration dans une transaction et inscrit le nom dans `schema_migrations` dans la même transaction.

### Ce qui n’est pas vérifiable sans base

- La version, le schéma réel, l’état du ledger et la présence de 001–005 dans une base donnée.
- Que 006 n’a été appliquée dans aucun environnement distant. Le précédent rapport dit qu’elle ne l’a pas été ; cette Phase 4B n’a pas lu le ledger.
- Que le schéma réel est strictement celui des migrations du dépôt.

**Aucune migration n’a été lancée pendant cet audit.** Il ne faut donc pas interpréter le commit comme preuve d’un état de base.

### Risque de perte, rollback et verrouillage

- L’application de 006 elle-même ne modifie ni ne supprime les données existantes. Ses tables commencent vides. Il n’y a pas de backfill caché.
- Les suppressions ultérieures peuvent perdre les nouvelles données : supprimer une année supprime ses inscriptions (`ON DELETE CASCADE`), supprimer un élève supprime ses inscriptions annuelles (`ON DELETE CASCADE`), et supprimer une inscription supprime ses événements de classe (`ON DELETE CASCADE`). Le dossier élève dispose déjà d’une action de suppression définitive.
- Aucun script de rollback n’est fourni. Une erreur avant validation/commit doit annuler la transaction ; après commit, supprimer ces tables détruirait les inscriptions et l’historique accumulés. Un retour arrière doit d’abord préserver/exporter ces données et être approuvé.
- 006 ne crée des tables et index que sur les nouvelles tables, initialement vides ; elle ne réécrit pas les grosses tables élèves/notes/présences et n’y valide pas de nouvelles FK. Le risque de verrouillage prolongé de données existantes semble donc limité par rapport à une migration avec backfill. Il subsiste les verrous DDL et référentiels nécessaires sur les tables parentes ; à confirmer sur une copie de production et avec une fenêtre de migration. Ne pas exécuter en production sur la base de cette seule analyse statique.

### Contraintes et index

- Année : date de début strictement antérieure à la date de fin ; statut limité à `prepared`, `active`, `closed` ; libellé non vide et normalisé par `lower(btrim(...))` pour l’unicité ; un seul statut `active` par école.
- Inscription : unicité `(school_id, school_year_id, student_id)` ; liens à l’année, à l’élève, à la classe et au créateur limités à la même école.
- Historique : lien à l’inscription, à la classe précédente/suivante et à l’acteur par `school_id` ; la classe précédente peut être nulle pour l’affectation initiale.
- Les clés étrangères ne valident pas que les événements sont chronologiques, que `class_after_id` correspond à la classe courante de l’inscription, ou que les dates d’inscription/changement tombent dans les bornes de l’année. Ces invariants sont actuellement surtout applicatifs.
- Point de performance à valider : la liste annuelle filtre par `school_id` et `class_id` sur toutes les années, alors que l’index principal commence par `(school_id, school_year_id, class_id)` ; l’index ne couvre pas directement ce prédicat sans `school_year_id`. Le filtre enseignant de l’historique par classe après changement n’a pas non plus d’index commençant par `class_after_id`. Faire des `EXPLAIN (ANALYZE, BUFFERS)` sur des volumes représentatifs avant de décider si un index supplémentaire est nécessaire ; aucun index ne doit être ajouté sans mesure.

## 3. Anomalies détectées et risques techniques

### P1 — Classe historique et classe du dossier peuvent diverger

- `saveStudent` continue à mettre à jour `students.class_id` (ligne 88) via l’écran « Élèves et classes ». Ce chemin ne crée pas d’événement dans `student_enrollment_class_changes`.
- `updateStudentEnrollment` met à jour seulement `student_enrollments.class_id` et ajoute un événement si la classe change (lignes 607–616) ; il ne met pas à jour `students.class_id`.
- Les listes ordinaires, statistiques et fonctionnalités existantes utilisent la classe du dossier élève ; l’écran annuel utilise la classe de l’inscription. Après l’un ou l’autre chemin, les deux vues peuvent donc être contradictoires et une mutation legacy peut contourner l’historique annuel.
- **Prérequis :** décider quelle donnée est la source canonique et comment les changements legacy interagissent avec une ou plusieurs inscriptions annuelles. Aucun changement n’a été réalisé dans cette phase.

### P1 — Suppression définitive incompatible avec la conservation attendue de l’historique

`deleteStudent` effectue une suppression physique, avec journalisation, et l’interface propose cette suppression. Les nouvelles FK cascade effacent les inscriptions annuelles puis leurs changements de classe. Le dossier précédent et ses données scolaires sont déjà supprimés par ce parcours ; la Phase 4 étend l’effet à l’historique annuel, sans archivage ni politique de conservation propre à ces nouvelles tables.

**Prérequis :** approbation explicite de la politique de conservation/suppression (archiver, anonymiser, empêcher la suppression, ou assumer la cascade) avant toute utilisation avec des données réelles.

### P2 — Invariants d’historique non garantis par PostgreSQL

La base autorise des événements datés hors année, datés avant un événement précédent, avec `class_after_id` différent de la classe courante de l’inscription, ou avec un `class_before_id` qui ne correspond pas à l’état précédent. L’action applicative insère les événements dans sa transaction, mais un SQL direct ou un futur chemin serveur peut contourner ces règles. Le statut de l’inscription peut aussi être changé librement entre les quatre valeurs ; aucune table d’historique de statut n’existe.

**Prérequis :** décider si ces invariants sont des règles métier obligatoires, puis les contrôler dans le plan de tests et dans une évolution approuvée, sans présumer ici de la règle.

### P2 — Dépendance à l’isolation du serveur

Aucune politique RLS n’apparaît dans les migrations existantes. Le code utilise une connexion PostgreSQL côté serveur (`lib/db.ts`) et dépend des contrôles d’authentification, permissions, filtres tenant et FK composites. Une fuite ou un usage non prévu du rôle DB partagé n’est pas contenu par RLS ; les FK empêchent certaines écritures incohérentes, pas la lecture SQL inter-tenant. Cela correspond au modèle applicatif existant, mais doit être accepté comme limite explicite.

### Compatibilité applicative et déploiement

L’additivité du DDL ne rend pas le nouveau code compatible avec une base qui n’a pas encore les tables : `getSchoolData` lit immédiatement les tables annuelles. Il faut garantir l’ordre de déploiement (migration validée avant activation du code qui lit/écrit ces tables) ou une autre stratégie de compatibilité approuvée. Le rollback du code après alimentation ne justifie pas la suppression des tables.

## 4. Vérification de l’isolation par établissement

### Preuves favorables dans le code

- `perform` obtient l’utilisateur par `requireUser(permission)` puis l’école par `requireSchool(user)` (`app/actions.ts`, lignes 17–28). Le `schoolId` ne vient pas du formulaire.
- Les créations/activations/clôtures exigent `settings:write`; les créations/mises à jour d’inscription exigent `students:write` (lignes 466–620). Les contrôles sont dans les Server Actions, donc pas seulement dans l’interface.
- Chaque mutation filtre par `school_id` et valide que l’année, l’élève et la classe appartiennent à cette école. Les requêtes annuelles filtrent par `school_id`; les jointures vérifient également l’école. Les enseignants sont limités à leurs classes affectées (`lib/academic-year-data.mjs`, `lib/school-data.ts`).
- Les FK composites de 006 empêchent d’attacher une inscription à l’année, à l’élève, à la classe ou à l’acteur d’un autre `school_id`, et empêchent les liens d’historique inter-établissements.
- Matrice observée (`lib/permissions.mjs`) : `settings:write` est donné à `director`; `students:write` est accordé à `director`, `administration` et `secretary`. Enseignants, lecteurs et super-admin plateforme n’obtiennent pas ces permissions par cette matrice. Les règles appliquent la matrice existante, sans rôles propres à la Phase 4.
- L’ancien parcours élève contrôle lui aussi l’école de session. Le rôle `teacher` reçoit ses données annuelles filtrées par classe affectée ; le nom de l’ancienne classe hors portée est neutralisé lors du mapping dans `lib/school-data.ts`.

### Limites de preuve

- Il n’existe pas de RLS ; un accès SQL direct avec le rôle applicatif n’est pas tenant-scoped par PostgreSQL.
- Les tests Phase 4 lus (`tests/academic-years.test.mjs`) vérifient les permissions et filtres principalement par contrats/statique. Le scénario PostgreSQL d’intégration ajoute des lignes dans deux écoles et vérifie les FK et lectures, mais n’exécute pas les Server Actions avec une session/chaque rôle.
- Aucun test PostgreSQL n’a été exécuté pendant cet audit. L’isolation décrite est donc une revue de code, pas une preuve dynamique complète.

**Conclusion isolation :** aucune voie de contournement inter-tenant évidente dans les actions/requêtes annuelles examinées ; les protections applicatives et les FK sont cohérentes avec le modèle existant. L’isolation des lectures SQL directes dépend de la confidentialité et du cloisonnement du rôle serveur. Validation PostgreSQL et tests serveur négatifs restent nécessaires.

## 5. Analyse des inscriptions historiques

Aucune reprise n’est faite par la migration. Le schéma historique (`migrations/001_initial.sql`) conserve une fiche élève avec `school_id`, `class_id`, `status` (`active`/`inactive`) et `enrolled_at`; il ne conserve ni année scolaire explicite ni historique de classes. `school_settings.academic_year` est un libellé de paramétrage également utilisé par les notes historiques, et ne prouve pas l’année d’une inscription individuelle.

| Situation | Ce que les données prouvent | Traitement prudent proposé |
|---|---|---|
| Élève inscrit avant la Phase 4 | Dossier, classe actuelle et date d’inscription uniquement | Ne pas créer automatiquement d’inscription annuelle ; garder le dossier original inchangé jusqu’à rapprochement documenté. |
| Année actuelle non explicite | Le libellé du paramètre d’école n’établit pas l’année par élève | Laisser sans attribution annuelle tant qu’une source vérifiée ne l’établit pas. |
| Changement de classe antérieur | `students.class_id` donne au mieux la classe courante ; aucune séquence passée garantie | Ne pas inventer de changements. Conserver toute pièce source séparément et importer seulement les événements confirmés après approbation. |
| Élève ayant quitté l’établissement | `active` / `inactive` ne distingue pas départ, fin d’année, transfert ou archivage | Ne pas convertir automatiquement `inactive` en `withdrawn`, `transferred` ou `completed`. |
| Réinscription après interruption | La contrainte unique autorise une seule inscription par élève/année, quel que soit le statut | Clarifier si la réinscription dans la même année réactive/modifie la ligne existante ou représente un épisode distinct ; ne pas contourner l’unicité par données synthétiques. |
| Élève présent dans plusieurs établissements | Les fiches sont propres à une école ; aucun identifiant personne commun n’est défini | Ne pas fusionner ni apparier sur nom/date de naissance. Traiter chaque dossier dans son établissement, sauf rapprochement vérifié et autorisé. |
| Données anciennes incomplètes/incohérentes | Le DDL n’inspecte ni ne répare les anciennes lignes | Ne pas attribuer d’année/classe/statut supposé. Documenter les cas non résolus et les laisser hors reprise. |

### Stratégie de reprise prudente, si elle est approuvée ultérieurement

1. Sauvegarder et rendre consultables en lecture seule les valeurs source et un état de référence, sans modifier les dossiers existants.
2. Construire sur une copie non-production un inventaire de rapprochement avec source et preuve par ligne ; distinguer explicitement confirmé, ambigu et absent.
3. Faire approuver par le responsable métier les critères, les exceptions et le traitement des cas ambigus. Les cas ambigus restent non attribués, sans valeur par défaut.
4. N’insérer que les associations confirmées, dans une opération transactionnelle et journalisée ; comparer les effectifs/empreintes avant-après et conserver l’export source. Garder les dossiers legacy inchangés.
5. Exécuter un dry-run et faire valider le rapport ligne par ligne avant toute écriture sur une cible approuvée. Cette reprise est hors Phase 4B et n’a pas été exécutée.

## 6. Comparaison des règles de clôture

L’implémentation actuelle n’est pas l’une de ces décisions métier de manière neutre : `activateSchoolYear` clôture automatiquement l’année précédemment active dans la transaction d’activation. `closeSchoolYear` autorise la clôture manuelle d’une année préparée ou active. Une année `closed` est non modifiable par les actions de Phase 4 et ne peut pas être réactivée par l’action actuelle. Il n’y a ni `closed_at`/`closed_by` propres à l’année, ni action de réouverture.

| Option | Risques et permissions | Inscription, classe, historique, erreurs et établissements |
|---|---|---|
| **A. Clôture manuelle par admin autorisé** | L’action existante nécessite `settings:write` (actuellement direction seulement). Risque d’oubli, de clôture trop tôt ou de sélection erronée ; faible automatisation. | Les écritures d’inscription/changement sont bloquées ensuite, les données restent lisibles. Une erreur n’est pas réversible par l’UI : une réouverture exigerait une règle, une permission et une trace dédiées. Risque limité par école si le `schoolId` reste serveur-dérivé. |
| **B. Clôture automatique à une date configurée** | Aucun job automatique n’existe. Les dates de début/fin existent, mais leur fuseau, l’instant exact, les extensions et les jours fériés ne sont pas définis. Un job nécessite identité système, permission, reprise après échec, idempotence et alertes. | Peut clôturer malgré inscriptions incomplètes, transfert non terminé ou correction en cours ; les changements post-date seraient rejetés. Il faut préciser si la date clôt l’année seule ou active la suivante, et traiter chevauchement/absence d’année suivante. Erreur et réouverture peuvent toucher tous les utilisateurs de l’école. |
| **C. Automatique avec confirmation administrative** | Une date déclenche une demande, puis un rôle autorisé confirme. Réduit les clôtures silencieuses, mais ajoute états, notifications, expiration, gestion des confirmations manquantes et protection contre les doubles clics. Le statut actuel ne prévoit pas « en attente ». | Permet de vérifier inscriptions et changements avant verrouillage, mais la confirmation tardive maintient des écritures après la date. À définir : confirmation, délégation, annulation et réouverture ; événement d’audit durable nécessaire. Doit être isolé par établissement et échec d’un établissement ne doit pas en clôturer un autre. |

**Aucune option n’est choisie ici à la place du fondateur.** L’activation actuelle clôturant déjà l’année précédente, il faut décider explicitement si ce comportement doit être conservé, remplacé ou soumis à confirmation.

## 7. Plan de tests PostgreSQL — à exécuter plus tard

Tous les tests doivent être menés sur une cible non-production séparée, isolée de toute donnée d’usager, de préférence un PostgreSQL temporaire/dédié de version 17 (au minimum 15 pour la syntaxe de FK utilisée). Aucun secret de production ne doit être fourni au processus ou au runner. Préparer des données synthétiques uniquement dans cette cible, avec suffixes UUID et nettoyage vérifié.

1. **Prévol et identité :** vérifier hôte, port, base, rôle, version majeure, schéma, privilèges et empreintes attendues ; refuser avant toute écriture si l’identité ne correspond pas exactement à la cible approuvée. Vérifier que `DATABASE_URL` de production est absente du processus de test.
2. **État initial :** appliquer ou restaurer sur la cible les migrations 001–005, puis enregistrer schéma, ledger et comptages/empreintes des tables historiques. Confirmer les clés candidates composites réellement présentes et l’absence de données métier non-test dans la cible.
3. **Application de 006 :** appliquer dans une transaction, vérifier la présence des trois tables, contraintes et index dans `pg_catalog`, et confirmer qu’un échec contrôlé annule les objets et l’entrée du ledger. Vérifier qu’une seconde application est refusée proprement ou ignorée selon le contrat du migrateur.
4. **Non-régression historique :** comparer après migration les lignes/empreintes de `students`, `classes`, `school_settings`, `grades`, `attendance` et autres tables historiques à l’état de référence. Les nouvelles tables doivent être vides tant qu’aucune création de test n’a été faite.
5. **Contraintes et relations :** vérifier dates invalides, label vide/espaces, doublon de libellé sans casse, seconde année active, statut interdit, doublon élève/année, lien année/élève/classe/auteur d’une autre école, FK de classe précédente/suivante et suppression de classe référencée. Vérifier le comportement documenté des cascades sans exécuter de suppression sur une vraie donnée.
6. **Parcours annuels :** créer années préparée/active/clôturée, inscriptions à plusieurs années, statuts, classe initiale et plusieurs changements ; contrôler l’ordre d’affichage et la persistance. Tester explicitement réinscription même année après retrait, dates hors période et changement de statut/classe après retrait : comparer au contrat métier qui devra être approuvé, sans présumer de la réponse.
7. **Isolation A/B :** créer deux établissements synthétiques et tenter, à la fois via requêtes/services et directement via FK, de lire/modifier les inscriptions et événements adverses. Les lectures de A ne doivent pas inclure B ; les mutations serveurs A avec des IDs de B doivent échouer sans effet. Tester aussi l’année, l’auteur et les classes inter-écoles.
8. **Permissions serveur :** appeler les Server Actions avec sessions de rôles réellement authentifiés : autorisés et refusés selon la matrice observée. Ne pas se limiter aux tests de chaîne statiques ni à l’état désactivé des boutons UI. Tester l’absence de session, session inactive, schoolId absent et ID manipulé.
9. **Enseignants :** données de deux classes affectées et d’une classe non affectée ; vérifier inscriptions, événements et masquage des noms de classe hors périmètre. Vérifier qu’une affectation désactivée ne conserve pas l’accès.
10. **Transactions/concurrence/échec :** provoquer une FK/unique violation après création d’une inscription mais avant journalisation et vérifier l’annulation complète ; lancer simultanément deux créations identiques, deux activations, une clôture et une inscription. Vérifier absence de double inscription/deux années actives et absence d’événement orphelin. Observer le comportement sur erreurs DB et rejouer seulement après résolution.
11. **Rollback :** sur clone jetable, démontrer rollback atomique avant commit. Après commit, ne pas prétendre qu’un rollback SQL existe : tester uniquement une procédure approuvée de sauvegarde/restauration sur copie, car supprimer les tables détruit l’historique.
12. **Verrous/performance :** sur volume représentatif, mesurer temps d’application, verrous, requêtes liste annuelle et historique avec `EXPLAIN (ANALYZE, BUFFERS)`. Ne pas déduire le coût production d’une base vide.
13. **Nettoyage :** confirmer que seules les rangées synthétiques créées ont été supprimées et que l’état initial est restauré. Conserver sortie de tests, version, identity fingerprint non secrète et ledger pour audit.

### Limite du harnais actuel

`pnpm test:db` passe par `scripts/run-database-tests.mjs` et exige `TEST_DATABASE_URL`, jamais `DATABASE_URL` comme repli. `scripts/test-database-guard.mjs` épingle cependant une cible Supabase distante précise, le rôle/base `postgres`, le schéma `public`, le port serveur 5432 et PostgreSQL 17 ; le rôle ne peut pas créer d’objets dans `public`. Les tests écrivent des rangées dans les tables du projet et les nettoient ensuite. Ce n’est pas équivalent à une base locale temporaire ou à un schéma jetable indépendant. Le test runner actuel ne peut donc pas être supposé satisfaire le besoin d’isolation demandé sans vérifier et approuver la cible. Aucun URL ou secret n’a été lu ou utilisé ici.

## 8. Prérequis pour validation

- Décision du fondateur sur la source canonique de classe et sur le parcours legacy de modification d’élève.
- Décision explicite sur la conservation des inscriptions/historiques lors d’une suppression d’élève ou d’année.
- Décision sur le cycle de vie des inscriptions : statuts, réinscription dans la même année, dates hors période et chronologie des changements.
- Règle de clôture choisie par le fondateur et règle de réouverture ; ne pas inférer cette règle de l’activation actuelle.
- Instance PostgreSQL non-production dédiée ou restauration temporaire et isolée, version 17 recommandée, avec identité vérifiable, sauvegarde jetable et aucune donnée réelle. Vérifier que le harnais autorise cette cible avant de le lancer ; ne pas utiliser une URL de production ni le endpoint codé en dur par simple défaut.
- Schéma de référence confirmé : migrations 001–005 et ledger à jour, clés composites présentes, version et privilèges connus.
- Plan de restauration approuvé, logs/tests conservés, observabilité des verrous et fenêtre d’exécution ; une approbation séparée sera requise pour toute exécution de migration future.
- Tests dynamiques des actions et permissions ajoutés/planifiés dans une tâche autorisée distincte, car le scénario PostgreSQL actuel exerce surtout le SQL et les fonctions de lecture.

## 9. Décisions nécessitant l’approbation du fondateur

1. Quel champ est canonique pour la classe courante : `students.class_id`, l’inscription de l’année active, ou une règle transitoire ? L’édition legacy doit-elle être bloquée ou répercutée dans l’historique ?
2. Les dossiers élèves peuvent-ils être supprimés physiquement après inscription annuelle ? Quelle durée et quelles exceptions de conservation s’appliquent aux inscriptions et changements de classe ?
3. Une seule inscription par élève/année suffit-elle en cas de départ puis retour dans la même année ? Quels sens donner à `transferred` et `completed` ?
4. Les inscriptions et changements peuvent-ils être datés en dehors des bornes annuelles ? Les années peuvent-elles se chevaucher ? Peut-il y avoir un intervalle sans année active ?
5. Clôture A, B ou C ? Qui confirme, quel effet sur l’année active précédente, quelles notifications et quelles permissions de réouverture ? Confirmer ou refuser l’auto-clôture faite aujourd’hui lors d’une activation.
6. Les permissions actuelles (direction seule pour gérer/clôturer les années, administration et vie scolaire pour gérer inscriptions) sont-elles bien voulues ?
7. Le modèle sans RLS, fondé sur la confiance au serveur et aux credentials DB, est-il le niveau de défense attendu ou une protection SQL supplémentaire est-elle requise dans une phase ultérieure ?
8. Quelle cible PostgreSQL dédiée est approuvée pour les tests et pour une éventuelle migration ? Aucun endpoint ne doit être sélectionné à la place du fondateur.
9. Les index proposés suffisent-ils aux volumes attendus ? Décision après mesure, pas avant.

## 10. Verdict

**NO-GO pour migration opérationnelle, reprise historique ou déploiement de cette Phase 4 tant que les prérequis, décisions fondatrices, corrections de cohérence approuvées et tests PostgreSQL isolés ne sont pas validés.** Le SQL du commit est additif et les relations composites constituent une bonne défense contre les références croisées, mais cela ne valide ni le schéma réel, ni les transactions/concurrences, ni les permissions en exécution. Les deux anomalies P1 (désynchronisation entre classe legacy et classe annuelle ; suppression en cascade de l’historique) doivent être traitées ou explicitement acceptées avant utilisation avec des données réelles.

### Opérations explicitement non effectuées

- Migration 006 : **non exécutée pendant Phase 4B** ; état des bases distantes **non interrogé**. Le rapport Phase 4 antérieur la déclarait non appliquée.
- Connexion à PostgreSQL, production ou autre : **aucune** ; aucun URL/secret lu, aucune requête SQL exécutée.
- Donnée réelle ou synthétique créée, modifiée ou supprimée : **aucune**.
- Tests PostgreSQL réels, migration de test et rollback : **non exécutés**.
- Déploiement : **aucun**.
- Résultats 58/58, TypeScript et build : **rapportés par la Phase 4 précédente, non relancés ni réattestés dans cet audit**.
