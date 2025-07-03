import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const services = [
  {
    title: "Actes de Naissance",
    description: "Demandez des copies ou extraits d'actes de naissance en quelques étapes simples.",
    icon: "https://connectionivoirienne.net/wp-content/uploads/2024/12/460851995_3784141655192038_2949412497533125947_n-768x512.jpg"
  },
  {
    title: "Certificats de Mariage",
    description: "Obtenez des certificats de mariage pour vos démarches administratives.",
    icon: "https://mairiecocody.com/banque_img/articles/23032022/276321128_1930294257178963_5785177963529867890_n.jpg"
  },
  {
    title: "Déclaration de naissance",
    description: "Lancez vos demandes de documents d'identité officiels facilement.",
    icon: "https://img.freepik.com/photos-premium/pied-bebe-peau-noire-africaine-bebe-nouveau-ne-place-main-du-pere-concept-pour-montrer-amour_34985-949.jpg"
  },
  {
    title: "Certificats de décès",
    description: "Demandez des attestations de résidence pour vos différentes procédures.",
    icon: "https://boisseuil87.fr/wp-content/uploads/2023/04/dece.png"
  },
  {
    title: "Livrets de Famille",
    description: "Obtenez ou mettez à jour votre livret de famille en ligne.",
    icon: "https://img.lemde.fr/2022/01/26/2675/0/3744/1872/1342/671/60/0/b377b59_793661046-pns-3188907.jpg"
  },
  {
    title: "Autres Documents",
    description: "Consultez notre catalogue complet pour tous vos besoins administratifs.",
    icon: "https://www.rara.ae/wp-content/uploads/2024/04/document-clearing.jpeg"
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