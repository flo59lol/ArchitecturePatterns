# ArchitecturePatterns
TP 1/2

## Note de décisions architecturales

### 1. Emplacement de RG-01

RG-01 interdit deux réservations qui se chevauchent pour une même salle. Cette règle est placée dans la couche métier, dans `ReservationService`, car elle exprime une contrainte du domaine et non un détail de transport ou de stockage. Le service demande au repository les réservations confirmées de la salle et de la période concernées, puis applique `seChevauchent`. La fonction de comparaison reste dans le module métier afin d'avoir une définition unique et testable des bornes : les inégalités sont strictes, donc deux créneaux contigus sont autorisés.

Le repository ne décide pas si une demande est acceptable. Il optimise la recherche en filtrant les données par salle, statut et période, puis restitue les objets nécessaires au service. Cette séparation évite de recopier RG-01 dans chaque adaptateur (mémoire, SQL ou autre) et garantit que le comportement reste identique lorsque l'infrastructure change.

### 2. Répartition des permissions entre middleware et métier

Le middleware constitue la frontière d'accès. `authentification` vérifie qu'un utilisateur est présent et `exigerRole` contrôle que la route est accessible au rôle attendu. Ces contrôles sont adaptés à la présentation : ils peuvent produire directement les réponses HTTP `401` et `403`, et ils empêchent une requête non autorisée d'atteindre le service.

Le métier conserve toutefois les permissions qui dépendent de la demande et de l'objet manipulé. Par exemple, un membre ne peut réserver que pour lui-même, et seul le propriétaire peut annuler sa réservation. Ces règles ne doivent pas être confiées uniquement au middleware : elles doivent rester vraies si le service est appelé par une autre route, un traitement interne ou un test. De même, le service porte les règles fonctionnelles comme RG-01, le quota et les horaires. Le middleware filtre l'accès général ; le métier protège les invariants et les droits liés aux données.

### 3. Protection retenue contre la concurrence

Vérifier qu'un créneau est libre puis écrire la réservation ne suffit pas si deux demandes arrivent simultanément : elles peuvent toutes deux observer la même disponibilité avant que l'une d'elles n'écrive, puis créer un chevauchement. La protection retenue est donc une garantie d'unicité au moment de l'écriture, portée par le repository. L'implémentation mémoire recontrôle le conflit juste avant l'enregistrement et lève `CONFLIT_UNICITE` si une réservation confirmée chevauche déjà le créneau.

Ce contrôle est le dernier garde-fou : le service conserve la vérification de disponibilité pour fournir un refus fonctionnel rapide, mais il ne suppose pas que cette vérification est atomique. Dans une vraie base de données, la même décision doit être assurée par une contrainte d'exclusion ou une transaction sérialisable, afin que la vérification et l'écriture soient protégées par le stockage lui-même. La notification de confirmation n'est envoyée qu'après une écriture réussie.
