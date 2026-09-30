// Une ligne du journal des ventes Edilogic. Un montant négatif est un avoir.
export type Facture = {
  numero: string;
  clientCode: string;
  clientName: string;
  // Date ISO courte (YYYY-MM-DD).
  date: string;
  ht: number;
  tva: number;
  ttc: number;
};

export type ImportMeta = {
  id: string;
  filename: string;
  periodStart: string;
  periodEnd: string;
  nbFactures: number;
  totalHt: number;
  // Mois (YYYY-MM) dont les factures ont été écrasées par cet import.
  replacedMonths: string[];
  createdAt: string;
};

export type NewImport = {
  filename: string;
  factures: Facture[];
  replacedMonths: string[];
};
