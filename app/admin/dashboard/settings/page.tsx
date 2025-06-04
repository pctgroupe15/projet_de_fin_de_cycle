"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const [generalSettings, setGeneralSettings] = useState({
    siteName: "Portail Administratif",
    siteDescription: "Portail administratif pour la gestion des documents",
    maintenanceMode: false,
    allowRegistrations: true,
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPassword: "",
    fromEmail: "",
    fromName: "",
  });

  const [paymentSettings, setPaymentSettings] = useState({
    stripePublicKey: "",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    currency: "EUR",
    enablePayments: true,
  });

  const handleGeneralSave = async () => {
    try {
      const response = await fetch("/api/admin/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generalSettings),
      });

      if (!response.ok) throw new Error("Erreur lors de la sauvegarde");

      toast({
        title: "Succès",
        description: "Paramètres généraux mis à jour avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les paramètres",
        variant: "destructive",
      });
    }
  };

  const handleEmailSave = async () => {
    try {
      const response = await fetch("/api/admin/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailSettings),
      });

      if (!response.ok) throw new Error("Erreur lors de la sauvegarde");

      toast({
        title: "Succès",
        description: "Paramètres email mis à jour avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les paramètres",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSave = async () => {
    try {
      const response = await fetch("/api/admin/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentSettings),
      });

      if (!response.ok) throw new Error("Erreur lors de la sauvegarde");

      toast({
        title: "Succès",
        description: "Paramètres de paiement mis à jour avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les paramètres",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="payment">Paiement</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres généraux</CardTitle>
                <CardDescription>
                  Configurez les paramètres généraux de votre application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Nom du site</Label>
                  <Input
                    id="siteName"
                    value={generalSettings.siteName}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        siteName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Description du site</Label>
                  <Input
                    id="siteDescription"
                    value={generalSettings.siteDescription}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        siteDescription: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="maintenanceMode"
                    checked={generalSettings.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setGeneralSettings({
                        ...generalSettings,
                        maintenanceMode: checked,
                      })
                    }
                  />
                  <Label htmlFor="maintenanceMode">Mode maintenance</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowRegistrations"
                    checked={generalSettings.allowRegistrations}
                    onCheckedChange={(checked) =>
                      setGeneralSettings({
                        ...generalSettings,
                        allowRegistrations: checked,
                      })
                    }
                  />
                  <Label htmlFor="allowRegistrations">
                    Autoriser les inscriptions
                  </Label>
                </div>
                <Button onClick={handleGeneralSave}>Enregistrer</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres email</CardTitle>
                <CardDescription>
                  Configurez les paramètres SMTP pour l'envoi d'emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Serveur SMTP</Label>
                  <Input
                    id="smtpHost"
                    value={emailSettings.smtpHost}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpHost: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Port SMTP</Label>
                  <Input
                    id="smtpPort"
                    value={emailSettings.smtpPort}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpPort: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">Utilisateur SMTP</Label>
                  <Input
                    id="smtpUser"
                    value={emailSettings.smtpUser}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpUser: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Mot de passe SMTP</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={emailSettings.smtpPassword}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">Email d'expédition</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        fromEmail: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">Nom d'expédition</Label>
                  <Input
                    id="fromName"
                    value={emailSettings.fromName}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        fromName: e.target.value,
                      })
                    }
                  />
                </div>
                <Button onClick={handleEmailSave}>Enregistrer</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de paiement</CardTitle>
                <CardDescription>
                  Configurez les paramètres de paiement Stripe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stripePublicKey">Clé publique Stripe</Label>
                  <Input
                    id="stripePublicKey"
                    value={paymentSettings.stripePublicKey}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        stripePublicKey: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripeSecretKey">Clé secrète Stripe</Label>
                  <Input
                    id="stripeSecretKey"
                    type="password"
                    value={paymentSettings.stripeSecretKey}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        stripeSecretKey: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripeWebhookSecret">
                    Clé secrète webhook Stripe
                  </Label>
                  <Input
                    id="stripeWebhookSecret"
                    type="password"
                    value={paymentSettings.stripeWebhookSecret}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        stripeWebhookSecret: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Input
                    id="currency"
                    value={paymentSettings.currency}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        currency: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enablePayments"
                    checked={paymentSettings.enablePayments}
                    onCheckedChange={(checked) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        enablePayments: checked,
                      })
                    }
                  />
                  <Label htmlFor="enablePayments">
                    Activer les paiements
                  </Label>
                </div>
                <Button onClick={handlePaymentSave}>Enregistrer</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
} 