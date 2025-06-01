import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const services = [
  {
    title: "Actes de Naissance",
    description: "Demandez des copies ou extraits d'actes de naissance en quelques étapes simples.",
    icon: "https://images.pexels.com/photos/568027/pexels-photo-568027.jpeg"
  },
  {
    title: "Certificats de Mariage",
    description: "Obtenez des certificats de mariage pour vos démarches administratives.",
    icon: "https://images.pexels.com/photos/1128318/pexels-photo-1128318.jpeg"
  },
  {
    title: "Documents d'Identité",
    description: "Lancez vos demandes de documents d'identité officiels facilement.",
    icon: "https://images.pexels.com/photos/5212320/pexels-photo-5212320.jpeg"
  },
  {
    title: "Certificats de Résidence",
    description: "Demandez des attestations de résidence pour vos différentes procédures.",
    icon: "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg"
  },
  {
    title: "Livrets de Famille",
    description: "Obtenez ou mettez à jour votre livret de famille en ligne.",
    icon: "https://images.pexels.com/photos/5257481/pexels-photo-5257481.jpeg"
  },
  {
    title: "Autres Documents",
    description: "Consultez notre catalogue complet pour tous vos besoins administratifs.",
    icon: "https://images.pexels.com/photos/4386366/pexels-photo-4386366.jpeg"
  },
];

export default function ServicesSection() {
  return (
    <div className="container px-4 md:px-6">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-3xl font-bold tracking-tighter">Nos Services</h2>
        <p className="text-muted-foreground max-w-[600px] mx-auto">
          Accédez à une variété de documents officiels depuis le confort de votre domicile.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, i) => (
          <div key={i} className="rounded-lg border bg-card shadow-sm overflow-hidden card-hover animation-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="h-40 overflow-hidden">
              <Image 
                src={service.icon}
                alt={service.title}
                width={400}
                height={200}
                loading="lazy"
                quality={75}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-muted-foreground mb-4">{service.description}</p>
              <Link href="/auth/register">
                <Button variant="outline" className="w-full">
                  Faire une demande <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 