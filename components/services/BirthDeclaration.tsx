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
import { toast } from "sonner";
import { ReceptionModeSelect } from "@/components/forms/reception-mode-select";
import { BirthCertificateUpload } from "@/components/forms/birth-certificate-upload";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  childName: z.string().min(2, "Le nom de l'enfant est requis"),
  birthDate: z.string().min(1, "La date de naissance est requise"),
  birthTime: z.string().min(1, "L'heure de naissance est requise"),
  birthPlace: z.string().min(2, "Le lieu de naissance est requis"),
  gender: z.enum(["MALE", "FEMALE"], {
    required_error: "Le genre est requis",
  }),
  fatherName: z.string().min(2, "Le nom du père est requis"),
  motherName: z.string()
    .min(2, "Le nom de la mère est requis")
    .refine((val) => val.split(' ').length >= 2, {
      message: "Veuillez entrer le prénom et le nom de famille de la mère"
    }),
  receptionMode: z.string().min(1, "Le mode de réception est requis"),
  deliveryAddress: z.string().optional(),
  communeId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function BirthDeclaration() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCommunesLoading, setIsCommunesLoading] = useState(true);
  const [birthCertificateFile, setBirthCertificateFile] = useState<File | null>(null);
  const [communes, setCommunes] = useState<{ _id: string, name: string }[]>([]);
  const router = useRouter();

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
        const result = await response.json();
        const errorMessage = result.error || "Erreur lors de la soumission de la déclaration";
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Si un certificat de naissance a été sélectionné, l'uploader
      if (birthCertificateFile) {
        const formData = new FormData();
        formData.append('file', birthCertificateFile);
        formData.append('requestId', result.data.id);

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
      
      // Rediriger vers la page de détails
      router.push(`/citizen/document/${result.data.id}`);
    } catch (error) {
      console.error("Erreur:", error);
      if (error instanceof Error && error.message === 'Aucun agent trouvé pour la commune sélectionnée') {
        router.push('/error/no-agent-found');
      } else {
        toast.error(error instanceof Error ? error.message : "Erreur lors de la soumission de la déclaration");
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
