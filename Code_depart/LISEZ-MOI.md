# Code de depart - Resa

Un seul fichier : `reservation.ts`. Il fonctionne. Ne cherchez pas de bug a corriger.

## Executer

Aucune dependance a installer si vous avez Node 18 ou plus :

```
npx tsx reservation.ts
```

Sans `tsx`, vous pouvez aussi compiler :

```
npx tsc reservation.ts --target es2020 --module commonjs && node reservation.js
```

## Ce qui est deja la

Trois points d'entree qui imitent trois routes HTTP :

- `creerReservation` : un membre reserve une salle.
- `creerReservationParAccueil` : le personnel d'accueil reserve pour un tiers.
- `annulerReservation` : annulation d'une reservation.

Les regles metier du module precedent sont toutes presentes : RG-01 (pas de
chevauchement), RG-02 (tranches de 30 min, 8h-20h, jours ouvres), RG-03
(annulation jusqu'a 2h avant), RG-04 (deux reservations a venir maximum),
RG-05 (un membre ne reserve que pour lui-meme), RG-06 (e-mail de confirmation).

## Une question a se poser avant de commencer

Les regles ont ete recopiees d'un point d'entree a l'autre. L'une des trois
regles recopiees a diverge en chemin. Trouvez laquelle, et demandez-vous ce
qu'elle autorise aujourd'hui qui ne devrait pas l'etre.

Cette question est le sujet du module.
