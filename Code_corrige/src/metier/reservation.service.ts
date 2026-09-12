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
  | "interdit"
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
    demandeurId: string;
    emailMembre: string;
    creneau: Creneau;
    soumisAuQuota: boolean;
  }): Promise<Resultat<Reservation>> {
    if (demande.soumisAuQuota && demande.demandeurId !== demande.membreId) {
      return { ok: false, echec: "interdit" };
    }

    if (!creneauAutorise(demande.creneau)) {
      return { ok: false, echec: "creneau_non_autorise" };
    }

    if (demande.soumisAuQuota) {
      const aVenir = await this.repository.aVenirPourMembre(
        demande.membreId,
        this.maintenant()
      );
      if (aVenir.length >= QUOTA_RESERVATIONS_A_VENIR) {
        return { ok: false, echec: "quota_atteint" };
      }
    }

    // Le conflit est calculé à partir des réservations déjà confirmées de la salle,
    // sans charger l’intégralité de la base. La règle métier reste à un seul endroit.
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

    // La vérification de disponibilité n’est pas atomique par elle-même : la persistance
    // protège aussi l’écriture contre les dédoublements simultanés.
    await this.repository.enregistrer(reservation);
    await this.notificateur.confirmationCreee(reservation, demande.emailMembre);

    return { ok: true, valeur: reservation };
  }

  async annuler(demande: {
    reservationId: string;
    demandeurId: string;
    emailMembre: string;
  }): Promise<Resultat<Reservation>> {
    const reservation = await this.repository.parId(demande.reservationId);
    if (!reservation || !reservation.estConfirmee()) {
      return { ok: false, echec: "introuvable" };
    }
    if (reservation.membreId !== demande.demandeurId) {
      return { ok: false, echec: "interdit" };
    }

    // La règle de délai est dépendante de la stratégie choisie, pas de la logique métier.
    if (!this.politiqueAnnulation.peutAnnuler(reservation, this.maintenant())) {
      return { ok: false, echec: "trop_tard" };
    }

    reservation.annuler();
    await this.repository.enregistrer(reservation);
    await this.notificateur.annulationEnregistree(reservation, demande.emailMembre);

    return { ok: true, valeur: reservation };
  }
}
