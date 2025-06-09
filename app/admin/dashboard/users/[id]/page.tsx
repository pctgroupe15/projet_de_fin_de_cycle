"use client";

import { useState, useEffect } from "react";
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

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
}

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    status: "",
  });

  useEffect(() => {
    if (!session?.user || session.user.role !== "admin") {
      router.push("/");
      return;
    }

    fetchUser();
  }, [session, router, params.id]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }
      const data = await response.json();
      setUser(data);
      setFormData({
        name: data.displayName,
        email: data.email,
        role: data.role,
        status: data.status,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les informations de l'utilisateur",
        variant: "destructive",
      });
      router.push("/admin/dashboard/users");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      toast({
        title: "Succès",
        description: "Utilisateur mis à jour avec succès",
      });

      router.push("/admin/dashboard/users");
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Modifier l'utilisateur</h1>

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

          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
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
              {isLoading ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 