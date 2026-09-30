// Règles métier reprises du prototype.
export const REGLES = {
  // Premier mois de l'exercice comptable (novembre).
  moisDebutExercice: 11,
  // Part du CA au-delà de laquelle un client devient un risque.
  seuilDependance: 20,
  // Nombre de mois sans facture avant de considérer un client dormant.
  moisDormance: 3,
  // Un client dormant n'est signalé que s'il pesait au moins ce montant.
  dormantCaMin: 2000,
  // Variation du CA mensuel qui déclenche une alerte (±25 %).
  variationMois: 0.25,
  // Décrochage : client > 15 k€ le mois précédent qui tombe sous 30 %.
  decrochageCaMin: 15000,
  decrochageRatio: 0.3,
  // Total d'avoirs sur un mois qui déclenche une alerte.
  seuilAvoirs: -20000,
  // Un import écrase un mois s'il contient au moins cette part de ses factures, ou ce nombre de factures.
  // En dessous, ce sont des factures isolées (ex. datées du 31 du mois précédent) : elles sont ajoutées sans rien effacer.
  partMoisEcrase: 0.05,
  facturesMoisEcrase: 20,
};
