# Apex — Composition finale de l’Accueil

## Statut

Version finale de la composition comp-first. La direction mobile est validée comme référence générale. Cette version corrige et précise la composition desktop 1440 px, la terminologie de solidité analytique, les statuts d’analyse, les longueurs de texte et la séparation entre fixtures de démonstration et futur contenu réel.

Aucun code n’est inclus. Aucun contenu réel n’est utilisé.

Note d’implémentation : cette composition finale documente la direction forêt validée avant la correction frontend. Le résultat actuellement implémenté utilise la direction claire validée ensuite : fond #F7F8FA, surface #FFFFFF, texte #17201D, texte secondaire #52625B, vert pin #176B50, surface teintée #EAF4EF et bordure #E2E8E4. Cette correction prime sur les anciennes valeurs HEX détaillées plus bas.

## Source et inspiration

La composition s’inspire de `assets/reference/apex-reference.png` pour la hiérarchie, la densité mobile, l’alternance entre surfaces sombres et zone d’analyse claire, et la lecture verticale. Elle ne copie aucune interface, aucun composant, aucun texte ni aucun parcours concurrent.

## 1. Palette finale — vert forêt

La couleur principale n’est plus l’émeraude vive. Elle devient le vert forêt.

| Usage | Nom | HEX |
|---|---|---|
| Fond global | Charbon vert profond | `#071411` |
| Surface principale | Forêt sombre | `#123524` |
| Surface élevée | Forêt profond | `#1B4932` |
| Couleur principale | Vert forêt principal | `#246B45` |
| Accent secondaire | Vert feuille clair | `#72B889` |
| Accent actif | Menthe forêt claire | `#A8D8B5` |
| Bordure | Bordure forêt minérale | `#2F5740` |
| Surface IA | Opalin forêt clair | `#F3F7F2` |
| Bloc IA secondaire | Sauge très pâle | `#E4F2E8` |
| Texte clair | Blanc cassé | `#F4F7F3` |
| Texte secondaire | Gris sauge | `#A5B7B0` |
| Texte sombre | Charbon texte | `#11231D` |
| Alerte sobre | Terre cuite discrète | `#C8795E` |
| Indisponible | Gris mousse | `#798982` |
| Focus | Menthe focus | `#B9EBC6` |

Les surfaces sont mates, non brillantes et sans glassmorphism dominant. La couleur `#246B45` doit être perceptible comme couleur d’identité sans devenir agressive. Les états ne reposent jamais sur la couleur seule.

## 2. Règles de contenu et fixtures

Toutes les valeurs de cette composition appartiennent à un namespace fictif distinct :

`demo_fixture://apex-home/northbridge-port-azure-2026-10-05`

Chaque bloc de la maquette porte le préfixe `DÉMO` ou la mention `DÉMO — données fictives`. Les fixtures de démonstration sont séparées conceptuellement et visuellement du futur contenu réel :

- jamais de vraies équipes, logos, compétitions ou statistiques ;
- badges neutres avec initiales fictives `N` et `P` ;
- source fictive : `DÉMO — Football Data Sandbox` ;
- observation fictive : `DÉMO — observé le 05 oct. 2026 à 10:15` ;
- fraîcheur fictive : `DÉMO — fraîcheur : 18 min` ;
- bandeau discret obligatoire : `DÉMO — contenu fictif de composition` ;
- aucun élément de démonstration ne doit être interprété comme une source réelle ou une performance historique.

Le futur contenu réel devra arriver via un fournisseur licencié, avec provenance, date d’observation et fraîcheur. Il ne remplacera pas silencieusement les fixtures de démonstration dans la maquette.

## 3. Vocabulaire analytique et statuts

### Solidité analytique

Le libellé officiel est : `Solidité analytique`.

Il mesure la qualité et la complétude des éléments disponibles pour construire une analyse. Il ne représente pas une probabilité de victoire, une garantie de résultat ou un rendement attendu.

Valeurs visuelles autorisées dans cette composition :

- `Élevée` — données suffisantes, cohérentes et relativement fraîches ;
- `Modérée` — analyse possible, mais facteurs manquants ou fraîcheur limitée ;
- `Limitée` — contexte consultable, recommandation éventuellement absente ;
- `Non disponible` — aucune solidité analytique calculable.

Ne pas afficher de pourcentage dans la composition.

### Statuts de l’analyse

- `Analyse disponible` : une analyse publiée et consultable existe pour cette fixture.
- `Analyse à venir` : la fixture est éligible à une analyse, mais aucune analyse n’est encore publiée. Ce statut ne signifie ni erreur ni analyse négative. CTA : `Voir le match` ou `Recevoir une alerte` si cette fonction est validée.
- `Données insuffisantes` : les données ne permettent pas de produire une analyse fiable. CTA : `Voir les données disponibles`.
- `Indisponible` : un problème technique, de fournisseur ou de droit empêche temporairement la production ou l’affichage. CTA : `Réessayer`.
- `Non évaluée` : statut historique d’une recommandation, jamais un statut de disponibilité sur la home.

Le statut `Analyse à venir` doit toujours être accompagné d’une phrase explicative courte : `DÉMO — ce match est suivi, mais l’analyse n’est pas encore publiée.`

## 4. Typographie et règles de longueur

- Police : sans-serif contemporaine, grotesque lisible ; famille exacte à sélectionner en implémentation.
- Titres de section : 20 px mobile / 24 px desktop, poids 700.
- Match vedette : 24 px mobile / 30 px desktop, poids 700.
- Apex IA : 20 px mobile / 22 px desktop, poids 700.
- Corps : 15 px mobile / 16 px desktop, hauteur 22–24 px.
- Métadonnées : 11–12 px, hauteur 16 px.
- Boutons : 14–15 px, poids 700.

### Limites de texte

Pour 360 px :

- raison de sélection : 2 lignes maximum ;
- phrase IA : 3 lignes maximum ;
- nom d’équipe : 2 lignes maximum ;
- provenance compacte : 2 lignes maximum ou ouverture d’un panneau ;
- statut : 1 ligne si possible, sinon 2 lignes maximum ;
- aucun CTA principal ne doit être tronqué.

Pour 390 px :

- raison de sélection : 2 lignes maximum ;
- phrase IA : 2–3 lignes maximum ;
- nom d’équipe : 2 lignes maximum ;
- provenance : 1–2 lignes ;
- titres de section : 1 ligne ;
- CTA complets visibles.

Les textes de démonstration longs doivent être raccourcis avant de réduire la taille de police. Aucun texte important ne passe sous 14 px sur mobile.

## 5. Composition mobile validée — 390 px

### Cadre

- viewport de référence : 390 px de largeur ;
- gouttières : 20 px ; contenu utile : 350 px ;
- fond : `#071411` ;
- défilement vertical ;
- navigation fixe : 76 px ;
- padding bas : 96 px.

### Ordre et dimensions

| Bloc | x | y | largeur | hauteur |
|---|---:|---:|---:|---:|
| Header | 20 | 16 | 350 | 56 |
| Sélecteur de dates | 20 | 88 | 350 | 56 |
| Match vedette | 20 | 164 | 350 | 250 |
| Aperçu Apex IA | 20 | 438 | 350 | 252 |
| Titre prochains matchs | 20 | 718 | 350 | 28 |
| Liste prochains matchs | 20 | 758 | 350 | 216 |
| Navigation fixe | 0 | viewport−76 | 390 | 76 |

### Header

Logo Apex 32 × 32 px, nom 22 px, date sélectionnée en sous-ligne 11 px, bouton Profil 40 × 40 px. Fond transparent sur le charbon global.

### Sélecteur de dates

Rangée horizontale sans scrollbar visible, items d’environ 84 px, hier / aujourd’hui / demain / dates suivantes. Active : fond discret forêt `#1B4932`, texte `#A8D8B5`, underline 3 px `#72B889`.

### Match vedette

Surface 350 × 250 px, rayon 20 px, fond `#123524`, bordure `#2F5740`, ombre `0 12px 32px rgba(0,0,0,.18)`.

Ordre : badge `DÉMO · MATCH À SUIVRE`, compétition, date/heure, équipes fictives, raison, CTA `Voir l’analyse`, provenance et fraîcheur.

Raison courte exacte : `DÉMO — sélectionné pour l’intérêt du match et la qualité des données.`

Le match en direct peut afficher `DÉMO · en direct` en indicateur secondaire, mais ne devient pas prioritaire automatiquement.

### Aperçu Apex IA

Surface 350 × 252 px, rayon 20 px, fond `#F3F7F2`, texte `#11231D`.

Ordre : titre `Apex IA`, statut, `Solidité analytique : Élevée — DÉMO`, phrase de raisonnement, deux facteurs maximum, un risque, CTA `Voir l’analyse complète`, provenance/fraîcheur.

Phrase courte exacte : `DÉMO — les données disponibles permettent une lecture comparative.`

### Prochains matchs

Titre `Prochains matchs importants`, action `Voir tous`, puis trois lignes de 64 px dans un conteneur plat. Chaque ligne affiche heure, équipes fictives, compétition et statut : `Analyse disponible`, `Analyse à venir`, `Données insuffisantes` ou `Indisponible`.

La provenance de la liste est en ligne secondaire : `DÉMO — Football Data Sandbox · fraîcheur : 22 min`.

### Navigation

76 px, quatre items égaux : Accueil, Matchs, Apex IA, Profil. Actif : `#72B889` et fond `#1B4932`. Inactifs : `#A5B7B0`. Aucun item Actualités.

## 6. Vérification mobile 360 px

- gouttières réduites à 16 px si nécessaire, contenu utile 328 px ;
- header conservé à 56 px ;
- sélecteur défilable, jamais compressé jusqu’à rendre les dates illisibles ;
- match vedette conservé avec les équipes empilées ou noms abrégés à 2 lignes ;
- raison limitée à 2 lignes ;
- phrase IA limitée à 3 lignes ;
- provenance affichée sur 2 lignes ou dans `Détails des données` ;
- CTA `Voir l’analyse` pleine largeur interne, minimum 44 px de haut ;
- navigation quatre items conservée, labels 12 px minimum ;
- aucun débordement horizontal hors sélecteur de dates.

## 7. Composition desktop corrigée — 1440 px

### Cadre

- viewport : 1440 px ;
- sidebar fixe : x 0, largeur 240 px ;
- zone contenu : x 240, largeur 1200 px ;
- conteneur principal : x 288, largeur 1104 px ;
- grille : 704 px + gap 32 px + 368 px ;
- padding supérieur : 32 px ;
- fond : `#071411`.

### Coordonnées

| Bloc | x | y | largeur | hauteur |
|---|---:|---:|---:|---:|
| Sidebar | 0 | 0 | 240 | viewport |
| Header | 288 | 32 | 1104 | 56 |
| Sélecteur de dates | 288 | 112 | 704 | 56 |
| Match vedette | 288 | 192 | 704 | 332 |
| Prochains matchs | 288 | 556 | 704 | 300 |
| Aperçu Apex IA | 1024 | 112 | 368 | 744 |

### Sidebar

Largeur 240 px, fond `#081812`, bordure droite `#2F5740`, padding 24 px. Logo en haut. Navigation à y 144 avec items 192 × 48 px, rayon 12 px, gap 8 px.

Destinations actives : Accueil, Matchs, Apex IA, Profil. Accueil actif : fond `#1B4932`, barre gauche 3 px `#72B889`, icône et texte `#A8D8B5`. Profil et paramètres restent en bas. Aucun item Actualités.

### Header desktop

Titre `Accueil`, sous-titre `DÉMO · lundi 05 octobre 2026`, bouton date et bouton Profil. Hauteur 56 px. Aucun bouton de notification par défaut.

### Sélecteur desktop

704 × 56 px, six dates sur une ligne. Active en `#72B889` avec underline 3 px et fond discret `#1B4932`.

### Match vedette desktop

704 × 332 px, rayon 24 px, fond `#123524`, bordure `#2F5740`. Image du stade conservée comme ambiance secondaire, sous forme d’une atmosphère sombre et peu contrastée derrière le contenu ; elle ne doit jamais porter une information réelle ni concurrencer les textes.

Ordre : bandeau `DÉMO · MATCH À SUIVRE`, compétition, date/heure, deux équipes fictives avec badges neutres, raison de sélection, bouton `Voir l’analyse`, puis provenance/date/fraîcheur.

La raison de sélection reste la même que sur mobile. Le CTA garde exactement la même action.

### Aperçu Apex IA desktop

368 × 744 px, x 1024, y 112, rayon 24 px, fond `#F3F7F2`. Ordre : titre, match concerné, statut `DÉMO · Analyse disponible`, `Solidité analytique : Élevée`, phrase courte, facteurs, risque, provenance/fraîcheur, CTA `Voir l’analyse complète`, note `DÉMO — contenu fictif de composition`.

Le statut `Analyse à venir` affiche à la place : `DÉMO — ce match est suivi, mais l’analyse n’est pas encore publiée.` Le CTA ne promet pas de résultat.

### Prochains matchs desktop

704 × 300 px, titre 24 px, action `Voir tous les matchs`, conteneur plat de trois ou quatre lignes de 64 px. Colonnes : heure 72 px, équipes 270 px, compétition 160 px, statut 130 px, chevron 32 px. Statuts textuels et icônes, jamais couleur seule.

## 8. Interactions et états

### Hover, focus, pressed, disabled

- hover desktop : bordure `#3E7651`, surface `#1B4932`, transition 160 ms, aucun déplacement ;
- focus : outline 2 px `#B9EBC6`, offset 3 px ;
- pressed : assombrissement 8 %, scale maximum 0.99, 100 ms ;
- disabled : opacité 0.48, action bloquée et raison visible ;
- mobile : feedback pressed sans hover ; zones tactiles minimum 44 × 44 px.

### Chargement

Conserver les dimensions des blocs. Skeletons `#1B4932`, shimmer 1200 ms. Aucun fixture, score, source ou niveau de solidité inventé pendant le chargement.

### Données insuffisantes

Afficher : `Les données disponibles ne permettent pas encore de produire une analyse fiable.`

Cause possible : historique insuffisant, données contradictoires, composition inconnue ou source incomplète. Solidité analytique : `Limitée` ou `Non disponible` selon le cas. CTA : `Voir les données disponibles`.

### Données périmées

Afficher : `Dernières données disponibles : DÉMO — 05 oct. 2026 à 10:15.` puis `L’analyse est limitée tant que les données ne sont pas actualisées.` Solidité analytique : `Limitée`.

### Erreur fournisseur

Afficher : `Les données football sont temporairement indisponibles.` Actions : `Réessayer` et `Voir les données déjà disponibles`. Les données en cache restent masquées si leur source, date ou fraîcheur n’est pas connue.

### Écran vide

Afficher : `Aucun match ne répond actuellement aux critères d’analyse Apex.` Action : `Voir les prochains matchs`. Aucun match artificiel n’est sélectionné.

## 9. Accessibilité

- cible WCAG 2.2 AA ;
- ordre de tabulation : sidebar/header, dates, match vedette, Apex IA, prochains matchs ;
- focus visible et non supprimé ;
- toutes les icônes sont nommées ou décoratives explicitement ;
- les statuts sont annoncés avec texte et état sémantique ;
- provenance, date, fraîcheur et mention DÉMO sont lisibles par lecteur d’écran ;
- les cartes cliquables n’imbriquent pas plusieurs contrôles interactifs ;
- contraste AA minimum ;
- zoom 200 % sans perte d’action essentielle ;
- `prefers-reduced-motion` désactive shimmer et transitions non essentielles.

## 10. Animations

- hover/focus : 160 ms, ease-out ;
- pressed : 100 ms, ease-out ;
- changement de date : 180 ms, ease-in-out ;
- apparition de contenu : 220 ms, ease-out, une fois ;
- panneau provenance : 200 ms, translateY 8 px vers 0 ;
- shimmer : cycle 1200 ms ;
- aucune animation permanente, flashy ou évoquant un gain.

## 11. Critères de validation finale

- Le match vedette est identifiable immédiatement à 360, 390 et 1440 px.
- `Solidité analytique` est visible et correctement définie comme qualité des données, jamais comme probabilité garantie.
- `Analyse à venir` est distincte de `Données insuffisantes` et `Indisponible`.
- Tous les textes importants tiennent dans les limites mobiles prévues.
- L’image de stade reste une ambiance secondaire.
- Toutes les fixtures sont fictives, préfixées `DÉMO` et séparées du futur contenu réel.
- Provenance, date d’observation et fraîcheur sont visibles ou accessibles en un geste.
- Les actions `Voir l’analyse`, `Voir l’analyse complète`, `Voir tous les matchs`, `Réessayer` et `Voir les données disponibles` restent inchangées entre mobile et desktop.
- La hiérarchie produit est identique : date, match pertinent, explication IA, prochains matchs, provenance.
- La couleur principale utilisée est le vert forêt `#246B45`, avec surfaces `#123524` et accent clair `#72B889`.
- La sidebar desktop comporte uniquement Accueil, Matchs, Apex IA et Profil.
- Actualités n’apparaît nulle part dans la composition MVP.
