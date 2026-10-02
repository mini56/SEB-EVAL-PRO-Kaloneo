window.KALONEO_PAGE_DEFINITION = Object.freeze({
  schemaVersion: 1,
  id: "candidate-introduction",
  pageType: "candidate",
  viewport: { width: 1366, height: 768 },
  typography: {
    pageTitle: 28,
    sectionTitle: 22,
    blockTitle: 18,
    body: 17,
    control: 16,
    secondary: 15,
    field: 17,
    minimumFunctional: 15
  },
  sections: [
    {
      type: "content-stack",
      maxWidth: 1180,
      blocks: [
        {
          type: "text",
          title: "Le contexte :",
          paragraphs: [
            "Vous débutez un stage dans une usine de fabrication. Vous allez passer par plusieurs situations professionnelles avec des missions simulées, un peu comme un parcours d'essai. Chacune correspond à un exercice. L'objectif est d'évaluer vos compétences pratiques, logiques et rédactionnelles dans un contexte proche du travail réel."
          ]
        },
        {
          type: "image-message",
          image: "imageqcm/avatar_transparant.png",
          alt: "Avatar",
          text: "Bienvenue dans ce parcours ! Suivez les instructions attentivement."
        },
        {
          type: "animated-scene",
          scene: "factory-arrival",
          title: "Vidéo d’introduction",
          help: "Votre arrivée dans l’entreprise démarre automatiquement une seule fois.",
          durationMs: 7000,
          playMode: "once",
          finalMessage: "Bienvenue",
          ariaLabel: "Animation d’une personne qui arrive à l’usine puis entre dans le bâtiment"
        },
        {
          type: "text",
          align: "center",
          role: "closing",
          paragraphs: ["Bonne découverte et bon parcours !"]
        }
      ]
    }
  ],
  navigation: {
    next: { id: "start-evaluation", label: "Commencez l'évaluation" }
  }
});
