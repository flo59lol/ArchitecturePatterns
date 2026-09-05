/**
 * Couche PRESENTATION - la securite en pipeline.
 *
 * Chaque middleware fait UNE chose et passe la main au suivant, ou coupe.
 * Une requete refusee n'atteint jamais la couche metier : c'est le principe
 * de la frontiere. Angular a ses guards, ASP.NET Core ses middlewares :
 * meme idee, meme ordre de passage.
 */

export type Requete = {
  corps: Record<string, unknown>;
  utilisateur: { id: string; role: "membre" | "accueil" } | null;
};
export type Reponse = { code: number; corps: unknown };
export type Traitement = (r: Requete) => Promise<Reponse>;
export type Middleware = (suivant: Traitement) => Traitement;

export const journalisation: Middleware = (suivant) => async (requete) => {
  const debut = Date.now();
  const reponse = await suivant(requete);
  console.log("[LOG] " + reponse.code + " en " + (Date.now() - debut) + "ms");
  return reponse;
};

export const authentification: Middleware = (suivant) => async (requete) => {
  if (!requete.utilisateur) {
    return { code: 401, corps: { message: "Authentification requise" } };
  }
  return suivant(requete);
};

export const exigerRole =
  (role: "membre" | "accueil"): Middleware =>
  (suivant) =>
  async (requete) => {
    if (requete.utilisateur?.role !== role) {
      return { code: 403, corps: { message: "Acces refuse" } };
    }
    return suivant(requete);
  };

/** Compose la chaine : le premier middleware de la liste est le plus externe. */
export function enchainer(middlewares: Middleware[], final: Traitement): Traitement {
  return middlewares.reduceRight((suivant, mw) => mw(suivant), final);
}
