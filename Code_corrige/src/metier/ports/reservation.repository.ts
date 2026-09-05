/**
 * PORT - le contrat de persistance, defini par le METIER.
 *
 * Point cle de l'inversion de dependance : c'est la couche metier qui dit
 * ce dont elle a besoin. La couche persistance s'y conforme. Jamais l'inverse.
 * Aucun mot de SQL, de table ou de connexion ici.
 */

import { Reservation } from "../reservation";
import { Creneau } from "../creneau";

export interface ReservationRepository {
  /** Reservations confirmees d'une salle qui touchent la periode demandee. */
  confirmeesPourSalle(salleId: string, periode: Creneau): Promise<Reservation[]>;

  /** Reservations confirmees a venir d'un membre (pour la RG-04). */
  aVenirPourMembre(membreId: string, maintenant: Date): Promise<Reservation[]>;

  parId(id: string): Promise<Reservation | null>;

  enregistrer(reservation: Reservation): Promise<void>;
}
