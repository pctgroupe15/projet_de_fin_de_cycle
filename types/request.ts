import { ObjectId } from 'mongodb';

export enum RequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}

export enum RequestType {
  IDENTITY_CARD = 'IDENTITY_CARD',
  RESIDENCE_CERTIFICATE = 'RESIDENCE_CERTIFICATE',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  MARRIAGE_CERTIFICATE = 'MARRIAGE_CERTIFICATE',
  OTHER = 'OTHER'
}

export interface RequestData {
  _id?: ObjectId;
  userId: string;
  type: RequestType;
  status: RequestStatus;
  description: string;
  documents?: string[];
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  comments?: {
    userId: string;
    content: string;
    createdAt: Date;
  }[];
}

// Type spécifique pour les demandes d'acte de naissance
export interface BirthCertificateRequest {
  _id?: ObjectId;
  citizenId: ObjectId;
  fullName: string;
  birthDate: Date;
  birthPlace: string;
  fatherFullName?: string;
  motherFullName?: string;
  acteNumber?: string; // Numéro d'acte fourni par le citoyen
  status: RequestStatus;
  trackingNumber: string;
  comment?: string;
  communeId: ObjectId;
  agentId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}