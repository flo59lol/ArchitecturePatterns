À l’attention des développeurs, mainteneurs et testeurs du module de réservation.

## Vue d’ensemble

Le module gère la réservation et l’annulation de créneaux de salle, avec une validation métier forte et une frontière claire entre la présentation, le domaine et le stockage.

```text
[Middleware HTTP / sécurité] --> [ReservationControleur] --> [ReservationService]
                                                      |        |         |
                                                      |        |         +--> [Port ReservationRepository]
                                                      |        |                     +--> [ReservationRepositoryMemoire]
                                                      |        +--> [Port Notificateur]
                                                      |                     +--> [NotificateurMailZen]
                                                      +--> [Port PolitiqueAnnulation]
                                                           +--> [PolitiqueDelaiFixe]
                                                           +--> [PolitiqueSouple]
```

Les dépendances vont dans le sens des besoins du domaine : la présentation dépend du service, et le service dépend d’interfaces qu’il reçoit en paramètre. La persistance et l’infrastructure ne peuvent pas dicter les règles du métier.

## Tableau des composants

| Fichier | Responsabilité |
| --- | --- |
| src/composition.ts | Assemble l’application et injecte manuellement les dépendances de repository, notification et politique d’annulation. |
|    |
| src/presentation/middlewares.ts | Vérifie l’authentification et les rôles avant d’atteindre le service. |
| src/presentation/reservation.controleur.ts | Traduit les requêtes HTTP en appels métier et renvoie les codes de réponse associés. |
|    |
| src/metier/reservation.service.ts | Applique les règles métier, les contrôles de disponibilité et le quota. |
| src/metier/reservation.ts | Représente une réservation validée et protège l’état de l’entité. |
| src/metier/creneau.ts | Définit la logique de chevauchement et les contraintes de création de créneaux. |
| src/metier/ports/reservation.repository.ts | Interface technique attendue par le service pour charger et enregistrer des réservations. |
| src/metier/ports/notificateur.ts | Port métier pour l’envoi des confirmations et des annulations. |
| src/metier/ports/politique-annulation.ts | Contrat de la stratégie d’annulation, avec plusieurs variantes interchangeables. |
|    |
| src/persistance/reservation.repository.memoire.ts | Implémentation mémoire du repository, avec garde-fou d’unicité au plus près du stockage. |
|    |
| src/infrastructure/notificateur.mailzen.ts | Adaptateur concret de notification par e-mail. |
|    |
| tests/tests.ts | Vérifie le comportement métier sans serveur ni base de données. |

## Décisions architecturales

### D1 — La règle RG-01 est vérifiée côté métier et en base
**Contexte.** Deux réservations d’une même salle ne doivent pas se chevaucher, mais une vérification unique en mémoire n’est pas suffisante face aux accès concurrentiels.  
**Décision.** Le domaine valide le conflit via le service et le repository protège aussi l’écriture avec une vérification supplémentaire au moment de l’enregistrement.  
**Conséquence.** Les règles restent cohérentes pour les tests et pour les appels réels, tandis que la persistance garde un garde-fou de sécurité contre les collisions d’écriture.

### D2 — L’injection de dépendances est écrite à la main
**Contexte.** Le code métier doit rester testable sans serveur, sans base de données et sans framework.  
**Décision.** Le service reçoit ses dépendances par le constructeur, et l’assemblage se fait dans un fichier racine dédié.  
**Conséquence.** Le domaine ne dépend ni du transport ni du stockage, et les tests peuvent remplacer les ports par des doubles de test sans modifier le comportement métier.

### D3 — La politique d’annulation est interchangeable
**Contexte.** Le délai autorisé pour annuler n’est pas une propriété fixe de toutes les situations ; il peut évoluer ou être adapté selon les contraintes opérationnelles.  
**Décision.** Le service dépend d’une interface de stratégie, et l’implémentation concrète est choisie au moment de l’assemblage.  
**Conséquence.** On peut changer de politique sans toucher au service, ce qui réduit le risque d’erreur et rend la règle plus explicite.

## Limites connues

- Le stockage est en mémoire uniquement ; le système n’a pas de persistance durable ni de concurrence réelle entre process.
- La notification est simulée par un adaptateur simple, sans vraie intégration avec un fournisseur de messagerie externe.
- Les règles de sécurité sont présentées comme un module de présentation ; elles ne couvrent pas l’ensemble des cas de production (session, autorisations externes, audit complet).
- Le projet est purement pédagogique, donc l’API de présentation est "minimaliste" et n’est pas un réeel service HTTP de production.
