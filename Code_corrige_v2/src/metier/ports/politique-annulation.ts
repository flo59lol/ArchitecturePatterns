/**
 * STRATEGY - la politique d'annulation devient interchangeable.
 *
 * Avant : une cascade de "if (site === ...)" dans le service.
 * Apres : le service ne connait que ce contrat. Ajouter un site
 * ne demande plus de rouvrir le service.
 */

import { Reservation } from "../reservation";

export interface PolitiqueAnnulation {
  readonly nom: string;
  peutAnnuler(reservation: Reservation, maintenant: Date): boolean;
}

/** RG-03 par defaut : jusqu'a 2h avant le debut. */
export class PolitiqueDelaiFixe implements PolitiqueAnnulation {
  readonly nom: string;
  constructor(private readonly heuresAvant: number) {
    this.nom = "delai de " + heuresAvant + "h";
  }
  peutAnnuler(reservation: Reservation, maintenant: Date): boolean {
    const margeMs = this.heuresAvant * 60 * 60 * 1000;
    return reservation.creneau.debut.getTime() - maintenant.getTime() >= margeMs;
  }
}

/** Variante : annulation possible jusqu'au debut du creneau. */
export class PolitiqueSouple implements PolitiqueAnnulation {
  readonly nom = "jusqu'au debut";
  peutAnnuler(reservation: Reservation, maintenant: Date): boolean {
    return reservation.creneau.debut.getTime() > maintenant.getTime();
  }
}
