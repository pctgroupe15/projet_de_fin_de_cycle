"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        if (!sessionId) {
          throw new Error("Session ID manquant");
        }

        console.log("Vérification du paiement pour la session:", sessionId);

        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Erreur lors de la vérification du paiement");
        }

        const data = await response.json();
        console.log("Réponse de vérification:", data);

        if (data.success) {
          toast.success("Paiement effectué avec succès");
          // Rediriger vers la page de détails de la demande après 3 secondes
          setTimeout(() => {
            router.push(`/citizen/document/${data.requestId}`);
          }, 3000);
        } else {
          throw new Error(data.message || "Erreur lors de la vérification du paiement");
        }
      } catch (error) {
        console.error("Erreur détaillée:", error);
        setError(error instanceof Error ? error.message : "Une erreur est survenue");
        toast.error("Erreur lors de la vérification du paiement");
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment().catch((error) => {
      console.error("Erreur non gérée:", error);
      setError("Une erreur inattendue est survenue");
      setIsLoading(false);
    });
  }, [sessionId, router]);

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Confirmation de paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-center text-muted-foreground">
                Vérification du paiement en cours...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-center text-lg font-medium text-red-500">
                {error}
              </p>
              <Button
                onClick={() => router.push("/citizen/requests")}
                variant="outline"
                className="w-full"
              >
                Retour à mes demandes
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-center text-lg font-medium">
                Votre paiement a été effectué avec succès !
              </p>
              <p className="text-center text-muted-foreground">
                Vous allez être redirigé vers la page de détails de votre demande...
              </p>
              <Button
                onClick={() => router.push("/citizen/requests")}
                variant="outline"
                className="w-full"
              >
                Voir mes demandes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 