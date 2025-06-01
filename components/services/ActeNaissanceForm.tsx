"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  fullName: z.string().min(2, "Le nom complet est requis"),
  birthDate: z.string().min(1, "La date de naissance est requise"),
  birthPlace: z.string().min(2, "Le lieu de naissance est requis"),
  fatherName: z.string().min(2, "Le nom du père est requis"),
  motherName: z.string().min(2, "Le nom de la mère est requis"),
  reason: z.string().min(10, "La raison de la demande est requise"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ActeNaissanceForm() {
  const [isLoading, setIsLoading] = useState(false);
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
    },
  });

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

      if (!response.ok) {
        throw new Error("Erreur lors de la soumission de la demande");
      }

      const result = await response.json();
      toast.success("Demande d'acte de naissance soumise avec succès");
      form.reset();
      
      // Rediriger vers la page de détails existante
      router.push(`/citizen/document/${result.data.id}`);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la soumission de la demande");
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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Soumission en cours..." : "Soumettre la demande"}
        </Button>
      </form>
    </Form>
  );
} 