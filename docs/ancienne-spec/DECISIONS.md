# Apex — Décisions

## 1. Décisions validées

- Le MVP contient quatre zones actives : Accueil, Matchs, Apex IA et Profil.
- Actualités est reportée hors MVP et ne doit pas apparaître comme fonctionnalité active.
- La navigation mobile reste limitée à cinq éléments maximum ; le MVP utilise quatre éléments.
- Apex est une plateforme d’analyse sportive informative, pas un bookmaker.
- Aucune garantie de gain ou de résultat ne doit être formulée.
- La langue initiale est le français.
- Les données publiques peuvent être consultées sans compte.
- Un compte est nécessaire pour les favoris, l’historique et les préférences.
- Le fournisseur football reste abstrait et sera “à sélectionner après étude des coûts, droits et couverture”.
- Aucune donnée ne doit être affichée sans provenance, date d’observation et fraîcheur.
- “Confidence” signifie “niveau de solidité analytique”, et non une probabilité garantie.
- Une recommandation peut être absente lorsque les données sont insuffisantes.
- Les données synthétiques sont séparées des données réelles.
- La cible d’accessibilité est WCAG 2.2 AA.
- Les budgets API et IA restent à valider après comparaison des fournisseurs.
- Les interfaces concurrentes ne doivent pas être reproduites ; les références servent uniquement à étudier des principes généraux de lisibilité et de densité.

## 2. Décisions encore ouvertes

- Pays et marchés de lancement.
- Fournisseur football, licence, compétitions, quotas, couverture et profondeur historique.
- Règles exactes de fraîcheur par type de donnée.
- Taxonomie des événements analysés.
- Règles d’évaluation des recommandations et traitement des corrections.
- Modèle IA, fournisseur, région d’hébergement et stratégie de fallback.
- Budget mensuel, coût maximal par match, volume quotidien et latence cible.
- Calibration du niveau de solidité analytique.
- Âge minimum, avertissements, restrictions géographiques et revue juridique.
- Politique de confidentialité, rétention, suppression et export.
- Stack finale et organisation des environnements/deployment.
- Politique d’analytics et consentement.
- Politique de modération pour les éventuelles fonctions communautaires futures.

## 3. Hypothèses utilisées

- Le MVP commence comme une expérience publique de consultation, avec authentification progressive pour les fonctions personnelles.
- Les comptes et données personnelles sont gérés via Supabase, sous réserve de validation de la stack finale.
- Les recommandations sont générées uniquement à partir d’un snapshot de données identifié et daté.
- Les cotes sont optionnelles et ne constituent pas une dépendance du moteur d’analyse.
- Les actualités et la communauté restent hors périmètre jusqu’à validation de leurs sources, droits et règles de modération.
- Le français est utilisé pour l’interface, les explications et les messages d’état initiaux.

## 4. Décisions qui bloquent le développement

- L’absence de fournisseur et de droits de données empêche toute intégration réelle ou affichage de données de production.
- L’absence de règles de fraîcheur et de provenance empêche de définir le contrat d’affichage fiable.
- L’absence de règles d’évaluation empêche de finaliser le modèle de recommandations et l’historique.
- L’absence de budget et de choix IA empêche de dimensionner la génération, le cache et les limites d’usage.
- L’absence de validation juridique empêche une publication publique de recommandations liées à des événements sportifs.
- L’absence de validation de la stack et des environnements empêche de lancer l’implémentation technique.
