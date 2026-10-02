window.KALONEO_PAGE_DEFINITION = Object.freeze({
  schemaVersion: 1,
  id: "candidate-start",
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
  header: {
    title: "Évaluation des savoirs fondamentaux – Parcours d'intégration",
    subtitle: "Renseignez vos informations puis vérifiez tranquillement la prise en main du matériel avant de commencer.",
    brand: { name: "KALONÉO", baseline: "Au cœur d’un nouvel élan" }
  },
  sections: [
    {
      type: "form-grid",
      title: "Informations du candidat",
      columns: 2,
      fields: [
        { id:"nom", label:"Nom *", inputType:"text", required:true },
        { id:"prenom", label:"Prénom *", inputType:"text", required:true },
        { id:"naissance", label:"Date de naissance *", inputType:"date", required:true },
        { id:"ss7", label:"7 premiers chiffres du n° de sécurité sociale *", inputType:"text", inputMode:"numeric", maxLength:7, required:true },
        { id:"lieu", label:"Ville *", inputType:"text", required:true },
        { id:"groupe", label:"Groupe *", inputType:"text", required:true },
        { id:"dateEvaluation", label:"Date de l’évaluation *", inputType:"date", required:true },
        { id:"parcours", label:"Parcours", inputType:"text", readonly:true, value:"Parcours usine — pilote" }
      ]
    },
    {
      type: "practice-grid",
      title: "Prise en main avant de commencer",
      help: "Ces essais ne sont pas notés. Ils servent uniquement à vérifier la souris, le chronomètre, la calculatrice et le son.",
      layout: { left:"1.45fr", middle:"1.12fr", right:"280px" },
      left: {
        type:"drag-placement",
        step:1,
        tone:"orange",
        title:"Test de la souris",
        instruction:"Déplacez la maison dans l’emplacement libre puis placez la voiture sur le parking.",
        scene:"neighborhood-parking",
        tasks:[
          { id:"house", object:"house-orange", target:"house-slot", pending:"Maison à placer", success:"Maison bien placée ✓" },
          { id:"car", object:"car-blue", target:"parking-slot", pending:"Voiture à placer", success:"Voiture bien placée ✓" }
        ]
      },
      middle: [
        {
          type:"timer",
          step:2,
          tone:"blue",
          title:"Test du chronomètre",
          instruction:"Lancez puis arrêtez le chronomètre.",
          startLabel:"Démarrer",
          stopLabel:"Arrêter",
          statusRunning:"Chronomètre en cours…",
          statusDone:"Chronomètre testé ✓"
        },
        {
          type:"calculator-launcher",
          step:3,
          tone:"orange",
          title:"Test de la calculatrice",
          instruction:"Ouvrez la calculatrice comme pendant les exercices.",
          buttonLabel:"Ouvrir la calculatrice",
          statusDone:"Calculatrice ouverte ✓",
          targetDock:"main-calculator"
        },
        {
          type:"audio-check",
          step:4,
          tone:"green",
          title:"Test audio",
          instruction:"Cliquez pour vérifier que vous entendez bien le son.",
          buttonLabel:"▶ Écouter le son",
          confirmLabel:"Son entendu",
          statusDone:"Son entendu ✓"
        }
      ],
      right: {
        type:"calculator-dock",
        id:"main-calculator",
        title:"Calculatrice",
        help:"Elle s’ouvre ici pour ne jamais masquer les consignes."
      }
    }
  ],
  navigation: {
    next: { id:"next", label:"Suivant" }
  }
});
