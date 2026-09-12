export type Creneau = { debut: Date; fin: Date };

/**
 * La comparaison est stricte : deux créneaux qui se chevauchent sont acceptés.
 * Cela évite de bloquer une journée entière simplement parce qu'une réservation
 * finit à 11:00 et la suivante commence à 11:00.
 */
export function seChevauchent(a: Creneau, b: Creneau): boolean {
  return a.debut < b.fin && b.debut < a.fin;
}

export const DUREE_TRANCHE_MIN = 30;
export const HEURE_OUVERTURE = 8;
export const HEURE_FERMETURE = 20;

function minutesDepuisMinuit(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * RG-02 : la réservation doit rester dans une tranche de 30 minutes,
 * entre 8h et 20h, les jours ouvrés uniquement.
 * Le piège habituel est de comparer des heures entières au lieu des minutes :
 * un créneau 20h00-20h30 passe en boucle si l’on teste seulement getHours().
 */
export function creneauAutorise(c: Creneau): boolean {
  if (c.fin <= c.debut) return false;
  if (c.debut.getMinutes() % DUREE_TRANCHE_MIN !== 0) return false;
  if (c.fin.getMinutes() % DUREE_TRANCHE_MIN !== 0) return false;
  if (minutesDepuisMinuit(c.debut) < HEURE_OUVERTURE * 60) return false;
  if (minutesDepuisMinuit(c.fin) > HEURE_FERMETURE * 60) return false;
  const jour = c.debut.getDay();
  if (jour === 0 || jour === 6) return false;
  return true;
}
