"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Home, 
  Settings, 
  Users,
  ClipboardList,
  Bell
} from "lucide-react";

interface AgentLayoutProps {
  children: ReactNode;
}

interface Notification {
  id: string;
  status: string;
}

export function AgentLayout({ children }: AgentLayoutProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    // Mettre à jour le compteur toutes les 30 secondes
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/agent/notifications');
      if (!response.ok) return;
      
      const notifications: Notification[] = await response.json();
      const unread = notifications.filter(n => n.status === "UNREAD").length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
    }
  };

  const navigation = [
    {
      name: "Tableau de bord",
      href: "/agent/dashboard",
      icon: Home
    },
    {
      name: "Demandes",
      href: "/agent/documents",
      icon: ClipboardList
    },
    {
      name: "Citoyens",
      href: "/agent/citizens",
      icon: Users
    },
    {
      name: "Documents",
      href: "/agent/document-types",
      icon: FileText
    },
    {
      name: "Notifications",
      href: "/agent/notifications",
      icon: Bell
    },
    {
      name: "Paramètres",
      href: "/agent/settings",
      icon: Settings
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/agent/dashboard" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">Administration</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 transition-colors hover:text-foreground/80 ${
                      isActive ? "text-foreground" : "text-foreground/60"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Link href="/agent/notifications">
              <Button variant="outline" size="icon" className="relative rounded-full">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center p-0"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <UserNav />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}