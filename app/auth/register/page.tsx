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
import Link from "next/link";

const formSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  dateNaissance: z.string().min(1, "La date de naissance est requise"),
  lieuNaissance: z.string().min(2, "Le lieu de naissance est requis"),
  adresse: z.string().min(5, "L'adresse doit contenir au moins 5 caractères"),
  numeroTelephone: z.string().regex(/^\+?[0-9]{10,}$/, "Numéro de téléphone invalide"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      dateNaissance: "",
      lieuNaissance: "",
      adresse: "",
      numeroTelephone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      console.log('Envoi des données:', { ...values, password: '[REDACTED]' });
      
      const response = await fetch("/api/citizens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      console.log('Réponse du serveur:', data);

      if (!response.ok) {
        throw new Error(data.message || "Une erreur est survenue lors de l'inscription");
      }

      toast.success("Inscription réussie ! Vous pouvez maintenant vous connecter.");
      form.reset();
      // Rediriger vers la page de connexion après l'inscription
      window.location.href = "/auth/login";
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-xl shadow-lg p-6 border animate-fadeIn">
            <div className="flex flex-col items-center mb-6 space-y-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Inscription citoyen
              </h1>
              <p className="text-muted-foreground text-center text-sm">
                Créez votre compte pour accéder à tous nos services administratifs
              </p>
              <Link 
                href="/auth/login" 
                className="text-sm text-primary hover:text-primary/80 transition-colors duration-200"
              >
                Déjà inscrit ? Se connecter
              </Link>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nom"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="kakou" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prenom"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">Prénom</FormLabel>
                        <FormControl>
                          <Input placeholder="Jean-marc" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateNaissance"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">Date de naissance</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lieuNaissance"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">Lieu de naissance</FormLabel>
                        <FormControl>
                          <Input placeholder="Abidjan" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adresse"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 space-y-1.5">
                        <FormLabel className="text-sm">Adresse</FormLabel>
                        <FormControl>
                          <Input placeholder="Cocody 2 plateaux" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numeroTelephone"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">Numéro de téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="+2250747251333" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jean-marc.kakou@email.com" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">Mot de passe</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">Confirmer le mot de passe</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button 
                    type="submit" 
                    className="flex-1 h-10 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Inscription en cours...</span>
                      </div>
                    ) : (
                      "S'inscrire"
                    )}
                  </Button>
                  <Link href="/">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-10 text-sm"
                    >
                      Annuler
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}