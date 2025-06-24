'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NoAgentFoundPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-destructive">
            Agent non disponible
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-lg">
            Aucun agent n'a été trouvé pour la commune sélectionnée.
          </p>
          <p className="mb-6 text-muted-foreground">
            Nos services ne sont pas encore disponibles dans cette commune. Veuillez réessayer plus tard ou sélectionner une autre commune.
          </p>
          <Button onClick={() => router.back()}>
            Retourner au formulaire
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 