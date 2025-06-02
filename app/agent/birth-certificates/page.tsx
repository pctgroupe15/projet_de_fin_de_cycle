"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgentLayout } from '@/components/layouts/agent-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface BirthCertificate {
  id: string;
  fullName: string;
  birthDate: Date;
  birthPlace: string;
  acteNumber: string;
  status: string;
  trackingNumber: string;
  createdAt: string;
  citizen: {
    name: string;
    email: string;
  };
  files: {
    type: string;
    url: string;
  }[];
  payment: {
    status: string;
    amount: number;
  } | null;
}

export default function BirthCertificatesPage() {
  const [certificates, setCertificates] = useState<BirthCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await fetch('/api/agent/birth-certificates');
      const data = await response.json();
      if (data.success) {
        setCertificates(data.data);
      } else {
        toast.error(data.message || 'Erreur lors du chargement des actes');
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Erreur lors du chargement des actes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'secondary';
      case 'REJECTED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <AgentLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Actes de Naissance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom complet</TableHead>
                    <TableHead>Date de naissance</TableHead>
                    <TableHead>Numéro d'acte</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((certificate) => (
                    <TableRow key={certificate.id}>
                      <TableCell>{certificate.fullName}</TableCell>
                      <TableCell>
                        {new Date(certificate.birthDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{certificate.acteNumber}</TableCell>
                      <TableCell>
                        {`${certificate.citizen.name} (${certificate.citizen.email})`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(certificate.status)}>
                          {certificate.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(certificate.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/agent/documents/${certificate.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AgentLayout>
  );
} 