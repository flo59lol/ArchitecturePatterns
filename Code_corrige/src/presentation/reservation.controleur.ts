/**
 * Couche PRESENTATION - traduction HTTP.
 *
 * Le controleur ne contient AUCUNE regle metier. Il fait trois choses :
 * valider la forme des donnees entrantes (la frontiere), appeler le service,
 * traduire le resultat metier en code HTTP.
 */

import { ReservationService, Echec } from "../metier/reservation.service";
import { Requete, Reponse } from "./middlewares";

const CODES: Record<Echec, number> = {
  creneau_non_autorise: 422,
  creneau_indisponible: 409,
  quota_atteint: 422,
  introuvable: 404,
  trop_tard: 422,
};

const MESSAGES: Record<Echec, string> = {
  creneau_non_autorise: "Creneau non autorise",
  creneau_indisponible: "Creneau indisponible",
  quota_atteint: "Quota de 2 reservations atteint",
  introuvable: "Reservation introuvable",
  trop_tard: "Trop tard pour annuler",
};

export class ReservationControleur {
  constructor(
    private readonly service: ReservationService,
    private readonly emailDuMembre: (id: string) => string
  ) {}

  reserver = async (requete: Requete): Promise<Reponse> => {
    // VALIDATION A LA FRONTIERE : forme, presence, type. Rien de metier ici.
    const { salleId, membreId, debut, fin } = requete.corps as Record<string, string>;
    if (!salleId || !membreId || !debut || !fin) {
      return { code: 422, corps: { message: "Champs manquants" } };
    }
    const creneau = { debut: new Date(debut), fin: new Date(fin) };
    if (isNaN(creneau.debut.getTime()) || isNaN(creneau.fin.getTime())) {
      return { code: 422, corps: { message: "Dates invalides" } };
    }

    // RG-05 : un membre ne reserve que pour lui-meme.
    const utilisateur = requete.utilisateur!;
    if (utilisateur.role === "membre" && utilisateur.id !== membreId) {
      return { code: 403, corps: { message: "Reservation pour un tiers interdite" } };
    }

    const resultat = await this.service.reserver({
      salleId,
      membreId,
      emailMembre: this.emailDuMembre(membreId),
      creneau,
      soumisAuQuota: utilisateur.role === "membre",
    });

    if (!resultat.ok) {
      return { code: CODES[resultat.echec], corps: { message: MESSAGES[resultat.echec] } };
    }
    return { code: 201, corps: resultat.valeur };
  };

  annuler = (reservationId: string) => async (requete: Requete): Promise<Reponse> => {
    const resultat = await this.service.annuler({
      reservationId,
      emailMembre: this.emailDuMembre(requete.utilisateur!.id),
    });
    if (!resultat.ok) {
      return { code: CODES[resultat.echec], corps: { message: MESSAGES[resultat.echec] } };
    }
    return { code: 200, corps: resultat.valeur };
  };
}
