# Résa

Résa aide les membres et l'accueil à réserver des salles et à gérer les annulations sans friction ni confusion.

## Pour qui

- Les membres qui souhaitent réserver une salle pour eux-mêmes.
- L'équipe d'accueil qui vérifie les demandes et les accès.
- Les développeurs et mainteneurs qui veulent comprendre le flux métier et les règles de réservation.

Pour aller plus loin, consultez la documentation d'architecture dans [docs/architecture.md](docs/architecture.md).

## Installation

Prérequis : Node.js 20.x ou 22.x, npm 10.x ou supérieur.

```bash
cd Code_corrige
npm install
npx tsx tests/tests.ts
```

Résultat attendu : la suite de tests s’exécute et affiche un bilan de réussite, avec un message du type “N tests réussis.”

Si ça échoue :
- si `tsx` ou `npm` est introuvable, vérifiez que Node.js est bien installé et démarré avec une version 20+ ;
- si l’installation bloque sur une version de Node trop ancienne, mettez à jour Node.js puis relancez `npm install`.

## Utilisation

Exemple minimal qui fonctionne :

```bash
cd Code_corrige
npx tsx src/composition.ts
```

Ce lancement exécute un petit scénario de démonstration : il crée une application de réservation, tente une réservation pour un membre, puis montre le comportement de sécurité et de refus sur une requête non authentifiée.

## Architecture

```text
Code_corrige/
  src/
    composition.ts
    metier/
    persistance/
    presentation/
    infrastructure/
  tests/
```

La vue complète du module est décrite dans [docs/architecture.md](docs/architecture.md).

## Contribuer

- /!\ Les changements de règle métier doivent rester dans la couche métier, pas dans la présentation ou la persistance.
- Les tests doivent être relancés avant toute fusion : `npx tsx tests/tests.ts`.
- Le code de la couche de présentation ne doit pas réécrire les validations métier déjà définies dans le service.
- Les nouvelles décisions importantes / les nouveaux choix d'architecture doivent être documentés dans [docs/architecture.md](docs/architecture.md).

## Licence / contact

Florian Robache : florian1.robache@gmail.com
Ilaria School : NdukaNZEKA@school.ilariaacademy.org
Code source à but pédagogique.
