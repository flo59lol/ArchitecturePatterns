/**
 * Resa - Atelier Lumiere
 * VERSION DE DEPART : tout le code tient dans un seul fichier.
 *
 * Ce code FONCTIONNE. Le TP ne consiste pas a le reparer,
 * mais a le ranger : chaque chose a sa place, et une seule.
 *
 * Aucun framework, aucune dependance a installer.
 * Pour l'executer : npx tsx reservation.ts  (ou node apres compilation)
 */

// ---------------------------------------------------------------------------
// Fausse base de donnees en memoire. Elle imite un vrai SGBD.
// ---------------------------------------------------------------------------

type LigneReservation = {
  id: string;
  salleId: string;
  membreId: string;
  debut: string; // format ISO, ex. "2026-09-14T10:00"
  fin: string;
  statut: "confirmee" | "annulee";
};

const BASE = {
  salles: [
    { id: "PAR-1", site: "paris" },
    { id: "LYO-2", site: "lyon" },
    { id: "BOR-1", site: "bordeaux" },
  ],
  membres: [
    { id: "M-0412", nom: "Karim", email: "karim@exemple.fr" },
    { id: "M-0977", nom: "Lina", email: "lina@exemple.fr" },
  ],
  reservations: [
    {
      id: "R-001",
      salleId: "LYO-2",
      membreId: "M-0977",
      debut: "2026-09-14T10:00",
      fin: "2026-09-14T11:00",
      statut: "confirmee",
    },
  ] as LigneReservation[],
};

// ---------------------------------------------------------------------------
// Faux objet requete HTTP. Il imite ce qu'un serveur web vous donnerait.
// ---------------------------------------------------------------------------

type Requete = {
  corps: { salleId?: string; membreId?: string; debut?: string; fin?: string };
  utilisateur: { id: string; role: "membre" | "accueil" } | null;
};

type Reponse = { code: number; corps: unknown };

// ---------------------------------------------------------------------------
// Point d'entree 1 : un membre reserve une salle. POST /reservations
// ---------------------------------------------------------------------------

export function creerReservation(requete: Requete): Reponse {
  if (!requete.utilisateur) {
    return { code: 401, corps: { message: "Authentification requise" } };
  }

  const { salleId, membreId, debut, fin } = requete.corps;
  if (!salleId || !membreId || !debut || !fin) {
    return { code: 422, corps: { message: "Champs manquants" } };
  }

  // RG-05 : un membre ne reserve que pour lui-meme
  if (requete.utilisateur.role === "membre" && requete.utilisateur.id !== membreId) {
    return { code: 403, corps: { message: "Reservation pour un tiers interdite" } };
  }

  const d = new Date(debut);
  const f = new Date(fin);

  // RG-02 : tranches de 30 minutes, 8h-20h, jours ouvres
  if (d.getMinutes() % 30 !== 0 || f.getMinutes() % 30 !== 0) {
    return { code: 422, corps: { message: "Creneaux de 30 minutes uniquement" } };
  }
  if (d.getHours() < 8 || f.getHours() > 20) {
    return { code: 422, corps: { message: "Horaires 8h-20h" } };
  }
  if (d.getDay() === 0 || d.getDay() === 6) {
    return { code: 422, corps: { message: "Jours ouvres uniquement" } };
  }

  // RG-04 : deux reservations a venir maximum pour un membre
  const aVenir = BASE.reservations.filter(
    (r) =>
      r.membreId === membreId &&
      r.statut === "confirmee" &&
      new Date(r.debut) > new Date()
  );
  if (requete.utilisateur.role === "membre" && aVenir.length >= 2) {
    return { code: 422, corps: { message: "Quota de 2 reservations atteint" } };
  }

  // RG-01 : pas deux reservations confirmees sur le meme creneau
  for (const r of BASE.reservations) {
    if (r.salleId !== salleId) continue;
    if (r.statut !== "confirmee") continue;
    if (new Date(r.debut) < f && d < new Date(r.fin)) {
      return { code: 409, corps: { message: "Creneau indisponible" } };
    }
  }

  const ligne: LigneReservation = {
    id: "R-" + Math.random().toString(36).slice(2, 8),
    salleId,
    membreId,
    debut,
    fin,
    statut: "confirmee",
  };
  BASE.reservations.push(ligne);

  // RG-06 : e-mail de confirmation
  const membre = BASE.membres.find((m) => m.id === membreId);
  console.log("[MAIL] a " + membre?.email + " : reservation " + ligne.id + " confirmee");

  return { code: 201, corps: ligne };
}

// ---------------------------------------------------------------------------
// Point d'entree 2 : l'accueil reserve pour un tiers.
//
// ATTENTION : les regles ont ete recopiees depuis la fonction ci-dessus.
// Une des trois a divergé. Saurez-vous dire laquelle, et ce que cela produit ?
// ---------------------------------------------------------------------------

export function creerReservationParAccueil(requete: Requete): Reponse {
  if (!requete.utilisateur || requete.utilisateur.role !== "accueil") {
    return { code: 403, corps: { message: "Reserve au personnel d'accueil" } };
  }

  const { salleId, membreId, debut, fin } = requete.corps;
  if (!salleId || !membreId || !debut || !fin) {
    return { code: 422, corps: { message: "Champs manquants" } };
  }

  const d = new Date(debut);
  const f = new Date(fin);

  // RG-02 recopiee... mais le controle des jours ouvres a disparu.
  if (d.getMinutes() % 30 !== 0 || f.getMinutes() % 30 !== 0) {
    return { code: 422, corps: { message: "Creneaux de 30 minutes uniquement" } };
  }
  if (d.getHours() < 8 || f.getHours() > 20) {
    return { code: 422, corps: { message: "Horaires 8h-20h" } };
  }

  // RG-01 recopiee a l'identique
  for (const r of BASE.reservations) {
    if (r.salleId !== salleId) continue;
    if (r.statut !== "confirmee") continue;
    if (new Date(r.debut) < f && d < new Date(r.fin)) {
      return { code: 409, corps: { message: "Creneau indisponible" } };
    }
  }

  const ligne: LigneReservation = {
    id: "R-" + Math.random().toString(36).slice(2, 8),
    salleId,
    membreId,
    debut,
    fin,
    statut: "confirmee",
  };
  BASE.reservations.push(ligne);

  const membre = BASE.membres.find((m) => m.id === membreId);
  console.log("[MAIL] a " + membre?.email + " : reservation " + ligne.id + " confirmee");

  return { code: 201, corps: ligne };
}

// ---------------------------------------------------------------------------
// Point d'entree 3 : annulation. DELETE /reservations/:id
// ---------------------------------------------------------------------------

export function annulerReservation(requete: Requete, id: string): Reponse {
  if (!requete.utilisateur) {
    return { code: 401, corps: { message: "Authentification requise" } };
  }

  const ligne = BASE.reservations.find((r) => r.id === id);
  if (!ligne) {
    return { code: 404, corps: { message: "Reservation introuvable" } };
  }
  if (requete.utilisateur.role === "membre" && ligne.membreId !== requete.utilisateur.id) {
    return { code: 403, corps: { message: "Annulation d'un tiers interdite" } };
  }

  // RG-03 : annulation possible jusqu'a 2h avant le debut
  const deuxHeuresEnMs = 2 * 60 * 60 * 1000;
  if (new Date(ligne.debut).getTime() - Date.now() < deuxHeuresEnMs) {
    return { code: 422, corps: { message: "Trop tard pour annuler" } };
  }

  ligne.statut = "annulee";
  const membre = BASE.membres.find((m) => m.id === ligne.membreId);
  console.log("[MAIL] a " + membre?.email + " : reservation " + ligne.id + " annulee");

  return { code: 200, corps: ligne };
}

// ---------------------------------------------------------------------------
// Petit scenario de demonstration, pour verifier que tout tourne.
// ---------------------------------------------------------------------------

if (require.main === module) {
  const karim = { id: "M-0412", role: "membre" as const };

  console.log(
    creerReservation({
      utilisateur: karim,
      corps: { salleId: "PAR-1", membreId: "M-0412", debut: "2026-09-14T09:00", fin: "2026-09-14T10:00" },
    })
  );

  // Chevauche la reservation existante R-001 : doit renvoyer 409
  console.log(
    creerReservation({
      utilisateur: karim,
      corps: { salleId: "LYO-2", membreId: "M-0412", debut: "2026-09-14T10:30", fin: "2026-09-14T11:30" },
    })
  );
}
