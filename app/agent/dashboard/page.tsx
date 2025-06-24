'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgentLayout } from '@/components/layouts/agent-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, FileCheck, FileSearch, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface DashboardStats {
  birthDeclarations: { total: number; pending: number; approved: number; rejected: number; };
  birthCertificates: { total: number; pending: number; approved: number; rejected: number; };
  documents: { total: number; pending: number; approved: number; rejected: number; };
  requests: { total: number; pending: number; approved: number; rejected: number; };
}

const bgColorMap: Record<string, string> = {
  blue: "bg-blue-100",
  green: "bg-green-100",
  orange: "bg-orange-100"
};

const textColorMap: Record<string, string> = {
  blue: "text-blue-600",
  green: "text-green-600",
  orange: "text-orange-600"
};

export default function AgentDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    birthDeclarations: { total: 0, pending: 0, approved: 0, rejected: 0 },
    birthCertificates: { total: 0, pending: 0, approved: 0, rejected: 0 },
    documents: { total: 0, pending: 0, approved: 0, rejected: 0 },
    requests: { total: 0, pending: 0, approved: 0, rejected: 0 }
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/agent/dashboard/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        toast.error(data.message || 'Erreur lors de la récupération des statistiques');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la récupération des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: 'Déclarations de Naissance',
      icon: <FileText className="h-5 w-5" />,
      stats: stats.birthDeclarations,
      path: '/agent/birth-declarations',
      color: 'blue',
      showApprovalStats: true
    },
    {
      title: 'Actes de Naissance',
      icon: <FileCheck className="h-5 w-5" />,
      stats: stats.birthCertificates,
      path: '/agent/birth-certificates',
      color: 'green',
      showApprovalStats: true
    },
    {
      title: 'Demandes Générales',
      icon: <FileSearch className="h-5 w-5" />,
      stats: stats.requests,
      path: '/agent/requests',
      color: 'orange',
      showApprovalStats: true
    }
  ];

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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold">Tableau de Bord</h1>
              <p className="text-muted-foreground">Vue d'ensemble des demandes</p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En direct
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sections.map((section, index) => {
              const { total, pending, approved, rejected } = section.stats;
              const progressValue = total > 0 ? Math.round((pending / total) * 100) : 0;

              return (
                <Card key={index} className="h-full hover:shadow-lg transition-all duration-300">
                  <CardHeader className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`p-2.5 rounded-lg mr-3 ${bgColorMap[section.color]} ${textColorMap[section.color]}`}>
                        {section.icon}
                      </div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                    <Badge variant={pending > 0 ? "destructive" : "success"} className="text-sm">
                      {pending}
                    </Badge>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Total</p>
                          <p className={`text-2xl font-bold ${textColorMap[section.color]}`}>
                            {total}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">En attente</p>
                          <p className="text-2xl font-bold text-warning">
                            {pending}
                          </p>
                        </div>
                      </div>

                      {section.showApprovalStats && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Approuvées</p>
                            <p className="text-2xl font-bold text-success">
                              {approved}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Rejetées</p>
                            <p className="text-2xl font-bold text-destructive">
                              {rejected}
                            </p>
                          </div>
                        </div>
                      )}

                      {total > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-muted-foreground">Progression</p>
                            <p className="text-sm text-muted-foreground">{progressValue}%</p>
                          </div>
                          <Progress
                            value={progressValue}
                            className={`h-2 ${bgColorMap[section.color]}`}
                          />
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => router.push(section.path)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Voir les détails
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
