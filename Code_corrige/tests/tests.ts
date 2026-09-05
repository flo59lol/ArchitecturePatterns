/**
 * Tests sans framework : node:assert suffit.
 *
 * Le point a retenir : ces tests tournent SANS base de donnees et SANS serveur.
 * C'est possible uniquement parce que le service recoit ses dependances
 * par le constructeur. Avant le decoupage, aucun de ces tests n'etait ecrivable.
 *
 * Lancer :  npx tsx tests/tests.ts
 */

import assert from "node:assert";
import { seChevauchent } from "../src/metier/creneau";
import { Reservation } from "../src/metier/reservation";
import { ReservationService } from "../src/metier/reservation.service";
import { ReservationRepositoryMemoire } from "../src/persistance/reservation.repository.memoire";
import { PolitiqueDelaiFixe, PolitiqueSouple } from "../src/metier/ports/politique-annulation";
import { Notificateur } from "../src/metier/ports/notificateur";
import { authentification } from "../src/presentation/middlewares";

let reussis = 0;
function test(nom: string, fn: () => void | Promise<void>) {
  Promise.resolve()
    .then(fn)
    .then(() => {
      reussis++;
      console.log("  ok   " + nom);
    })
    .catch((e) => {
      console.log("  ECHEC " + nom + " : " + e.message);
      process.exitCode = 1;
    });
}

/** Faux notificateur : il enregistre au lieu d'envoyer. */
class NotificateurEspion implements Notificateur {
  envois: string[] = [];
  async confirmationCreee(r: Reservation, email: string) {
    this.envois.push("confirmation:" + r.id + ":" + email);
  }
  async annulationEnregistree(r: Reservation, email: string) {
    this.envois.push("annulation:" + r.id + ":" + email);
  }
}

const c = (debut: string, fin: string) => ({ debut: new Date(debut), fin: new Date(fin) });

console.log("\nChevauchement de creneaux (RG-01)");

test("creneaux identiques : conflit", () => {
  assert.equal(seChevauchent(c("2026-09-14T10:00", "2026-09-14T11:00"), c("2026-09-14T10:00", "2026-09-14T11:00")), true);
});

test("chevauchement partiel : conflit", () => {
  assert.equal(seChevauchent(c("2026-09-14T10:00", "2026-09-14T11:00"), c("2026-09-14T10:30", "2026-09-14T11:30")), true);
});

test("creneau inclus dans un autre : conflit", () => {
  assert.equal(seChevauchent(c("2026-09-14T10:00", "2026-09-14T12:00"), c("2026-09-14T10:30", "2026-09-14T11:00")), true);
});

test("creneaux contigus : PAS de conflit", () => {
  assert.equal(seChevauchent(c("2026-09-14T10:00", "2026-09-14T11:00"), c("2026-09-14T11:00", "2026-09-14T12:00")), false);
});

test("creneaux disjoints : pas de conflit", () => {
  assert.equal(seChevauchent(c("2026-09-14T08:00", "2026-09-14T09:00"), c("2026-09-14T14:00", "2026-09-14T15:00")), false);
});

console.log("\nService de reservation (sans base, sans serveur)");

function servicePourTest(lignes: any[] = [], maintenant = new Date("2026-09-10T09:00")) {
  const repository = new ReservationRepositoryMemoire(lignes);
  const notificateur = new NotificateurEspion();
  const service = new ReservationService(repository, notificateur, new PolitiqueDelaiFixe(2), () => maintenant);
  return { service, repository, notificateur };
}

test("reservation acceptee sur un creneau libre", async () => {
  const { service, notificateur } = servicePourTest();
  const r = await service.reserver({
    salleId: "PAR-1", membreId: "M-0412", emailMembre: "karim@exemple.fr",
    demandeurId: "M-0412",
    creneau: c("2026-09-14T09:00", "2026-09-14T10:00"), soumisAuQuota: true,
  });
  assert.equal(r.ok, true);
  assert.equal(notificateur.envois.length, 1);
});

test("reservation refusee si le creneau chevauche (RG-01)", async () => {
  const { service } = servicePourTest([
    { id: "R-001", salleId: "LYO-2", membreId: "M-0977", debut: new Date("2026-09-14T10:00").toISOString(), fin: new Date("2026-09-14T11:00").toISOString(), statut: "confirmee" },
  ]);
  const r = await service.reserver({
    salleId: "LYO-2", membreId: "M-0412", emailMembre: "karim@exemple.fr",
    demandeurId: "M-0412",
    creneau: c("2026-09-14T10:30", "2026-09-14T11:30"), soumisAuQuota: true,
  });
  assert.equal(r.ok, false);
  assert.equal((r as any).echec, "creneau_indisponible");
});

test("le repository filtre la salle et la periode demandee", async () => {
  const repository = new ReservationRepositoryMemoire([
    { id: "R-001", salleId: "PAR-1", membreId: "M-0412", debut: new Date("2026-09-14T09:00").toISOString(), fin: new Date("2026-09-14T10:00").toISOString(), statut: "confirmee" },
    { id: "R-002", salleId: "LYO-2", membreId: "M-0977", debut: new Date("2026-09-14T09:30").toISOString(), fin: new Date("2026-09-14T10:30").toISOString(), statut: "confirmee" },
    { id: "R-003", salleId: "PAR-1", membreId: "M-0977", debut: new Date("2026-09-14T12:00").toISOString(), fin: new Date("2026-09-14T13:00").toISOString(), statut: "confirmee" },
  ]);
  const resultats = await repository.confirmeesPourSalle("PAR-1", c("2026-09-14T09:30", "2026-09-14T10:30"));
  assert.deepEqual(resultats.map((r) => r.id), ["R-001"]);
});

test("quota de 2 reservations a venir (RG-04)", async () => {
  const deja = [1, 2].map((i) => ({
    id: "R-00" + i, salleId: "PAR-1", membreId: "M-0412",
    debut: new Date("2026-09-1" + (i + 4) + "T09:00").toISOString(),
    fin: new Date("2026-09-1" + (i + 4) + "T10:00").toISOString(),
    statut: "confirmee" as const,
  }));
  const { service } = servicePourTest(deja);
  const r = await service.reserver({
    salleId: "BOR-1", membreId: "M-0412", emailMembre: "karim@exemple.fr",
    demandeurId: "M-0412",
    creneau: c("2026-09-17T09:00", "2026-09-17T10:00"), soumisAuQuota: true,
  });
  assert.equal(r.ok, false);
  assert.equal((r as any).echec, "quota_atteint");
});

test("l'accueil n'est pas soumis au quota", async () => {
  const deja = [1, 2].map((i) => ({
    id: "R-00" + i, salleId: "PAR-1", membreId: "M-0412",
    debut: new Date("2026-09-1" + (i + 4) + "T09:00").toISOString(),
    fin: new Date("2026-09-1" + (i + 4) + "T10:00").toISOString(),
    statut: "confirmee" as const,
  }));
  const { service } = servicePourTest(deja);
  const r = await service.reserver({
    salleId: "BOR-1", membreId: "M-0412", emailMembre: "karim@exemple.fr",
    demandeurId: "M-0412",
    creneau: c("2026-09-17T09:00", "2026-09-17T10:00"), soumisAuQuota: false,
  });
  assert.equal(r.ok, true);
});

test("dernier creneau 19h30-20h00 accepte (cas limite)", async () => {
  const { service } = servicePourTest();
  const r = await service.reserver({
    salleId: "PAR-1", membreId: "M-0412", emailMembre: "karim@exemple.fr",
    demandeurId: "M-0412",
    creneau: c("2026-09-14T19:30", "2026-09-14T20:00"), soumisAuQuota: true,
  });
  assert.equal(r.ok, true);
});

test("creneau 20h00-20h30 refuse (cas limite, RG-02)", async () => {
  const { service } = servicePourTest();
  const r = await service.reserver({
    salleId: "PAR-1", membreId: "M-0412", emailMembre: "karim@exemple.fr",
    demandeurId: "M-0412",
    creneau: c("2026-09-14T20:00", "2026-09-14T20:30"), soumisAuQuota: true,
  });
  assert.equal(r.ok, false);
  assert.equal((r as any).echec, "creneau_non_autorise");
});

console.log("\nPolitique d'annulation (Strategy)");

test("annulation refusee a moins de 2h avec la politique standard", async () => {
  const maintenant = new Date("2026-09-14T09:00");
  const { service } = servicePourTest([
    { id: "R-009", salleId: "PAR-1", membreId: "M-0412", debut: new Date("2026-09-14T10:00").toISOString(), fin: new Date("2026-09-14T11:00").toISOString(), statut: "confirmee" },
  ], maintenant);
  const r = await service.annuler({ reservationId: "R-009", demandeurId: "M-0412", emailMembre: "karim@exemple.fr" });
  assert.equal(r.ok, false);
  assert.equal((r as any).echec, "trop_tard");
});

test("la meme annulation passe avec la politique souple : rien d'autre ne change", async () => {
  const maintenant = new Date("2026-09-14T09:00");
  const repository = new ReservationRepositoryMemoire([
    { id: "R-009", salleId: "PAR-1", membreId: "M-0412", debut: new Date("2026-09-14T10:00").toISOString(), fin: new Date("2026-09-14T11:00").toISOString(), statut: "confirmee" },
  ]);
  const service = new ReservationService(repository, new NotificateurEspion(), new PolitiqueSouple(), () => maintenant);
  const r = await service.annuler({ reservationId: "R-009", demandeurId: "M-0412", emailMembre: "karim@exemple.fr" });
  assert.equal(r.ok, true);
});

test("annulation a exactement 2h : acceptee (cas limite)", async () => {
  const maintenant = new Date("2026-09-14T08:00");
  const { service } = servicePourTest([
    { id: "R-010", salleId: "PAR-1", membreId: "M-0412", debut: new Date("2026-09-14T10:00").toISOString(), fin: new Date("2026-09-14T11:00").toISOString(), statut: "confirmee" },
  ], maintenant);
  const r = await service.annuler({ reservationId: "R-010", demandeurId: "M-0412", emailMembre: "karim@exemple.fr" });
  assert.equal(r.ok, true);
});

test("seul le proprietaire peut annuler sa reservation", async () => {
  const maintenant = new Date("2026-09-14T08:00");
  const { service, repository } = servicePourTest([
    { id: "R-011", salleId: "PAR-1", membreId: "M-0412", debut: new Date("2026-09-14T10:00").toISOString(), fin: new Date("2026-09-14T11:00").toISOString(), statut: "confirmee" },
  ], maintenant);
  const r = await service.annuler({ reservationId: "R-011", demandeurId: "M-0977", emailMembre: "lina@exemple.fr" });
  assert.equal(r.ok, false);
  assert.equal((r as any).echec, "interdit");
  assert.equal((await repository.parId("R-011"))?.estConfirmee(), true);
});

setTimeout(() => console.log("\n" + reussis + " tests reussis.\n"), 200);

test("une requete non authentifiee n'atteint pas le service", async () => {
  let appels = 0;
  const traitement = authentification(async () => {
    appels++;
    return { code: 200, corps: {} };
  });
  const reponse = await traitement({ corps: {}, utilisateur: null });
  assert.equal(reponse.code, 401);
  assert.equal(appels, 0);
});
