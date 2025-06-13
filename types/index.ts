// Types de base pour les relations communes
export type CitizenWithBasicInfo = {
  name: string | null
  email: string
}

export enum RequestStatus {
  PENDING = 'en_attente',
  COMPLETED = 'approuvé',
  REJECTED = 'rejeté'
}

interface Payment {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

interface BirthDeclaration {
  id: string;
  childFirstName: string;
  childLastName: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  citizenId: string;
}

interface BirthCertificate {
  id: string;
  fullName: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  citizenId: string;
}

interface Citizen {
  id: string;
  name: string | null;
  email: string;
}

// Types pour les documents avec les relations sélectionnées
export type BirthDeclarationWithSelectedFields = {
  childFirstName: string
  childLastName: string
  citizen: CitizenWithBasicInfo
}

export type BirthCertificateWithSelectedFields = {
  fullName: string
  citizen: CitizenWithBasicInfo
}

// Types pour les paiements
export type PaymentWithSelectedFields = {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
  birthDeclaration?: {
    id: string;
    childFirstName: string;
    childLastName: string;
    citizen: CitizenWithBasicInfo;
  };
  birthCertificate?: {
    id: string;
    fullName: string;
    citizen: CitizenWithBasicInfo;
  };
};

// Types pour les réponses API
export type PaymentResponse = {
  id: string
  amount: number
  status: string
  createdAt: Date
  type: 'BirthDeclaration' | 'BirthCertificate'
  documentName: string
  citizenName: string
  citizenEmail: string
}

export type DocumentResponse = {
  id: string
  type: 'BirthDeclaration' | 'BirthCertificate'
  status: RequestStatus
  createdAt: Date
  updatedAt: Date
  citizenId: string
  citizenName: string
  documentName: string
}

// Types pour les exports
export type PaymentExport = {
  ID: string
  "Nom du citoyen": string
  "Email du citoyen": string
  "Type de document": string
  "Nom du document": string
  Montant: string
  Statut: string
  "Date de création": string
}

// Types pour les documents
export type Document = {
  id: string;
  type: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
};

// Fonctions utilitaires pour la transformation des données
export const transformPaymentToResponse = (payment: PaymentWithSelectedFields): PaymentResponse => ({
  id: payment.id,
  amount: payment.amount,
  status: payment.status,
  createdAt: payment.createdAt,
  type: payment.birthDeclaration ? 'BirthDeclaration' : 'BirthCertificate',
  documentName: payment.birthDeclaration 
    ? `${payment.birthDeclaration.childFirstName} ${payment.birthDeclaration.childLastName}`
    : payment.birthCertificate?.fullName || 'N/A',
  citizenName: payment.birthDeclaration?.citizen.name || payment.birthCertificate?.citizen.name || 'N/A',
  citizenEmail: payment.birthDeclaration?.citizen.email || payment.birthCertificate?.citizen.email || 'N/A'
})

export const transformPaymentToExport = (payment: PaymentWithSelectedFields): PaymentExport => ({
  ID: payment.id,
  "Nom du citoyen": payment.birthDeclaration?.citizen.name || payment.birthCertificate?.citizen.name || 'N/A',
  "Email du citoyen": payment.birthDeclaration?.citizen.email || payment.birthCertificate?.citizen.email || 'N/A',
  "Type de document": payment.birthDeclaration ? "Déclaration de naissance" : "Acte de naissance",
  "Nom du document": payment.birthDeclaration
    ? `${payment.birthDeclaration.childFirstName} ${payment.birthDeclaration.childLastName}`
    : payment.birthCertificate?.fullName || 'N/A',
  Montant: `${payment.amount} €`,
  Statut: payment.status === "PAID" ? "Payé" : payment.status === "PENDING" ? "En attente" : "Échoué",
  "Date de création": new Date(payment.createdAt).toLocaleString()
})

export const transformDocumentToResponse = (doc: BirthDeclarationWithSelectedFields | BirthCertificateWithSelectedFields): Omit<DocumentResponse, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'citizenId'> => ({
  type: 'childFirstName' in doc ? 'BirthDeclaration' : 'BirthCertificate',
  citizenName: doc.citizen.name || 'N/A',
  documentName: 'childFirstName' in doc 
    ? `${doc.childFirstName} ${doc.childLastName}`
    : doc.fullName
}) 