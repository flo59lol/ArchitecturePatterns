/**
 * Couche METIER - le service de reservation.
 *
 * C'est ICI que vivent les regles. Un seul endroit, donc aucune divergence possible.
 * Le service ne connait ni HTTP (pas de code 409) ni SQL (pas de requete) :
 * il ne depend que de ses PORTS, recus par le constructeur.
 */

import { Reservation } from "./reservation";
import { Creneau, creneauAutorise, seChevauchent } from "./creneau";
import { ReservationRepository } from "./ports/reservation.repository";
import { Notificateur } from "./ports/notificateur";
import { PolitiqueAnnulation } from "./ports/politique-annulation";

export type Echec =
  | "creneau_non_autorise"
  | "creneau_indisponible"
  | "quota_atteint"
  | "introuvable"
  | "trop_tard";

export type Resultat<T> = { ok: true; valeur: T } | { ok: false; echec: Echec };

export const QUOTA_RESERVATIONS_A_VENIR = 2;

export class ReservationService {
  constructor(
    private readonly repository: ReservationRepository,
    private readonly notificateur: Notificateur,
    private readonly politiqueAnnulation: PolitiqueAnnulation,
    private readonly maintenant: () => Date = () => new Date()
  ) {}

  async reserver(demande: {
    salleId: string;
    membreId: string;
    emailMembre: string;
    creneau: Creneau;
    soumisAuQuota: boolean;
  }): Promise<Resultat<Reservation>> {
    // RG-02
    if (!creneauAutorise(demande.creneau)) {
      return { ok: false, echec: "creneau_non_autorise" };
    }

    // RG-04
    if (demande.soumisAuQuota) {
      const aVenir = await this.repository.aVenirPourMembre(
        demande.membreId,
        this.maintenant()
      );
      if (aVenir.length >= QUOTA_RESERVATIONS_A_VENIR) {
        return { ok: false, echec: "quota_atteint" };
      }
    }

    // RG-01 : on ne charge que les reservations de la salle sur la periode,
    // jamais toute la table. Voir la note d'ecoconception du corrige.
    const voisines = await this.repository.confirmeesPourSalle(
      demande.salleId,
      demande.creneau
    );
    const conflit = voisines.some((r) => seChevauchent(r.creneau, demande.creneau));
    if (conflit) {
      return { ok: false, echec: "creneau_indisponible" };
    }

    const reservation = Reservation.creer({
      id: "R-" + Math.random().toString(36).slice(2, 8),
      salleId: demande.salleId,
      membreId: demande.membreId,
      creneau: demande.creneau,
    });

    // Le repository doit garantir l'unicite au moment de l'ecriture :
    // "verifier puis ecrire" n'est pas atomique. Voir la partie concurrence.
    await this.repository.enregistrer(reservation);
    await this.notificateur.confirmationCreee(reservation, demande.emailMembre);

    return { ok: true, valeur: reservation };
  }

  async annuler(demande: {
    reservationId: string;
    emailMembre: string;
  }): Promise<Resultat<Reservation>> {
    const reservation = await this.repository.parId(demande.reservationId);
    if (!reservation || !reservation.estConfirmee()) {
      return { ok: false, echec: "introuvable" };
    }

    // RG-03, deleguee a la strategie : le service ne connait plus le delai.
    if (!this.politiqueAnnulation.peutAnnuler(reservation, this.maintenant())) {
      return { ok: false, echec: "trop_tard" };
    }

    reservation.annuler();
    await this.repository.enregistrer(reservation);
    await this.notificateur.annulationEnregistree(reservation, demande.emailMembre);

    return { ok: true, valeur: reservation };
  }
}
