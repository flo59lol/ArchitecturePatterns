/**
 * Couche METIER - le creneau et le chevauchement.
 * Aucun import : ni base, ni HTTP, ni framework. C'est le signe que la couche est saine.
 */

export type Creneau = { debut: Date; fin: Date };

/**
 * Deux creneaux se chevauchent si chacun commence avant que l'autre ne finisse.
 * Les inegalites sont STRICTES : 10h-11h et 11h-12h sont contigus, pas en conflit.
 */
export function seChevauchent(a: Creneau, b: Creneau): boolean {
  return a.debut < b.fin && b.debut < a.fin;
}

export const DUREE_TRANCHE_MIN = 30;
export const HEURE_OUVERTURE = 8;
export const HEURE_FERMETURE = 20;

/** Minutes ecoulees depuis minuit. Comparer des heures entieres ne suffit pas. */
function minutesDepuisMinuit(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * RG-02 : tranches de 30 min, 8h-20h, jours ouvres.
 *
 * Piege classique : ecrire "if (fin.getHours() > 20)" laisse passer un creneau
 * 20h00-20h30, car getHours() y vaut 20. On compare donc des minutes, pas des heures.
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
