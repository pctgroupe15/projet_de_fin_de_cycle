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
import { ReceptionModeSelect } from "@/components/forms/reception-mode-select";
import { BirthCertificateUpload } from "@/components/forms/birth-certificate-upload";

const formSchema = z.object({
  childName: z.string().min(2, "Le nom de l'enfant est requis"),
  birthDate: z.string().min(1, "La date de naissance est requise"),
  birthTime: z.string().min(1, "L'heure de naissance est requise"),
  birthPlace: z.string().min(2, "Le lieu de naissance est requis"),
  gender: z.enum(["MALE", "FEMALE"], {
    required_error: "Le genre est requis",
  }),
  fatherName: z.string().min(2, "Le nom du père est requis"),
  motherName: z.string().min(2, "Le nom de la mère est requis"),
  receptionMode: z.string().min(1, "Le mode de réception est requis"),
  deliveryAddress: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function BirthDeclaration() {
  const [isLoading, setIsLoading] = useState(false);
  const [birthCertificateFile, setBirthCertificateFile] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      childName: "",
      birthDate: "",
      birthTime: "",
      birthPlace: "",
      gender: "MALE",
      fatherName: "",
      motherName: "",
      receptionMode: "pickup",
      deliveryAddress: "",
    },
  });

  const handleBirthCertificateSelect = (file: File) => {
    setBirthCertificateFile(file);
  };

  const handleBirthCertificateRemove = () => {
    setBirthCertificateFile(null);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      
      // Créer d'abord la déclaration
      const response = await fetch("/api/citizen/birth-declaration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la soumission de la déclaration");
      }

      const result = await response.json();

      // Si un certificat de naissance a été sélectionné, l'uploader
      if (birthCertificateFile) {
        const formData = new FormData();
        formData.append('file', birthCertificateFile);
        formData.append('requestId', result.id);

        const uploadResponse = await fetch('/api/citizen/document/upload-birth-certificate', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Erreur lors de l'upload du certificat de naissance");
        }
      }

      toast.success("Déclaration de naissance soumise avec succès");
      form.reset();
      setBirthCertificateFile(null);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la soumission de la déclaration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="childName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de l'enfant</FormLabel>
              <FormControl>
                <Input placeholder="Entrez le nom de l'enfant" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
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
            name="birthTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heure de naissance</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Genre</FormLabel>
              <FormControl>
                <select
                  className="w-full p-2 border rounded-md"
                  {...field}
                >
                  <option value="MALE">Masculin</option>
                  <option value="FEMALE">Féminin</option>
                </select>
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
          name="receptionMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mode de réception</FormLabel>
              <FormControl>
                <ReceptionModeSelect
                  value={field.value}
                  onChange={field.onChange}
                  address={form.watch('deliveryAddress')}
                  onAddressChange={(address) => form.setValue('deliveryAddress', address)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <BirthCertificateUpload
          onFileSelect={handleBirthCertificateSelect}
          onFileRemove={handleBirthCertificateRemove}
          selectedFile={birthCertificateFile || undefined}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Soumission en cours..." : "Soumettre la déclaration"}
        </Button>
      </form>
    </Form>
  );
}
