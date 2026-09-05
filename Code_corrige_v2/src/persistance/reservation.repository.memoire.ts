/**
 * Couche PERSISTANCE - implementation du port defini par le metier.
 *
 * Cette classe connait la forme de stockage. Le metier, lui, ne la connait pas.
 * Remplacer ce fichier par une version PostgreSQL ne demande AUCUNE modification
 * du service : c'est exactement ce que le decoupage achete.
 */

import { ReservationRepository } from "../metier/ports/reservation.repository";
import { Reservation, Statut } from "../metier/reservation";
import { Creneau, seChevauchent } from "../metier/creneau";

type Ligne = {
  id: string;
  salleId: string;
  membreId: string;
  debut: string;
  fin: string;
  statut: Statut;
};

export class ReservationRepositoryMemoire implements ReservationRepository {
  constructor(private lignes: Ligne[] = []) {}

  private versMetier(l: Ligne): Reservation {
    return Reservation.reconstituer({
      id: l.id,
      salleId: l.salleId,
      membreId: l.membreId,
      creneau: { debut: new Date(l.debut), fin: new Date(l.fin) },
      statut: l.statut,
    });
  }

  async confirmeesPourSalle(salleId: string, periode: Creneau): Promise<Reservation[]> {
    // Equivalent d'un WHERE indexe : on filtre au plus pres du stockage,
    // on ne remonte pas toute la table pour trier ensuite en memoire.
    return this.lignes
      .filter((l) => l.salleId === salleId && l.statut === "confirmee")
      .map((l) => this.versMetier(l))
      .filter((r) => seChevauchent(r.creneau, periode));
  }

  async aVenirPourMembre(membreId: string, maintenant: Date): Promise<Reservation[]> {
    return this.lignes
      .filter(
        (l) =>
          l.membreId === membreId &&
          l.statut === "confirmee" &&
          new Date(l.debut) > maintenant
      )
      .map((l) => this.versMetier(l));
  }

  async parId(id: string): Promise<Reservation | null> {
    const l = this.lignes.find((x) => x.id === id);
    return l ? this.versMetier(l) : null;
  }

  async enregistrer(reservation: Reservation): Promise<void> {
    // Garde-fou d'unicite au plus pres du stockage. Dans une vraie base,
    // ce role est tenu par une contrainte ou une transaction serialisable.
    const conflit = this.lignes.some(
      (l) =>
        l.id !== reservation.id &&
        l.salleId === reservation.salleId &&
        l.statut === "confirmee" &&
        seChevauchent(
          { debut: new Date(l.debut), fin: new Date(l.fin) },
          reservation.creneau
        )
    );
    if (conflit && reservation.estConfirmee()) {
      throw new Error("CONFLIT_UNICITE");
    }

    const ligne: Ligne = {
      id: reservation.id,
      salleId: reservation.salleId,
      membreId: reservation.membreId,
      debut: reservation.creneau.debut.toISOString(),
      fin: reservation.creneau.fin.toISOString(),
      statut: reservation.statut,
    };
    const index = this.lignes.findIndex((l) => l.id === ligne.id);
    if (index >= 0) this.lignes[index] = ligne;
    else this.lignes.push(ligne);
  }
}
