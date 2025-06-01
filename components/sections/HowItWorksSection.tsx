const steps = [
  {
    title: "Créez un compte",
    description: "Inscrivez-vous sur notre plateforme pour accéder à tous nos services."
  },
  {
    title: "Faites votre demande",
    description: "Sélectionnez le document souhaité et remplissez le formulaire approprié."
  },
  {
    title: "Suivez votre demande",
    description: "Surveillez l'état de votre demande dans votre espace personnel."
  },
  {
    title: "Recevez votre document",
    description: "Téléchargez votre document ou recevez-le selon le mode choisi."
  }
];

export default function HowItWorksSection() {
  return (
    <div className="container px-4 md:px-6">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-3xl font-bold tracking-tighter">Comment Ça Marche</h2>
        <p className="text-muted-foreground max-w-[600px] mx-auto">
          Un processus simple en quatre étapes pour obtenir vos documents.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center text-center space-y-3 animation-slideUp" style={{ animationDelay: `${i * 150}ms` }}>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-xl">
              {i + 1}
            </div>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 