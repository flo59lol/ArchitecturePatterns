# ArchitecturePatterns
TP 1/2

## Concurrence

Verifier qu'un creneau est libre puis ecrire la reservation ne suffit pas si deux demandes arrivent simultanement : elles peuvent toutes deux observer la meme disponibilite avant que l'une d'elles n'ecrive, puis creer un chevauchement. La protection retenue est une garantie d'unicite au moment de l'ecriture, portee par le repository : en memoire, il recontrole le conflit et leve `CONFLIT_UNICITE`; dans une vraie base, cette protection doit etre remplacee par une contrainte d'unicite adaptee ou une transaction serialisable.
