"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Payment {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  birthDeclaration?: {
    id: string;
    childFirstName: string;
    childLastName: string;
    citizen: {
      name: string;
      email: string;
    };
  };
  birthCertificate?: {
    id: string;
    fullName: string;
    citizen: {
      name: string;
      email: string;
    };
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, dateRange]);

  const fetchPayments = async () => {
    try {
      const response = await fetch(
        `/api/admin/payments?status=${statusFilter}&dateRange=${dateRange}`
      );
      if (!response.ok) throw new Error("Erreur lors de la récupération des paiements");
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/payments/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: statusFilter,
          dateRange: dateRange,
        }),
      });

      if (!response.ok) throw new Error("Erreur lors de l'export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `paiements-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: "warning",
      PAID: "success",
      FAILED: "destructive",
    } as const;

    const labels = {
      PENDING: "En attente",
      PAID: "Payé",
      FAILED: "Échoué",
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const filteredPayments = payments.filter((payment) => {
    const searchLower = searchQuery.toLowerCase();
    const citizenName = payment.birthDeclaration?.citizen.name || payment.birthCertificate?.citizen.name || "";
    const citizenEmail = payment.birthDeclaration?.citizen.email || payment.birthCertificate?.citizen.email || "";
    const documentName = payment.birthDeclaration 
      ? `${payment.birthDeclaration.childFirstName} ${payment.birthDeclaration.childLastName}`
      : payment.birthCertificate?.fullName || "";

    return (
      citizenName.toLowerCase().includes(searchLower) ||
      citizenEmail.toLowerCase().includes(searchLower) ||
      documentName.toLowerCase().includes(searchLower)
    );
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
          <h1 className="text-2xl font-bold">Paiements</h1>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des paiements</CardTitle>
            <CardDescription>
              Gérez et suivez les paiements des citoyens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email ou document..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="PAID">Payé</SelectItem>
                  <SelectItem value="FAILED">Échoué</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les périodes</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Citoyen</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payment.birthDeclaration?.citizen.name || payment.birthCertificate?.citizen.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payment.birthDeclaration?.citizen.email || payment.birthCertificate?.citizen.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.birthDeclaration 
                          ? `${payment.birthDeclaration.childFirstName} ${payment.birthDeclaration.childLastName}`
                          : payment.birthCertificate?.fullName}
                      </TableCell>
                      <TableCell>{payment.amount} €</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
} 