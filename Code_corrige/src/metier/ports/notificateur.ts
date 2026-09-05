/**
 * PORT - le contrat de notification, defini par le METIER.
 * Le metier dit "je veux notifier une confirmation".
 * Il ignore s'il s'agit d'un e-mail, d'un SMS ou d'une ligne de log.
 */

import { Reservation } from "../reservation";

export interface Notificateur {
  confirmationCreee(reservation: Reservation, emailDestinataire: string): Promise<void>;
  annulationEnregistree(reservation: Reservation, emailDestinataire: string): Promise<void>;
}
