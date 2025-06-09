"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

export default function NewUserPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "citizen",
  });

  if (!session?.user || session.user.role !== "admin") {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create user");
      }

      toast({
        title: "Succès",
        description: "Utilisateur créé avec succès",
      });

      router.push("/admin/dashboard/users");
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Ajouter un utilisateur</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="citizen">Citoyen</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 