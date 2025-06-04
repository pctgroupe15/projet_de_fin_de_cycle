"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Search, Eye, Check, X } from "lucide-react";

interface Request {
  id: string;
  documentType: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  citizen: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  documents: {
    id: string;
    name: string;
    url: string;
  }[];
  comments?: string;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [comment, setComment] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter]);

  const fetchRequests = async () => {
    try {
      const response = await fetch(
        `/api/admin/requests?status=${statusFilter}&type=${typeFilter}`
      );
      if (!response.ok) throw new Error("Erreur lors de la récupération des demandes");
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: Request["status"]) => {
    try {
      const response = await fetch(`/api/admin/requests/${requestId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          comment,
        }),
      });

      if (!response.ok) throw new Error("Erreur lors de la mise à jour du statut");

      toast({
        title: "Succès",
        description: "Statut mis à jour avec succès",
      });

      setIsDialogOpen(false);
      fetchRequests();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const handleView = (request: Request) => {
    setSelectedRequest(request);
    setComment(request.comments || "");
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">En attente</Badge>;
      case "APPROVED":
        return <Badge variant="success">Approuvé</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejeté</Badge>;
      case "COMPLETED":
        return <Badge variant="default">Complété</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = 
      request.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.citizen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.citizen.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestion des Demandes</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une demande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="APPROVED">Approuvé</SelectItem>
              <SelectItem value="REJECTED">Rejeté</SelectItem>
              <SelectItem value="COMPLETED">Complété</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type de document" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="CNI">Carte Nationale d'Identité</SelectItem>
              <SelectItem value="PASSPORT">Passeport</SelectItem>
              <SelectItem value="BIRTH_CERTIFICATE">Acte de naissance</SelectItem>
              <SelectItem value="MARRIAGE_CERTIFICATE">Acte de mariage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type de document</TableHead>
              <TableHead>Citoyen</TableHead>
              <TableHead>Date de demande</TableHead>
              <TableHead>Dernière mise à jour</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.documentType}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{request.citizen.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.citizen.email}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(request.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {new Date(request.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleView(request)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails de la demande</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Informations du citoyen</h3>
                  <p>Nom: {selectedRequest.citizen.name}</p>
                  <p>Email: {selectedRequest.citizen.email}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Documents fournis</h3>
                  <div className="space-y-2">
                    {selectedRequest.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between">
                        <span>{doc.name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.url, "_blank")}
                        >
                          Voir
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Commentaire</h3>
                  <Input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ajouter un commentaire..."
                  />
                </div>
                {selectedRequest.status === "PENDING" && (
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange(selectedRequest.id, "REJECTED")}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Rejeter
                    </Button>
                    <Button
                      onClick={() => handleStatusChange(selectedRequest.id, "APPROVED")}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approuver
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
} 