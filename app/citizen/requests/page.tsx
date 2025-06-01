"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { H2, Muted } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCachedFetch } from '@/hooks/use-cached-fetch';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Loading } from '@/components/ui/loading';

interface BirthDeclaration {
  id: string;
  childName: string;
  birthDate: string;
  status: string;
  trackingNumber: string;
  createdAt: string;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success";

const CitizenRequests = () => {
  const router = useRouter();
  const { data: requestsData, error, isLoading, refresh } = useCachedFetch<{ success: boolean; data: BirthDeclaration[]; message?: string }>(
    '/api/citizen/requests',
    {},
    { ttl: 2 * 60 * 1000 } // Cache de 2 minutes
  );

  const requests = requestsData?.data || [];

  useEffect(() => {
    if (error) {
      toast.error('Erreur lors de la récupération des demandes');
    }
  }, [error]);

  const getStatusVariant = useCallback((status: string): BadgeVariant => {
    const variants: Record<string, BadgeVariant> = {
      PENDING: 'secondary',
      IN_PROGRESS: 'default',
      COMPLETED: 'success',
      REJECTED: 'destructive'
    };
    return variants[status] || 'default';
  }, []);

  const getStatusText = useCallback((status: string) => {
    const texts = {
      PENDING: 'En attente',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Complété',
      REJECTED: 'Rejeté'
    };
    return texts[status as keyof typeof texts] || status;
  }, []);

  const handleViewDetails = useCallback((requestId: string) => {
    router.push(`/citizen/requests/${requestId}`);
  }, [router]);

  const tableContent = useMemo(() => {
    if (requests.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center">
            Aucune demande trouvée
          </TableCell>
        </TableRow>
      );
    }

    return requests.map((request) => (
      <TableRow key={request.id}>
        <TableCell>{request.trackingNumber}</TableCell>
        <TableCell>{request.childName}</TableCell>
        <TableCell>{new Date(request.birthDate).toLocaleDateString()}</TableCell>
        <TableCell>
          <Badge variant={getStatusVariant(request.status)}>
            {getStatusText(request.status)}
          </Badge>
        </TableCell>
        <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(request.id)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Voir détails
          </Button>
        </TableCell>
      </TableRow>
    ));
  }, [requests, getStatusVariant, getStatusText, handleViewDetails]);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <ErrorBoundary>
      <div className="p-6">
        <div className="mb-6">
          <H2>Mes demandes</H2>
          <Muted>Consultez l'état de vos demandes de documents</Muted>
        </div>
        <Card>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro de suivi</TableHead>
                  <TableHead>Nom de l'enfant</TableHead>
                  <TableHead>Date de naissance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date de demande</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableContent}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default CitizenRequests;