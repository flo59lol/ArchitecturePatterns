/**
 * RACINE DE COMPOSITION - l'injection de dependances a la main.
 *
 * C'est le SEUL endroit du programme ou l'on ecrit "new". Partout ailleurs,
 * les dependances arrivent par le constructeur. Une dizaine de lignes ici
 * remplacent tout un conteneur : quand Angular ou ASP.NET Core injectent
 * pour vous, ils font exactement ce travail, en automatique.
 *
 * Changer de base, de prestataire d'e-mail ou de politique d'annulation
 * se fait dans ce fichier, sans toucher au metier.
 */

import { ReservationService } from "./metier/reservation.service";
import { PolitiqueDelaiFixe } from "./metier/ports/politique-annulation";
import { ReservationRepositoryMemoire } from "./persistance/reservation.repository.memoire";
import { NotificateurConsole } from "./infrastructure/notificateur.console";
import { ReservationControleur } from "./presentation/reservation.controleur";
import { authentification, enchainer, journalisation } from "./presentation/middlewares";

const MEMBRES: Record<string, string> = {
  "M-0412": "karim@exemple.fr",
  "M-0977": "lina@exemple.fr",
};

export function construireApplication() {
  const repository = new ReservationRepositoryMemoire([
    {
      id: "R-001",
      salleId: "LYO-2",
      membreId: "M-0977",
      debut: new Date("2026-09-14T10:00").toISOString(),
      fin: new Date("2026-09-14T11:00").toISOString(),
      statut: "confirmee",
    },
  ]);
  const notificateur = new NotificateurConsole();
  const politique = new PolitiqueDelaiFixe(2); // RG-03

  const service = new ReservationService(repository, notificateur, politique);
  const controleur = new ReservationControleur(service, (id) => MEMBRES[id] ?? "inconnu@exemple.fr");

  const routeReserver = enchainer([journalisation, authentification], controleur.reserver);

  return { service, controleur, routeReserver, repository };
}

if (require.main === module) {
  (async () => {
    const app = construireApplication();
    const karim = { id: "M-0412", role: "membre" as const };

    console.log(
      await app.routeReserver({
        utilisateur: karim,
        corps: { salleId: "PAR-1", membreId: "M-0412", debut: "2026-09-14T09:00", fin: "2026-09-14T10:00" },
      })
    );

    console.log(
      await app.routeReserver({
        utilisateur: karim,
        corps: { salleId: "LYO-2", membreId: "M-0412", debut: "2026-09-14T10:30", fin: "2026-09-14T11:30" },
      })
    );

    console.log(await app.routeReserver({ utilisateur: null, corps: {} }));
  })();
}
