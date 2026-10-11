# Apex — Composition visuelle comp-first de l’Accueil

## Implémentation actuelle — 2026-10-08

The live implementation follows the corrected light direction, which supersedes the dark palette described in the historical composition below:

| Role | HEX |
|---|---|
| Canvas | `#F7F8FA` |
| Surface | `#FFFFFF` |
| Primary text | `#17201D` |
| Secondary text | `#52625B` |
| Pine action | `#176B50` |
| Tinted selection | `#EAF4EF` |
| Border | `#E2E8E4` |

The implemented order is header/date context, date selector, featured match, Apex IA preview, then upcoming matches. Desktop uses a 224px sidebar and a two-column content grid; mobile uses four labeled bottom-navigation items and a single column. The stadium ambience, gradients, repeated DÉMO badges and oversized AI icon were removed. A single global demo banner and provenance rows carry the synthetic-data disclosure.

The composition is interactive: date changes cancel their previous delayed fixture update, cards open honest detail panels, provenance uses an accessible native dialog, favorites explain the account requirement, and unimplemented destinations state their status. The actual football provider and IA remain to be selected and connected.

The detailed historical measurements below describe the initial forest composition. They remain useful as hierarchy references, but the implemented correction uses the light tokens above and takes precedence over every older HEX value in this document.

## Statut

Composition de référence sans code. Elle décrit deux north stars : mobile 390 px et desktop 1440 px. Tous les matchs, statistiques, sources et textes football ci-dessous sont des données de démonstration fictives et doivent être étiquetés `DÉMO — données fictives` dans toute maquette visible.

La composition s’inspire de `assets/reference/apex-reference.png` pour sa hiérarchie, sa densité et son rythme. Elle ne reproduit aucune interface concurrente.

## Contrat visuel commun

### Palette

| Usage | HEX |
|---|---|
| Fond principal | `#F7F8FA` |
| Surface | `#FFFFFF` |
| Texte principal | `#17201D` |
| Texte secondaire | `#52625B` |
| Vert pin principal | `#176B50` |
| Surface teintée | `#EAF4EF` |
| Bordure | `#E2E8E4` |

Le vert sert aux actions et à l’accent analytique ; il ne représente jamais un gain garanti. Les états utilisent toujours un libellé ou une icône en plus de la couleur.

### Typographie

- Police sans-serif contemporaine, proche d’une grotesque lisible ; la famille exacte reste à sélectionner avant implémentation.
- Titres de section : 24 px, poids 700, hauteur de ligne 29 px.
- Titre du match vedette : 24 px mobile / 30 px desktop, poids 700, hauteur de ligne 31/36 px.
- Titre Apex IA : 20 px mobile / 22 px desktop, poids 700.
- Corps principal : 15 px mobile / 16 px desktop, poids 400–500, hauteur de ligne 22/24 px.
- Métadonnées : 12 px, poids 500, hauteur de ligne 16 px.
- Données numériques importantes : 18–22 px, poids 700.
- Labels d’état : 11–12 px, poids 700, capitalisation normale ou petite capitale uniquement si lisible.

### Géométrie

- Rayon principal : 20 px.
- Rayon des contrôles : 12 px.
- Rayon des badges : 999 px.
- Bordures : 1 px, `#E2E8E4`.
- Ombres : utilisées avec parcimonie, uniquement pour séparer une surface flottante.
- Grille de base : multiples de 4 px.
- Aucun empilement de cartes imbriquées ; les surfaces IA utilisent des divisions internes plates.

### Données de démonstration

Le contenu illustratif est explicitement fictif :

- `DÉMO — Ligue des Champions` ;
- `DÉMO — Northbridge FC vs Port Azure` ;
- `DÉMO — 21h00` ;
- `DÉMO — Analyse disponible` ;
- `DÉMO — Source Football Data Sandbox` ;
- `DÉMO — observé le 05 oct. 2026 à 10:15` ;
- `DÉMO — fraîcheur : 18 min`.

Ne pas utiliser de vraies équipes, logos ou statistiques dans la composition.

# 1. Composition mobile — 390 × hauteur libre

## Cadre général

- Viewport : 390 × hauteur libre.
- Fond : `#071411`.
- Gouttière horizontale : 20 px ; contenu utile de 350 px.
- Défilement vertical de la page.
- Navigation fixe en bas : 76 px de haut, au-dessus du contenu, avec safe-area éventuelle de 16 px.
- Padding bas du document : 96 px pour éviter que le dernier contenu soit masqué.

## Coordonnées et ordre

Les coordonnées sont exprimées depuis le haut de la page, hors barre système. Les positions verticales sont une référence de composition et peuvent s’allonger pour les états de texte.

| Bloc | x | y | largeur | hauteur | espace suivant |
|---|---:|---:|---:|---:|---:|
| Header | 20 | 16 | 350 | 56 | 16 |
| Sélecteur de dates | 20 | 88 | 350 | 56 | 20 |
| Match vedette | 20 | 164 | 350 | 250 | 24 |
| Aperçu Apex IA | 20 | 438 | 350 | 252 | 28 |
| Titre prochains matchs | 20 | 718 | 350 | 28 | 12 |
| Liste prochains matchs | 20 | 758 | 350 | 216 | 0 |
| Barre de navigation fixe | 0 | viewport−76 | 390 | 76 | — |

La première vue utile jusqu’à environ 690 px contient le header, les dates, le match vedette et l’essentiel de l’aperçu IA. Les prochains matchs commencent avant le pli suivant mais ne concurrencent pas le match principal.

## 1.1 Header — 56 px

Structure horizontale :

- x 20–52 : logo Apex compact, 32 × 32 px ;
- x 64–248 : mot `Apex`, 22 px, poids 700 ; sous-ligne `DÉMO · 05 oct. 2026`, 11 px, `#A5B7B0` ;
- x 302–350 : bouton Profil, 40 × 40 px, rayon 12 px, surface `#122A23`.

Le header indique la date sélectionnée sans répéter une date non confirmée. Une notification n’est pas incluse dans la composition de base.

## 1.2 Sélecteur de dates — 56 px

Rangée horizontale scrollable, sans scrollbar visible :

- quatre items de largeur environ 84 px ;
- hier, aujourd’hui, demain, dates suivantes ;
- label jour 12 px ;
- date 14 px ;
- état actif en `#49E3B1` avec underline 3 px, largeur 56 px, rayon 999 px ;
- séparateurs verticaux absents pour garder la rangée calme.

La date active est `DÉMO — aujourd’hui`. Le changement de date conserve le scroll horizontal et remplace les contenus par des skeletons.

## 1.3 Match vedette — 250 px

Surface x 20, y 164, w 350, h 250, rayon 20 px, fond `#0D211C`, bordure 1 px `#214139`, ombre sombre.

Ordre interne :

1. Ligne supérieure à 24 px du haut : badge `DÉMO · MATCH À SUIVRE` à gauche, statut `DÉMO · analyse disponible` à droite.
2. Compétition centrée, 12 px, `#A5B7B0`.
3. Heure et date centrées, 14 px, `#F4F7F3`.
4. Comparaison des deux équipes : deux colonnes de 132 px séparées par `vs` central ; logos fictifs en cercle 44 px, noms sur deux lignes maximum.
5. Raison de sélection dans une bande plate menthe sombre : `DÉMO — sélectionné pour l’intérêt du match et la qualité des données.`
6. CTA `Voir l’analyse`, x 92, largeur 206 px, hauteur 44 px, fond `#00B887`, texte `#071411`, rayon 999 px.
7. Ligne provenance en bas : `DÉMO · Sandbox · observé 10:15 · fraîcheur 18 min`, 10 px, avec bouton icône `i` 20 px.

Les logos ne sont pas des logos réels : cercles neutres avec initiales `N` et `P`, libellés `DÉMO`. Aucun score ou cote n’est montré dans la composition par défaut.

## 1.4 Aperçu Apex IA — 252 px

Surface x 20, y 438, w 350, h 252, rayon 20 px, fond `#F3F7F2`, bordure `#D9F7EC`, ombre claire.

Structure interne :

- header horizontal, 52 px : icône Apex dans un cercle émeraude 32 px, titre `Apex IA` 20 px sombre, badge `DÉMO · disponible` à droite ;
- phrase principale à y + 68 : `DÉMO — Les deux équipes présentent une forme récente suffisamment régulière pour une lecture comparative.` ;
- solidité : label `Niveau de solidité analytique`, valeur `Élevé — DÉMO`, menthe sombre, jamais exprimée en pourcentage ;
- deux facteurs maximum en ligne compacte : `DÉMO · forme récente` et `DÉMO · données buts` ;
- contre-signal dans un panneau pâle `#E4F2EB` : `Risque — DÉMO : absences encore incomplètes.` ;
- CTA texte ou bouton secondaire `Voir l’analyse complète`, hauteur 40 px, fond transparent, bordure 1 px `#00B887`, texte `#08785E` ;
- provenance en bas : `DÉMO · source Sandbox · observé 10:15 · fraîcheur 18 min`.

Si l’analyse est absente, conserver cette même surface mais remplacer la conclusion par l’état explicatif. Le bloc ne doit jamais afficher une recommandation sans facteurs et risque.

## 1.5 Prochains matchs — 256 px environ

Titre à x 20, hauteur 28 px : `Prochains matchs importants`, poids 700, 20 px. À droite : `Voir tous`, 13 px, `#A5B7B0`, chevron 16 px.

Liste x 20, largeur 350 px, trois lignes de 64 px séparées par bordures 1 px `#214139` :

- colonne heure : 48 px ;
- colonne équipes : 150 px ;
- colonne compétition : 86 px ;
- colonne état : 42 px ;
- padding horizontal 12 px ;
- rayon conteneur global 16 px ;
- état d’analyse affiché comme icône + libellé court, jamais comme seule couleur.

Exemples fictifs : `DÉMO 18:45`, `DÉMO Eastbay / Redmont`, `DÉMO · disponible`, `DÉMO 21:00`, `DÉMO Harbor / Union`, `DÉMO · insuffisant`.

Provenance de la liste dans une ligne secondaire discrète sous le conteneur : `DÉMO · source Sandbox · fraîcheur 22 min`.

## 1.6 Navigation mobile fixe — 76 px

- x 0, y viewport−76, w 390, h 76 ;
- fond `#081812` avec bordure supérieure 1 px `#214139` ;
- quatre items de largeur 97,5 px ;
- icône 22 px, label 12 px ;
- actif Accueil : icône et label `#49E3B1`, point 5 px à 8 px sous le label ;
- inactifs : `#A5B7B0` ;
- zones tactiles minimum 44 × 44 px ;
- aucun item Actualités.

Icônes : maison, terrain de football, étincelle/cerveau Apex IA, profil. Utiliser une seule famille d’icônes cohérente, avec variantes outline et filled pour l’actif.

# 2. Composition desktop — 1440 × hauteur libre

## Cadre général

- Viewport : 1440 px de largeur.
- Fond : `#071411`.
- Barre latérale fixe : x 0, y 0, largeur 240 px, hauteur viewport.
- Zone de contenu : x 240, largeur 1200 px.
- Conteneur principal : x 288, largeur 1104 px, max-width 1104 px ; marge droite 48 px.
- Grille : zone principale 704 px, gap 32 px, colonne secondaire 368 px.
- Padding haut contenu : 32 px.

## Coordonnées et ordre

| Bloc | x | y | largeur | hauteur |
|---|---:|---:|---:|---:|
| Sidebar | 0 | 0 | 240 | viewport |
| Header contenu | 288 | 32 | 1104 | 56 |
| Sélecteur de dates | 288 | 112 | 704 | 56 |
| Match vedette | 288 | 192 | 704 | 332 |
| Prochains matchs | 288 | 556 | 704 | 300 |
| Aperçu Apex IA secondaire | 1024 | 112 | 368 | 744 |

Sur desktop, l’aperçu Apex IA est placé dans la colonne secondaire mais reste aligné au sommet du contenu. Le match vedette demeure le point focal principal par sa largeur et son poids visuel.

## 2.1 Sidebar — 240 px

- fond `#081812` ;
- bordure droite 1 px `#214139` ;
- padding horizontal 24 px ;
- logo Apex à x 24, y 32, hauteur 32 px ;
- navigation à y 144 ;
- items largeur 192 px, hauteur 48 px, rayon 12 px, gap 8 px ;
- actif Accueil : fond `#12362B`, texte et icône `#49E3B1`, barre gauche 3 px ;
- inactifs : `#A5B7B0` ;
- Profil à y viewport−112 ;
- paramètres comme action secondaire dans Profil, pas comme entrée principale.

Icônes : maison, terrain, étincelle/cerveau, profil. Aucun item Actualités.

## 2.2 Header desktop — 56 px

- titre `Accueil`, 24 px, poids 700 ;
- sous-titre `DÉMO · lundi 05 octobre 2026`, 13 px, `#A5B7B0` ;
- à droite : bouton date sélectionnée, 160 × 40 px, puis bouton Profil 40 × 40 px ;
- aucun bouton de notification par défaut.

## 2.3 Sélecteur de dates desktop — 56 px

Position x 288, y 112, largeur 704 px. Six items de largeur 104–120 px : hier, aujourd’hui, demain et trois dates suivantes.

- état actif `#49E3B1`, underline 3 px ;
- surface transparente sur le fond ;
- texte jour 12 px, date 14 px ;
- les dates supplémentaires restent accessibles sans créer une deuxième rangée.

## 2.4 Match vedette desktop — 332 px

Surface x 288, y 192, w 704, h 332, rayon 24 px, fond `#0D211C`, bordure `#214139`, ombre sombre.

Structure :

- bandeau haut 40 px : `DÉMO · MATCH À SUIVRE`, compétition, statut analyse ;
- zone centrale 150 px : équipes en deux colonnes 230 px, logos fictifs 64 px, `vs` 32 px ;
- ligne date/heure centrée ;
- raison de sélection sur une bande menthe sombre de hauteur 56 px ;
- CTA `Voir l’analyse` de 220 × 48 px centré ;
- bandeau bas 40 px : provenance, observation, fraîcheur et bouton détails.

La composition desktop peut accueillir une image d’ambiance abstraite très discrète dans la surface, mais aucune photographie réelle, aucun logo réel et aucune donnée non vérifiée ne sont requis pour cette comp.

## 2.5 Aperçu Apex IA desktop — 744 px

Surface x 1024, y 112, w 368, h 744, fond `#F3F7F2`, rayon 24 px, ombre claire. La structure est verticale et lisible :

1. en-tête `Apex IA` et statut ;
2. match concerné ;
3. niveau de solidité analytique ;
4. phrase de raisonnement ;
5. facteurs principaux ;
6. risque/contre-signal ;
7. bouton `Voir l’analyse complète` ;
8. provenance et fraîcheur ;
9. note calme `DÉMO — les données affichées sont fictives`.

Les éléments sont espacés de 20–24 px. Aucun pourcentage, cote ou libellé de gain n’est utilisé.

## 2.6 Prochains matchs desktop — 300 px

Position x 288, y 556, largeur 704 px. Titre 24 px avec action `Voir tous` à droite. Liste sous forme d’un seul conteneur plat, trois ou quatre lignes de 64 px, séparées par des bordures. Colonnes : heure 72 px, équipes 270 px, compétition 160 px, statut 130 px, chevron 32 px.

La provenance de la liste est placée en bas du conteneur, sur une ligne 12 px. Les détails ne doivent pas concurrencer le match vedette.

# 3. États et comportements communs

## Chargement

- conserver les mêmes boîtes et hauteurs que le succès ;
- skeleton du header, dates, match vedette, IA et liste ;
- skeletons `#123027` avec shimmer très lent, 1200 ms ;
- aucun texte de match ou statistique inventé ;
- après sélection d’une date, remplacer uniquement les données dépendantes, sans faire sauter la structure.

## Données insuffisantes

Conserver le contexte du match, réduire le poids visuel de l’analyse et afficher :

`Les données disponibles ne permettent pas encore de produire une analyse fiable.`

Cause secondaire possible : historique insuffisant, données contradictoires, composition inconnue ou source incomplète. Le CTA devient `Voir les données disponibles`.

## Erreur fournisseur

Afficher :

`Les données football sont temporairement indisponibles.`

Actions : `Réessayer` et `Voir les données déjà disponibles`. Les données en cache doivent porter leur date et leur fraîcheur ; sinon elles restent masquées.

## Écran vide

Afficher :

`Aucun match ne répond actuellement aux critères d’analyse Apex.`

Action : `Voir les prochains matchs`. Ne jamais forcer un match vedette artificiel.

## Données périmées

Afficher la dernière date connue et :

`L’analyse est limitée tant que les données ne sont pas actualisées.`

Le niveau de solidité analytique devient `Limité` ou l’analyse est bloquée selon la règle métier finale.

## Hover, focus, pressed, disabled

- Hover desktop : bordure passe à `#356A59`, surface augmente légèrement vers `#122A23`, 160 ms ; aucun déplacement.
- Focus clavier : outline 2 px `#8AF6CF`, offset 3 px, jamais supprimé.
- Pressed : surface assombrie de 8 %, scale maximum 0.99, 100 ms ; pas de bounce.
- Disabled : opacité 0.48, curseur non-interactif, contraste du texte maintenu autant que possible, raison exposée si l’action est bloquée.
- Mobile : remplacer hover par feedback pressed ; les zones tactiles restent au minimum 44 × 44 px.

## Clics

- carte vedette : détail du match ;
- `Voir l’analyse` : analyse Apex IA du match ;
- `Voir l’analyse complète` : analyse détaillée ;
- dates : rechargement progressif et skeleton ;
- prochaines rencontres : détail du match ;
- `Voir tous` : Matchs avec date conservée ;
- favori : connexion si anonyme ;
- provenance : panneau de détails ;
- Profil : Profil connecté ou connexion anonyme.

# 4. Accessibilité

- cible WCAG 2.2 AA ;
- ordre de tabulation : sidebar/header, date selector, match vedette, IA, prochains matchs, navigation ;
- toutes les icônes ont un nom accessible ou `aria-hidden` si redondantes ;
- les cartes cliquables ne doivent pas créer de nested interactive controls ;
- la date active est signalée par texte, état sémantique et indicateur visuel ;
- les statuts réel/synthétique/indisponible ne reposent jamais sur la couleur seule ;
- contraste minimum AA pour texte normal et grand texte ;
- focus visible sur chaque action ;
- `prefers-reduced-motion` désactive shimmer, transitions non essentielles et apparitions animées ;
- les lecteurs d’écran reçoivent la provenance, la date d’observation et la fraîcheur sous une forme lisible ;
- les erreurs sont annoncées dans une zone live non intrusive ;
- le contenu reste utilisable à 200 % de zoom sans perte d’action essentielle.

# 5. Animations exactes

- transition hover/focus : 160 ms, ease-out ;
- pressed : 100 ms, ease-out ;
- changement de date : 180 ms, ease-in-out ;
- apparition du contenu reçu : 220 ms, ease-out, une seule fois ;
- ouverture drawer provenance : 200 ms, translateY 8 px vers 0 ;
- shimmer loading : cycle 1200 ms, interrompu par `prefers-reduced-motion` ;
- feedback après clic : 160 ms, sans rebond ;
- aucune animation permanente hors shimmer de chargement ;
- aucune animation flashy ou liée à une promesse de gain.

# 6. Critères de validation de la composition

- À 390 px, le match vedette est visible et compréhensible sans ouvrir une autre page.
- La raison de sélection est lisible avant le CTA.
- L’état Apex IA est immédiatement distinguable et lié au match vedette.
- La provenance et la fraîcheur sont visibles ou atteignables en un geste.
- Les prochains matchs restent secondaires.
- Aucun bloc n’utilise une cote ou un vocabulaire de bookmaker comme point focal.
- À 1440 px, la sidebar reste stable, le match vedette reste dominant et la colonne IA n’écrase pas le contenu principal.
- Les états loading, insuffisant, périmé, erreur et vide conservent une hiérarchie honnête.
- Les quatre destinations MVP sont les seules destinations actives.
- Toutes les données de cette composition sont marquées comme démo et fictives.

## Ajustement implémenté — 8 octobre 2026

Cette section fait foi pour les changements d’apparence demandés après la composition initiale.

Les sélections de navigation et de filtres ont un fond gris `#EFEFF0` et un texte `#17201D`, sans bordure verte. Le vert pin `#176B50` reste réservé aux actions et aux accents informatifs utiles. Les boutons d’analyse utilisent un fond vert translucide de 8 %, porté à 13 % au survol et à 18 % à l’appui. Le fond de l’Accueil est `#FAFAFB`, les surfaces `#FFFFFF`, les traits fins `#EBEBED` et le texte secondaire `#606369`.

Desktop : sidebar 224 px ; marges du contenu 32 px ; grille centrale avec colonne analytique de 320 px et gouttière de 24 px. Entre 1000 et 1199 px, la colonne analytique passe à 288 px, la gouttière à 20 px et les marges à 24 px. Les panneaux principaux ont un rayon de 16 px et des marges internes de 18 × 20 px. La barre de date et la ligne de filtres mesurent chacune au minimum 64 px. Les rencontres sont regroupées par compétition, avec lignes d’au moins 88 px.

Mobile : ordre date et filtres, match vedette, aperçu Apex IA, prochains matchs. Marges 16 px, panneaux de rayon 12 px et marges internes 12 × 14 px ; ligne de date 56 px et ligne de filtres 60 px minimum. Contrôles tactiles de 44 px minimum. La navigation basse conserve Accueil, Matchs, Apex IA et Profil avec une sélection grise. Le nom Apex demeure visible et le titre Accueil reste accessible aux lecteurs d’écran.

L’aperçu conserve la solidité analytique, les facteurs, le risque et la provenance. Le bandeau global `DÉMO — contenu fictif de composition` et les détails de provenance rendent la simulation explicite sans répéter le badge sur chaque rencontre. Les transitions existantes restent discrètes et respectent reduced-motion. Les panneaux utilisent la fermeture clavier et le retour du focus. Les états de démonstration restent disponibles en bas de page.

Captures du résultat : `assets/reference/apex-home-mobile-light.jpg` et `assets/reference/apex-home-desktop-light.jpg`. Rendu inspecté à 360, 390, 768 et 1440 px sans débordement horizontal détecté. Aucun fournisseur réel, backend ou IA réelle n’a été raccordé.
