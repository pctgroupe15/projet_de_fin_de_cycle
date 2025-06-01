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

interface BirthDeclaration {
  id: string;
  childFirstName: string;
  childLastName: string;
  birthDate: Date;
  status: string;
  createdAt: string;
  citizen: {
    name: string;
    email: string;
  };
  documents: {
    type: string;
    url: string;
  }[];
}

export default function BirthDeclarationsPage() {
  const [declarations, setDeclarations] = useState<BirthDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDeclarations();
    
    // Rafraîchir les données toutes les 30 secondes
    const interval = setInterval(() => {
      fetchDeclarations();
    }, 30000);

    // Nettoyer l'intervalle lors du démontage du composant
    return () => clearInterval(interval);
  }, []);

  const fetchDeclarations = async () => {
    try {
      const response = await fetch('/api/agent/birth-declarations');
      const data = await response.json();
      
      if (data.success) {
        setDeclarations(data.data);
      } else {
        toast.error('Erreur lors de la récupération des déclarations');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la récupération des déclarations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "success" => {
    switch (status) {
      case 'en_attente':
        return "secondary";
      case 'approuvé':
        return "success";
      case 'rejeté':
        return "destructive";
      default:
        return "default";
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
            <CardTitle>Déclarations de Naissance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de l'enfant</TableHead>
                    <TableHead>Date de naissance</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de demande</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.map((declaration) => (
                    <TableRow key={declaration.id}>
                      <TableCell>
                        {`${declaration.childFirstName} ${declaration.childLastName}`}
                      </TableCell>
                      <TableCell>
                        {new Date(declaration.birthDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {`${declaration.citizen.name} (${declaration.citizen.email})`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(declaration.status)}>
                          {declaration.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(declaration.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/agent/birth-declarations/${declaration.id}`)}
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