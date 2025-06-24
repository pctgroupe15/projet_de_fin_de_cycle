"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  fullName: z.string().min(2, "Le nom complet est requis"),
  birthDate: z.string().min(1, "La date de naissance est requise"),
  birthPlace: z.string().min(2, "Le lieu de naissance est requis"),
  fatherName: z.string().min(2, "Le nom du père est requis"),
  motherName: z.string().min(2, "Le nom de la mère est requis"),
  reason: z.string().min(10, "La raison de la demande est requise"),
  communeId: z.string().min(1, "La commune est requise"),
});

type FormValues = z.infer<typeof formSchema>;

interface Commune {
  _id: string;
  name: string;
}

export default function ActeNaissanceForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCommunesLoading, setIsCommunesLoading] = useState(true);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      birthDate: "",
      birthPlace: "",
      fatherName: "",
      motherName: "",
      reason: "",
      communeId: "",
    },
  });

  useEffect(() => {
    const fetchCommunes = async () => {
      try {
        setIsCommunesLoading(true);
        const response = await fetch("/api/communes");
        
        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des communes");
        }
        
        const data = await response.json();
        setCommunes(data);
      } catch (error) {
        console.error("Error fetching communes:", error);
        toast.error("Impossible de charger les communes");
      } finally {
        setIsCommunesLoading(false);
      }
    };

    fetchCommunes();
  }, []);

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/citizen/birth-certificate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.message || "Erreur lors de la soumission de la demande";
        throw new Error(errorMessage);
      }

      toast.success("Demande d'acte de naissance soumise avec succès");
      form.reset();
      
      // Rediriger vers la page de détails existante
      router.push(`/citizen/document/${result.data.id}`);
    } catch (error) {
      console.error("Erreur:", error);
      if (error instanceof Error && error.message === 'Aucun agent trouvé pour la commune sélectionnée') {
        router.push('/error/no-agent-found');
      } else {
        toast.error(error instanceof Error ? error.message : "Erreur lors de la soumission de la demande");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom complet</FormLabel>
              <FormControl>
                <Input placeholder="Entrez votre nom complet" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date de naissance</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birthPlace"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lieu de naissance</FormLabel>
              <FormControl>
                <Input placeholder="Entrez le lieu de naissance" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fatherName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du père</FormLabel>
              <FormControl>
                <Input placeholder="Entrez le nom du père" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="motherName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la mère</FormLabel>
              <FormControl>
                <Input placeholder="Entrez le nom de la mère" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Raison de la demande</FormLabel>
              <FormControl>
                <Input placeholder="Entrez la raison de votre demande" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="communeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Commune</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isCommunesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      isCommunesLoading 
                        ? "Chargement des communes..." 
                        : "Sélectionner une commune"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {isCommunesLoading ? (
                      <SelectItem value="loading" disabled>
                        Chargement...
                      </SelectItem>
                    ) : communes.length === 0 ? (
                      <SelectItem value="no-communes" disabled>
                        Aucune commune disponible
                      </SelectItem>
                    ) : (
                      communes.map(commune => (
                        <SelectItem key={commune._id} value={commune._id}>
                          {commune.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Soumission en cours..." : "Soumettre la demande"}
        </Button>
      </form>
    </Form>
  );
} 