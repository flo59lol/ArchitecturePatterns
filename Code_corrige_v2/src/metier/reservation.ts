/**
 * Couche METIER - l'entite Reservation et sa fabrique.
 *
 * Le constructeur est prive : on ne peut pas fabriquer une reservation
 * dans un etat invalide. C'est le role de la FABRIQUE (pattern Factory).
 */

import { Creneau, creneauAutorise } from "./creneau";

export type Statut = "confirmee" | "annulee";

export class Reservation {
  private constructor(
    readonly id: string,
    readonly salleId: string,
    readonly membreId: string,
    readonly creneau: Creneau,
    public statut: Statut
  ) {}

  /** Seul point de creation possible. Toute reservation qui existe est valide. */
  static creer(donnees: {
    id: string;
    salleId: string;
    membreId: string;
    creneau: Creneau;
  }): Reservation {
    if (!donnees.salleId) throw new Error("salleId obligatoire");
    if (!donnees.membreId) throw new Error("membreId obligatoire");
    if (!creneauAutorise(donnees.creneau)) throw new Error("Creneau non autorise");
    return new Reservation(
      donnees.id,
      donnees.salleId,
      donnees.membreId,
      donnees.creneau,
      "confirmee"
    );
  }

  /** Reconstruction depuis la persistance : les donnees stockees sont deja validees. */
  static reconstituer(donnees: {
    id: string;
    salleId: string;
    membreId: string;
    creneau: Creneau;
    statut: Statut;
  }): Reservation {
    return new Reservation(
      donnees.id,
      donnees.salleId,
      donnees.membreId,
      donnees.creneau,
      donnees.statut
    );
  }

  annuler(): void {
    this.statut = "annulee";
  }

  estConfirmee(): boolean {
    return this.statut === "confirmee";
  }
}
