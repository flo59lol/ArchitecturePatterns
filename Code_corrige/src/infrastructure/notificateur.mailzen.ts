/**
 * ADAPTER - brancher un service externe sans contaminer le metier.
 *
 * MailZen est un prestataire fictif. Son API ne ressemble pas a notre port :
 * elle parle "to / subject / html" et rend un booleen. L'adaptateur traduit
 * notre vocabulaire vers le sien. Si demain on change de prestataire,
 * seul CE fichier bouge.
 */

import { Notificateur } from "../metier/ports/notificateur";
import { Reservation } from "../metier/reservation";

/** Bibliotheque tierce, imposee, que l'on ne modifie pas. */
export class MailZenClient {
  send(message: { to: string; subject: string; html: string }): boolean {
    console.log("[MailZen] -> " + message.to + " | " + message.subject);
    return true;
  }
}

export class NotificateurMailZen implements Notificateur {
  constructor(private readonly client: MailZenClient) {}

  async confirmationCreee(r: Reservation, email: string): Promise<void> {
    this.client.send({
      to: email,
      subject: "Votre reservation " + r.id + " est confirmee",
      html: "<p>Salle " + r.salleId + " le " + r.creneau.debut.toLocaleString("fr-FR") + "</p>",
    });
  }

  async annulationEnregistree(r: Reservation, email: string): Promise<void> {
    this.client.send({
      to: email,
      subject: "Votre reservation " + r.id + " est annulee",
      html: "<p>Le creneau a ete libere.</p>",
    });
  }
}
