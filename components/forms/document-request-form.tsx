"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  FileText, 
  Upload, 
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Trash,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { CldUploadWidget, CloudinaryUploadWidgetResults, CloudinaryUploadWidgetInfo } from "next-cloudinary";

// Schéma de validation pour la déclaration de naissance
const birthDeclarationSchema = z.object({
  documentType: z.string(),
  childFirstName: z.string().min(1, "Le prénom de l'enfant est requis"),
  childLastName: z.string().min(1, "Le nom de l'enfant est requis"),
  birthDate: z.string().min(1, "La date de naissance est requise"),
  birthPlace: z.string().min(1, "Le lieu de naissance est requis"),
  gender: z.enum(["MALE", "FEMALE"]),
  fatherFirstName: z.string().min(1, "Le prénom du père est requis"),
  fatherLastName: z.string().min(1, "Le nom du père est requis"),
  motherFirstName: z.string().min(1, "Le prénom de la mère est requis"),
  motherLastName: z.string().min(1, "Le nom de la mère est requis"),
  deliveryMode: z.enum(["PICKUP", "DELIVERY"]),
  deliveryAddress: z.string().optional(),
  birthCertificate: z.object({
    url: z.string(),
    publicId: z.string(),
  }).optional(),
});

// Schéma de validation pour l'acte de naissance
const birthCertificateSchema = z.object({
  documentType: z.string(),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  birthDate: z.string().min(1, "La date de naissance est requise"),
  birthPlace: z.string().min(1, "Le lieu de naissance est requis"),
  fatherName: z.string().min(1, "Le nom du père est requis"),
  motherName: z.string().min(1, "Le nom de la mère est requis"),
  deliveryMode: z.enum(["PICKUP", "DELIVERY"]),
  deliveryAddress: z.string().optional(),
});

// Type pour le formulaire
type FormData = z.infer<typeof birthDeclarationSchema> | z.infer<typeof birthCertificateSchema>;

// Types de documents disponibles
const documentTypes = [
  {
    id: "birth_declaration",
    name: "Déclaration de naissance",
    description: "Déclaration de naissance d'un enfant",
    amount: 5000,
    schema: birthDeclarationSchema,
  },
  {
    id: "birth_certificate",
    name: "Acte de naissance",
    description: "Document officiel attestant de la naissance d'une personne",
    amount: 5000,
    schema: birthCertificateSchema,
  },
  {
    id: "identity_card",
    name: "Carte d'identité",
    description: "Document d'identité officiel",
    amount: 10000,
  },
  {
    id: "residence_certificate",
    name: "Certificat de résidence",
    description: "Document attestant de votre lieu de résidence",
    amount: 3000,
  },
  {
    id: "marriage_certificate",
    name: "Acte de mariage",
    description: "Document officiel attestant du mariage",
    amount: 5000,
  },
];

export function DocumentRequestForm() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadedCertificate, setUploadedCertificate] = useState<{ url: string; publicId: string } | null>(null);

  const selectedDocument = documentTypes.find(doc => doc.id === selectedType);
  const form = useForm<FormData>({
    resolver: zodResolver(selectedDocument?.schema || birthDeclarationSchema),
    defaultValues: {
      documentType: "",
      deliveryMode: "PICKUP",
      deliveryAddress: "",
    } as FormData,
  });

  const handleUploadSuccess = (result: CloudinaryUploadWidgetResults) => {
    if (result.info && typeof result.info === 'object') {
      const info = result.info as CloudinaryUploadWidgetInfo;
      setUploadedCertificate({ url: info.secure_url, publicId: info.public_id });
      form.setValue("birthCertificate", { url: info.secure_url, publicId: info.public_id });
      toast.success("Certificat de naissance téléchargé avec succès");
    }
  };

  const handleRemoveCertificate = () => {
    setUploadedCertificate(null);
    form.setValue("birthCertificate", undefined);
  };

  const onSubmit = async (values: FormData) => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/document-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedType,
          ...values,
          amount: selectedDocument?.amount || 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la demande');
      }

      const data = await response.json();
      setShowSuccess(true);
      router.push(`/citizen/payment/${data.id}`);
    } catch (error) {
      toast.error('Une erreur est survenue lors de la création de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Alert className="w-full max-w-2xl bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Demande soumise avec succès</AlertTitle>
          <AlertDescription className="text-green-700">
            Votre demande a été enregistrée et sera traitée dans les plus brefs délais.
            Vous serez redirigé vers votre tableau de bord dans quelques instants.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Nouvelle demande de document</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Type de document</h3>
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        setSelectedType(value);
                        field.onChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un type de document" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {selectedType === "birth_declaration" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informations de l'enfant</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="childFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom de l'enfant</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="childLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'enfant</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez le genre" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Masculin</SelectItem>
                          <SelectItem value="FEMALE">Féminin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <h3 className="text-lg font-medium mt-6">Informations des parents</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fatherFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom du père</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fatherLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du père</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="motherFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom de la mère</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="motherLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la mère</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Certificat de naissance</h3>
                <FormField
                  control={form.control}
                  name="birthCertificate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="space-y-4">
                          {uploadedCertificate ? (
                            <div className="flex items-center space-x-4 p-4 border rounded-lg">
                              <FileText className="h-8 w-8 text-blue-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  Certificat de naissance
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  {uploadedCertificate.url}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleRemoveCertificate}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <CldUploadWidget
                              uploadPreset="birth_certificates"
                              onSuccess={handleUploadSuccess}
                              options={{
                                maxFiles: 1,
                                resourceType: "image",
                                sources: ["local", "camera"],
                                showAdvancedOptions: false,
                                styles: {
                                  palette: {
                                    window: "#FFFFFF",
                                    windowBorder: "#90A0B3",
                                    tabIcon: "#0078FF",
                                    menuIcons: "#5A616A",
                                    textDark: "#000000",
                                    textLight: "#FFFFFF",
                                    link: "#0078FF",
                                    action: "#FF620C",
                                    inactiveTabIcon: "#0E2F5A",
                                    error: "#F44235",
                                    inProgress: "#0078FF",
                                    complete: "#20B832",
                                    sourceBg: "#E4EBF1"
                                  }
                                }
                              }}
                            >
                              {({ open }: { open: () => void }) => (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => open()}
                                  className="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Télécharger le certificat de naissance
                                </Button>
                              )}
                            </CldUploadWidget>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Formats acceptés : PDF, JPG, JPEG, PNG. Taille maximale : 10MB
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {selectedType === "birth_certificate" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informations personnelles</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
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
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Mode de réception</h3>
            <FormField
              control={form.control}
              name="deliveryMode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="PICKUP" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Retrait en agence
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="DELIVERY" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Livraison à domicile
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("deliveryMode") === "DELIVERY" && (
              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de livraison</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Entrez votre adresse complète"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Envoi en cours..." : "Soumettre la demande"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 