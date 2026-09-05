/** Implementation simple du port Notificateur : elle ecrit dans la console. */

import { Notificateur } from "../metier/ports/notificateur";
import { Reservation } from "../metier/reservation";

export class NotificateurConsole implements Notificateur {
  async confirmationCreee(r: Reservation, email: string): Promise<void> {
    console.log("[MAIL] a " + email + " : reservation " + r.id + " confirmee");
  }
  async annulationEnregistree(r: Reservation, email: string): Promise<void> {
    console.log("[MAIL] a " + email + " : reservation " + r.id + " annulee");
  }
}
