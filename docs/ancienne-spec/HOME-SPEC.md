# Apex — Spécification UI Accueil

## Statut et périmètre

Spécification UI complète de la seule surface Accueil Apex. Aucun code et aucune autre page ne sont inclus dans ce livrable.

## 1. Objectif

L’utilisateur ouvre Apex pour découvrir les matchs importants du jour et identifier rapidement celui qui mérite son attention analytique.

En moins de 10 secondes, il doit comprendre :

- quel match est mis en avant ;
- pourquoi ce match est sélectionné ;
- si une analyse Apex IA est disponible ;
- quelle action il peut effectuer ensuite.

Apex est une plateforme d’analyse sportive informative, pas un bookmaker. L’écran ne doit jamais ressembler à un coupon de pari, promettre un résultat ou suggérer un gain garanti.

## 2. Référence visuelle

Référence : `assets/reference/apex-reference.png`.

À reprendre : fluidité mobile, hiérarchie forte, densité maîtrisée, sections compactes, contraste entre données sportives et zone d’analyse.

À ne pas reprendre : interface, composants, textes, parcours ou identité de FotMob, WhoScored, Sofascore ou d’un autre concurrent.

## 3. Navigation

### Mobile

Navigation inférieure fixe avec quatre éléments actifs :

1. Accueil
2. Matchs
3. Apex IA
4. Profil

La navigation mobile reste limitée à cinq éléments maximum. Actualités ne doit pas apparaître dans le MVP.

### Desktop

Barre latérale gauche d’environ 240 px :

- logo Apex en haut ;
- Accueil actif ;
- Matchs ;
- Apex IA ;
- Profil ;
- paramètres accessibles discrètement depuis Profil.

## 4. Structure mobile — largeur de référence 390 px

Ordre exact du premier écran :

1. Header Apex avec date sélectionnée ;
2. Sélecteur de date ;
3. Match vedette du jour ;
4. Aperçu Apex IA lié au match vedette ;
5. Prochains matchs importants ;
6. Provenance et fraîcheur accessibles pour chaque bloc.

### 4.1 Header

Contenu :

- logo Apex ;
- date actuelle ou date sélectionnée ;
- bouton Profil ;
- bouton de notifications uniquement si un besoin produit est confirmé.

Le header reste compact et ne doit pas consommer la hauteur réservée au match vedette.

### 4.2 Sélecteur de date

Rangée horizontale défilable contenant :

- hier ;
- aujourd’hui ;
- demain ;
- autres dates accessibles par défilement.

La date active est identifiée par une couleur menthe ou émeraude et un indicateur non fondé uniquement sur la couleur.

Interactions :

- appuyer sur une date recharge les matchs ;
- afficher un skeleton pendant le chargement ;
- ne jamais afficher de faux matchs pendant la transition ;
- conserver la position de défilement utile.

### 4.3 Match vedette

Le match vedette est le bloc principal. Il est sélectionné selon :

1. l’intérêt du match ;
2. la qualité et la suffisance des données ;
3. la disponibilité d’une analyse Apex IA.

Un match en direct ne devient pas automatiquement le match vedette. Une information live peut apparaître comme indicateur secondaire, sans transformer Accueil en suivi live.

Contenu obligatoire :

- compétition ;
- date et heure ;
- équipe domicile ;
- équipe extérieure ;
- logos ou placeholders explicitement identifiés ;
- statut du match ;
- raison courte de la sélection ;
- indicateur de données disponibles ;
- provenance, date d’observation et fraîcheur ;
- bouton principal `Voir l’analyse`.

Texte recommandé :

- `Match à suivre`
- `Sélectionné pour la qualité des données et l’intérêt analytique`

Ne pas afficher de cote comme élément principal. Interdire notamment : `pari sûr`, `gain garanti`, `victoire assurée`.

### 4.4 Aperçu Apex IA

Placer directement sous le match vedette un aperçu compact qui explique au lieu d’afficher uniquement une conclusion.

Contenu :

- titre `Apex IA` ;
- statut : `Analyse disponible`, `Analyse en préparation`, `Données insuffisantes` ou `Indisponible` ;
- `Niveau de solidité analytique` ;
- une phrase de raisonnement ;
- deux ou trois facteurs principaux maximum ;
- un risque ou contre-signal ;
- provenance, date d’observation et fraîcheur ;
- bouton `Voir l’analyse complète`.

Exemple de contenu :

`Les deux équipes présentent une tendance régulière à produire des occasions.`

`Solidité analytique : élevée`

`Facteurs : forme récente, historique des buts`

`Risque : données d’absences incomplètes`

Le niveau de solidité analytique n’est pas une probabilité garantie et ne doit jamais être présenté comme une promesse de résultat.

### 4.5 Prochains matchs

Section compacte placée après Apex IA. Elle ne doit pas voler la priorité au match vedette.

Chaque ligne ou carte contient :

- heure ;
- compétition ;
- équipes ;
- statut de l’analyse ;
- accès au détail ;
- provenance et fraîcheur lorsque des données sont affichées.

Action : `Voir tous les matchs` ouvre Matchs avec la date sélectionnée.

### 4.6 Provenance et fraîcheur

Chaque bloc de données doit afficher ou rendre accessible :

- source ;
- date d’observation ;
- fraîcheur ;
- état `réel`, `synthétique` ou `indisponible`.

La provenance peut être présentée comme texte secondaire, tooltip, drawer ou bouton `Détails des données`, mais elle ne doit pas être complètement cachée. Une donnée sans provenance, date ou fraîcheur n’est pas rendue.

## 5. Structure desktop

Breakpoints à vérifier : 1280 px et 1440 px.

- barre latérale gauche d’environ 240 px ;
- header supérieur ;
- zone principale centrée ;
- colonne secondaire possible pour l’aperçu Apex IA ou les matchs à venir ;
- match vedette toujours dominant visuellement ;
- espace respirable et peu de cartes ;
- pas de dashboard rempli de petites tuiles ;
- même hiérarchie que mobile, redistribuée en colonnes.

La colonne secondaire ne doit jamais masquer la provenance, le raisonnement ou l’action principale du match vedette.

## 6. Actions et parcours de clic

### Match vedette

- clic sur la carte : ouvre le détail du match ;
- `Voir l’analyse` : ouvre l’analyse Apex IA du match ;
- favori : demande une connexion si l’utilisateur est anonyme ;
- provenance : ouvre les détails des données.

### Apex IA

- `Voir l’analyse complète` : ouvre l’analyse détaillée ;
- données insuffisantes : ouvre une explication, jamais une page vide ;
- analyse indisponible : affiche la cause et `Réessayer`.

### Sélecteur de date

- changement de date ;
- chargement progressif ;
- absence de faux contenus ;
- conservation de la position de défilement ;
- état vide si aucun match pertinent.

### Prochains matchs

- clic sur une carte : ouvre le détail du match ;
- `Voir tous les matchs` : ouvre Matchs avec la date sélectionnée.

### Profil

- utilisateur connecté : ouvre Profil ;
- utilisateur anonyme : ouvre la fenêtre de connexion.

La consultation des matchs et analyses publiques ne nécessite pas de compte. Le compte est requis uniquement pour favoris, historique et préférences.

## 7. États obligatoires

### Chargement

Skeletons respectant la forme réelle :

- header ;
- dates ;
- match vedette ;
- analyse IA ;
- prochains matchs.

Ne jamais afficher de texte, match, statistique ou recommandation inventé pendant le chargement.

### Succès

Afficher les données réelles avec provenance, date d’observation, fraîcheur et statut de l’analyse.

### Aucun match pertinent

Texte : `Aucun match ne répond actuellement aux critères d’analyse Apex.`

Action : `Voir les prochains matchs`.

Ne pas sélectionner artificiellement un match.

### Données insuffisantes

Texte : `Les données disponibles ne permettent pas encore de produire une analyse fiable.`

Causes possibles :

- historique insuffisant ;
- données contradictoires ;
- composition inconnue ;
- source incomplète.

### Données périmées

Afficher :

`Dernières données disponibles : [date].`

`L’analyse est limitée tant que les données ne sont pas actualisées.`

Réduire la solidité analytique ou bloquer l’analyse selon la règle de fraîcheur définie.

### Erreur fournisseur

Texte : `Les données football sont temporairement indisponibles.`

Actions : `Réessayer` et `Voir les données déjà disponibles`.

Ne jamais remplacer l’erreur par des données plausibles inventées.

### Utilisateur non connecté

Autoriser la consultation publique. Demander la connexion uniquement pour favoris, historique et préférences.

## 8. Composants

- `HomeHeader`
- `DateSelector`
- `FeaturedMatch`
- `MatchSelectionReason`
- `DataFreshnessBadge`
- `DataProvenanceDetails`
- `ApexInsightPreview`
- `AnalyticalSolidityIndicator`
- `FactorList`
- `RiskSignal`
- `UpcomingMatches`
- `UpcomingMatchRow`
- `HomeStateView`
- `MobileBottomNavigation`
- `DesktopSidebar`

Les composants doivent rester plats et composables. Éviter les cartes imbriquées et les abstractions purement décoratives.

## 9. Textes et vocabulaire

Préférer :

- `Niveau de solidité analytique`
- `Données disponibles`
- `Données insuffisantes`
- `Données temporairement indisponibles`
- `Dernières données disponibles`
- `Voir l’analyse`
- `Voir l’analyse complète`
- `Détails des données`
- `Non évaluée`

Interdire les formulations affirmant ou suggérant une garantie de gain ou de résultat.

## 10. Direction visuelle

Palette : charbon profond, vert émeraude, vert menthe, gris ardoise, blanc cassé pour les textes principaux et couleurs d’état sobres.

Éviter : bleu dominant, blanc dominant, noir pur, rouge et vert agressifs rappelant les paris, gradients excessifs, cartes imbriquées, icônes aléatoires et décoration sans fonction.

Typographie : excellente lisibilité mobile, titres courts et hiérarchisés, métadonnées contrastées, aucune ligne importante trop longue.

## 11. Animations

- transitions de 160 à 220 ms ;
- apparition douce des données ;
- transition légère lors d’un changement de date ;
- ouverture courte des panneaux ;
- skeleton animé discrètement ;
- feedback visuel au clic ;
- aucun bounce ;
- aucun effet flashy ;
- aucune animation permanente ;
- respect de `prefers-reduced-motion`.

## 12. Responsive

Vérifier au minimum :

- 360 px ;
- 390 px ;
- 430 px ;
- tablette ;
- desktop 1280 px ;
- desktop 1440 px.

Le premier écran mobile doit conserver l’ordre exact des blocs. À 360 px, les actions et métadonnées restent lisibles sans défilement horizontal involontaire, hors sélecteur de dates explicitement défilable.

## 13. Critères d’acceptation

La conception est validée si :

- le match vedette est identifiable immédiatement ;
- sa raison de sélection est compréhensible ;
- l’état de l’analyse Apex IA est clair ;
- les données ne ressemblent pas à des données inventées ;
- provenance, date et fraîcheur sont accessibles ;
- aucun élément ne ressemble à une incitation agressive au pari ;
- les actions principales sont évidentes ;
- les états d’erreur et de données insuffisantes sont conçus ;
- l’écran reste lisible à 360 px ;
- le desktop ne devient pas un dashboard surchargé ;
- la navigation reste limitée aux quatre zones du MVP ;
- aucune section Actualités n’apparaît.
