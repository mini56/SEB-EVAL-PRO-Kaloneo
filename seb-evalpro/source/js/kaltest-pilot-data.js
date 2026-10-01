window.sebKaltestPilotDefinitions = Object.freeze({
  test: {
  "kaltestFormat": 1,
  "minSebEvalPro": "0.1.0-dev",
  "builderVersion": "0.1.0-dev",
  "id": "calculs_commandes_atelier",
  "version": "1.0.0",
  "title": "Calculs de commandes en atelier",
  "category": "mathematiques",
  "description": "Calculer des quantités, des coûts et une durée dans une situation de petites commandes en atelier.",
  "kind": "questionnaire",
  "scored": true,
  "sourceMigration": {
    "baseline": "SEB EvalPro 0.3.10 Build #20",
    "sourcePage": "qcmv1.0.html#page2",
    "sourceScript": "source/js/qcm-page2.js",
    "legacyParcoursId": "qcm-2"
  },
  "calculator": {
    "compatible": true,
    "defaultEnabled": true
  },
  "scenario": "Vous venez d'intégrer l'atelier de fabrication. Votre responsable vous confie la gestion de petites commandes.\n\nVous devez calculer les quantités, les coûts et la durée de certaines tâches.",
  "instruction": "Notez votre réponse pour chaque question dans ce tableau :",
  "presentation": {
    "layout": "single-block",
    "responseTable": {
      "headers": [
        "Question N°",
        "Réponse",
        "Unités"
      ],
      "roundedInstitutionalStyle": true
    }
  },
  "runtime": {
    "start": true,
    "save": true,
    "restore": true,
    "finish": true
  },
  "questions": [
    {
      "id": "id1_calculs_commandes_atelier",
      "prompt": "Un client commande 12 boîtes de vis, chaque boîte contient 85 vis. Combien de vis en tout devez-vous préparer ?",
      "response": {
        "type": "number"
      },
      "acceptedAnswers": [
        "1020"
      ],
      "points": 1,
      "unitInput": true,
      "unitScored": false,
      "units": []
    },
    {
      "id": "id2_calculs_commandes_atelier",
      "prompt": "Votre équipe fabrique 250 pièces par jour. Combien de pièces seront produites en 5 jours ?",
      "response": {
        "type": "number"
      },
      "acceptedAnswers": [
        "1250"
      ],
      "points": 1,
      "unitInput": true,
      "unitScored": false,
      "units": []
    },
    {
      "id": "id3_calculs_commandes_atelier",
      "prompt": "Vous avez 420 vis à répartir également dans 7 boîtes. Combien de vis y aurait-il par boîte ?",
      "response": {
        "type": "number"
      },
      "acceptedAnswers": [
        "60"
      ],
      "points": 1,
      "unitInput": true,
      "unitScored": false,
      "units": []
    },
    {
      "id": "id4_calculs_commandes_atelier",
      "prompt": "Une commande coûte 175 euros. Si le client achète 3 commandes identiques, quel sera le montant total à payer ?",
      "response": {
        "type": "number"
      },
      "acceptedAnswers": [
        "525"
      ],
      "points": 1,
      "unitInput": true,
      "unitScored": false,
      "units": []
    },
    {
      "id": "id5_calculs_commandes_atelier",
      "prompt": "Vous devez assembler 48 produits et vous pouvez en monter 6 par heure. Combien d'heures de travail seront nécessaires pour finir la commande ?",
      "response": {
        "type": "number"
      },
      "acceptedAnswers": [
        "8"
      ],
      "points": 1,
      "unitInput": true,
      "unitScored": false,
      "units": []
    }
  ],
  "outputs": [
    {
      "id": "score",
      "type": "number"
    },
    {
      "id": "score_max",
      "type": "number"
    },
    {
      "id": "pourcentage",
      "type": "number"
    }
  ],
  "bilanContributions": [
    {
      "lineId": "bilan.savoirs_fondamentaux.mathematiques.comprendre_enonce_consigne",
      "bindings": {
        "score": "score",
        "score_max": "score_max"
      }
    }
  ]
},
  bilanCatalog: {
  "format": "seb-bilan-catalog",
  "version": "1.0.0",
  "source": {
    "application": "SEB EvalPro",
    "baseline": "0.3.10 Build #20",
    "sourceFile": "overrides/admin-bilan.html",
    "runtimeFile": "source/js/admin-bilan-runtime.js"
  },
  "definitions": [
    {
      "id": "bilan.competences_techniques.fabrication_structure_3d",
      "version": "1.0.0",
      "section": {
        "id": "competences_techniques",
        "label": "Compétences techniques"
      },
      "subsection": {
        "id": "fabrication_structure_3d_papier",
        "label": "Fabrication d’une structure 3D en papier"
      },
      "family": {
        "id": "capacites_visuo_constructives",
        "label": "Capacités Visuo-constructives"
      },
      "lines": [
        {
          "id": "bilan.competences_techniques.fabrication.plan",
          "legacyRowId": "fabrication-plan",
          "label": "Capacité à lire un plan et comprendre un modèle ou un gabarit.",
          "mode": "manual",
          "comments": {
            "I": "I. La personne n'a pas besoin d'aide pour commencer l'exercice.",
            "II": "II. A besoin de consignes supplémentaires pour commencer l'exercice.",
            "III": "III. A besoin qu'on lui montre un exemple ou d'utiliser un gabarit pour commencer l'exercice.",
            "NE": "Non évalué."
          }
        },
        {
          "id": "bilan.competences_techniques.fabrication.tracage_reperage",
          "legacyRowId": "fabrication-tracage",
          "label": "Les opérations de traçage et de repérage",
          "mode": "manual",
          "comments": {
            "I": "I. Les traits sont droits, le traçage est conforme aux spécificités du plan.",
            "II": "II. Les traits sont droits mais pas aux dimensions indiquées.",
            "III": "III. Les traits ne sont pas droits et pas aux dimensions attendues.",
            "NE": "Non évalué."
          }
        },
        {
          "id": "bilan.competences_techniques.fabrication.decoupe",
          "legacyRowId": "fabrication-decoupe",
          "label": "Les opérations de découpe",
          "mode": "manual",
          "comments": {
            "I": "I. Les découpes sont conformes.",
            "II": "II. Les découpes ne sont pas droites ou incomplètes.",
            "III": "III. La personne n’utilise pas toujours les ciseaux de manière adaptée.",
            "NE": "Non évalué."
          }
        },
        {
          "id": "bilan.competences_techniques.fabrication.pliage_assemblage",
          "legacyRowId": "fabrication-assemblage",
          "label": "Les opérations de pliage et d’assemblage",
          "mode": "manual",
          "comments": {
            "I": "I. La personne n'a pas besoin d'aide et l'assemblage est conforme.",
            "II": "II. La personne demande des consignes supplémentaires pour assembler.",
            "III": "III. La personne a besoin d'aide pour assembler ou l'assemblage n'est pas correct.",
            "NE": "Non évalué."
          }
        },
        {
          "id": "bilan.competences_techniques.fabrication.finition",
          "legacyRowId": "fabrication-finition",
          "label": "Les opérations de finition",
          "mode": "manual",
          "comments": {
            "I": "I. L’aspect du produit est conforme aux exigences, le travail est minutieux.",
            "II": "II. L’aspect du produit n'est pas conforme aux exigences, les opérations de finition ne sont pas effectuées avec précision.",
            "III": "III. L’aspect du produit n'est pas conforme aux exigences, pas ou peu de finition.",
            "NE": "Non évalué."
          }
        }
      ]
    },
    {
      "id": "bilan.competences_techniques.briques",
      "version": "1.0.0",
      "section": {
        "id": "competences_techniques",
        "label": "Compétences techniques"
      },
      "subsection": {
        "id": "construction_briques",
        "label": "Construction à base de briques"
      },
      "family": {
        "id": "capacites_visuo_spatiales",
        "label": "Capacités Visuo-spatiales"
      },
      "lines": [
        {
          "id": "bilan.competences_techniques.briques.identifier_schema",
          "legacyRowId": "briques-identification",
          "label": "Capacité à identifier, décoder et interpréter un schéma simple",
          "mode": "automatic",
          "comments": {
            "I": "I. La personne n'a pas besoin d'aide pour commencer l'exercice.",
            "II": "II. La personne a besoin de consignes supplémentaires pour commercer l'exercice.",
            "III": "III. La personne a besoin de consignes supplémentaires et qu'on lui montre un exemple pour commencer l'exercice.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "erreurs",
              "type": "integer",
              "required": true
            }
          ],
          "aggregation": {
            "method": "direct",
            "sourceInput": "erreurs",
            "resultMetric": "erreurs"
          },
          "evaluation": {
            "sourceMetric": "erreurs",
            "direction": "lower-is-better",
            "levelIThreshold": 2,
            "levelIIThreshold": 4
          }
        },
        {
          "id": "bilan.competences_techniques.briques.manipuler_assembler",
          "legacyRowId": "briques-manipulation",
          "label": "Capacité à manipuler et assembler",
          "mode": "automatic",
          "comments": {
            "I": "I. Assemble les pièces sans difficultés.",
            "II": "II. Reconnaît les pièces mais les assemble avec difficulté.",
            "III": "III. Ne présente pas la pièce dans sa bonne position ce qui rend long voire impossible l’assemblage.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "erreurs",
              "type": "integer",
              "required": true
            }
          ],
          "aggregation": {
            "method": "direct",
            "sourceInput": "erreurs",
            "resultMetric": "erreurs"
          },
          "evaluation": {
            "sourceMetric": "erreurs",
            "direction": "lower-is-better",
            "levelIThreshold": 2,
            "levelIIThreshold": 4
          }
        }
      ]
    },
    {
      "id": "bilan.competences_techniques.carre_magique",
      "version": "1.0.0",
      "section": {
        "id": "competences_techniques",
        "label": "Compétences techniques"
      },
      "subsection": {
        "id": "carre_magique",
        "label": "Carré magique"
      },
      "lines": [
        {
          "id": "bilan.competences_techniques.carre_magique.resolution_contraintes",
          "legacyRowId": "carre",
          "label": "Capacités de résolution de problèmes structurés par contraintes",
          "mode": "automatic",
          "comments": {
            "I": "I. Est en capacité d'identifier les contraintes d'un problème structuré, d'en analyser les relations et d'en déduire une solution.",
            "II": "II. Est en capacité d'identifier les contraintes d'un problème structuré et d'en résoudre partiellement les relations.",
            "III": "III. A des difficultés à identifier les contraintes d'un problème structuré et à établir les relations entre ses éléments.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "erreurs",
              "type": "integer",
              "required": true
            }
          ],
          "aggregation": {
            "method": "direct",
            "sourceInput": "erreurs",
            "resultMetric": "erreurs"
          },
          "evaluation": {
            "sourceMetric": "erreurs",
            "direction": "lower-is-better",
            "levelIThreshold": 2,
            "levelIIThreshold": 4
          }
        }
      ]
    },
    {
      "id": "bilan.competences_techniques.gestion_logistique",
      "version": "1.0.0",
      "section": {
        "id": "competences_techniques",
        "label": "Compétences techniques"
      },
      "subsection": {
        "id": "gestion_logistique",
        "label": "Gestion logistique — Ranger le stock de produits"
      },
      "lines": [
        {
          "id": "bilan.competences_techniques.gestion_logistique.classement_multicritere",
          "legacyRowId": "organisation",
          "label": "Capacité à effectuer le classement des produits dans un espace de stockage en respectant les consignes.",
          "mode": "automatic",
          "comments": {
            "I": "I. Est en capacité d'effectuer une tâche de gestion de stock multicritère de manière autonome sans erreur significative.",
            "II": "II. Est en capacité d'effectuer une tâche de gestion de stock multicritère, mais produit des erreurs.",
            "III": "III. Réalise la tâche avec de nombreuses erreurs nécessitant un accompagnement.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "erreurs",
              "type": "integer",
              "required": true
            }
          ],
          "aggregation": {
            "method": "direct",
            "sourceInput": "erreurs",
            "resultMetric": "erreurs"
          },
          "evaluation": {
            "sourceMetric": "erreurs",
            "direction": "lower-is-better",
            "levelIThreshold": 2,
            "levelIIThreshold": 4
          }
        }
      ]
    },
    {
      "id": "bilan.competences_techniques.planning",
      "version": "1.0.0",
      "section": {
        "id": "competences_techniques",
        "label": "Compétences techniques"
      },
      "subsection": {
        "id": "gestion_planning_contraintes",
        "label": "Gestion de plannings sous contraintes — Le restaurant"
      },
      "lines": [
        {
          "id": "bilan.competences_techniques.planning.repartition_taches",
          "legacyRowId": "planning",
          "label": "Capacité à effectuer la répartition de tâches selon des contraintes données.",
          "mode": "automatic",
          "comments": {
            "I": "I. Est en capacité de déterminer l’ordre d’exécution de tâches les unes par rapport aux autres.",
            "II": "II. Est en capacité de déterminer l’ordre d’exécution de tâches les unes par rapport aux autres mais produit des erreurs.",
            "III": "III. N’est pas en capacité de déterminer l’ordre d’exécution de tâches les unes par rapport aux autres.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "score",
              "type": "number",
              "required": true
            },
            {
              "id": "score_max",
              "type": "number",
              "required": true
            }
          ],
          "aggregation": {
            "method": "sum-score",
            "scoreInput": "score",
            "maxInput": "score_max"
          },
          "evaluation": {
            "sourceMetric": "score",
            "direction": "higher-is-better",
            "levelIThreshold": 20,
            "levelIIThreshold": 17
          }
        }
      ]
    },
    {
      "id": "bilan.competences_techniques.tri_chevilles",
      "version": "1.0.0",
      "section": {
        "id": "competences_techniques",
        "label": "Compétences techniques"
      },
      "subsection": {
        "id": "tri_chevilles",
        "label": "Tri de chevilles"
      },
      "lines": [
        {
          "id": "bilan.competences_techniques.tri_chevilles.temps",
          "legacyRowId": "tri-temps",
          "label": "Capacité à effectuer une tâche simple et répétitive en un temps imparti.",
          "mode": "automatic",
          "comments": {
            "I": "",
            "II": "",
            "III": "",
            "NE": ""
          },
          "inputs": [
            {
              "id": "temps_moyen",
              "type": "duration",
              "required": true
            },
            {
              "id": "temps_essais",
              "type": "duration-list",
              "required": false
            }
          ],
          "aggregation": {
            "method": "direct",
            "sourceInput": "temps_moyen",
            "resultMetric": "temps_moyen"
          },
          "evaluation": {
            "sourceMetric": "temps_moyen",
            "direction": "lower-is-better",
            "levelIThreshold": 720,
            "levelIIThreshold": 840
          },
          "displayTemplates": [
            {
              "id": "moyenne",
              "label": "Insérer le temps moyen",
              "template": "Moyenne {{temps_moyen}}"
            },
            {
              "id": "temps_essais",
              "label": "Insérer les temps des essais",
              "template": "{{temps_essais}}"
            }
          ]
        },
        {
          "id": "bilan.competences_techniques.tri_chevilles.erreurs",
          "legacyRowId": "tri-erreurs",
          "label": "Nombre d’erreurs effectuées",
          "mode": "automatic",
          "comments": {
            "I": "Fiabilité satisfaisante.",
            "II": "Fiabilité à surveiller.",
            "III": "Fiabilité insuffisante.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "moyenne_erreurs",
              "type": "number",
              "required": true
            },
            {
              "id": "erreurs_total",
              "type": "integer",
              "required": false
            }
          ],
          "aggregation": {
            "method": "direct",
            "sourceInput": "moyenne_erreurs",
            "resultMetric": "moyenne_erreurs"
          },
          "evaluation": {
            "sourceMetric": "moyenne_erreurs",
            "direction": "lower-is-better",
            "levelIThreshold": 1.6,
            "levelIIThreshold": 3.2
          },
          "displayTemplates": [
            {
              "id": "moyenne_erreurs",
              "label": "Insérer la moyenne des erreurs",
              "template": "Moyenne des erreurs : {{moyenne_erreurs}}"
            },
            {
              "id": "erreurs_total",
              "label": "Insérer le nombre total d’erreurs",
              "template": "{{erreurs_total}} erreur(s)"
            }
          ]
        }
      ]
    },
    {
      "id": "bilan.tic.traitement_texte",
      "version": "1.0.0",
      "section": {
        "id": "techniques_information_communication",
        "label": "Utilisation des techniques de l'information et de la communication"
      },
      "subsection": {
        "id": "traitement_texte",
        "label": "Traitement de texte"
      },
      "lines": [
        {
          "id": "bilan.tic.traitement_texte.presenter_travail",
          "legacyRowId": "texte",
          "label": "Capacité à utiliser l’outil informatique pour présenter un travail",
          "mode": "automatic",
          "comments": {
            "I": "I. La personne sait utiliser un logiciel de traitement de texte pour produire un travail individuel présentable à un tiers.",
            "II": "II. A besoin d’aide pour utiliser un logiciel de traitement de texte pour produire un travail individuel présentable à un tiers.",
            "III": "III. Ne sait pas utiliser un logiciel de traitement de texte.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "score",
              "type": "number",
              "required": true
            },
            {
              "id": "score_max",
              "type": "number",
              "required": true
            }
          ],
          "aggregation": {
            "method": "sum-score",
            "scoreInput": "score",
            "maxInput": "score_max"
          },
          "evaluation": {
            "sourceMetric": "score",
            "direction": "higher-is-better",
            "levelIThreshold": 7,
            "levelIIThreshold": 3
          }
        }
      ]
    },
    {
      "id": "bilan.tic.messagerie",
      "version": "1.0.0",
      "section": {
        "id": "techniques_information_communication",
        "label": "Utilisation des techniques de l'information et de la communication"
      },
      "subsection": {
        "id": "messagerie_electronique",
        "label": "Messagerie électronique"
      },
      "lines": [
        {
          "id": "bilan.tic.messagerie.echanger",
          "legacyRowId": "mail",
          "label": "Capacité à échanger avec les technologies de l’information et de la communication",
          "mode": "automatic",
          "comments": {
            "I": "I. Est capable d’envoyer seule un message hiérarchisé par des codes et à deux destinataires convenus.",
            "II": "II. A besoin d’aide pour envoyer un message et/ou des oublis de consignes sont révélés.",
            "III": "III. Ne sait pas utiliser une messagerie.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "erreurs",
              "type": "integer",
              "required": true
            }
          ],
          "aggregation": {
            "method": "direct",
            "sourceInput": "erreurs",
            "resultMetric": "erreurs"
          },
          "evaluation": {
            "sourceMetric": "erreurs",
            "direction": "lower-is-better",
            "levelIThreshold": 1,
            "levelIIThreshold": 3
          }
        }
      ]
    },
    {
      "id": "bilan.savoirs_fondamentaux.expression_ecrite",
      "version": "1.0.0",
      "section": {
        "id": "savoirs_fondamentaux",
        "label": "Savoirs fondamentaux"
      },
      "subsection": {
        "id": "expression_ecrite",
        "label": "Expression écrite"
      },
      "lines": [
        {
          "id": "bilan.savoirs_fondamentaux.expression_ecrite.maitrise",
          "legacyRowId": "expression",
          "label": "Maîtrise des règles de grammaire, d'orthographe et de conjugaison, ... et aptitudes à communiquer sous forme écrite.",
          "mode": "automatic",
          "comments": {
            "I": "I. Structure des phrases et orthographe grammaticale correctes. Lexique approprié et précis avec des écrits/textes cohérents.",
            "II": "Structure des phrases et orthographe globalement correcte. Idées présentées de manière ordonnée.",
            "III": "III. La structure des phrases et l’orthographe grammaticale ne sont pas correctes.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "score",
              "type": "number",
              "required": true
            },
            {
              "id": "score_max",
              "type": "number",
              "required": true
            }
          ],
          "aggregation": {
            "method": "sum-score",
            "scoreInput": "score",
            "maxInput": "score_max"
          },
          "evaluation": {
            "sourceMetric": "pourcentage",
            "direction": "higher-is-better",
            "levelIThreshold": 70,
            "levelIIThreshold": 45
          },
          "displayTemplates": [
            {
              "id": "pourcentage",
              "label": "Insérer le pourcentage",
              "template": "{{pourcentage}} % de réponses correctes"
            }
          ]
        }
      ]
    },
    {
      "id": "bilan.savoirs_fondamentaux.mathematiques",
      "version": "1.0.0",
      "section": {
        "id": "savoirs_fondamentaux",
        "label": "Savoirs fondamentaux"
      },
      "subsection": {
        "id": "mathematiques",
        "label": "Mathématiques"
      },
      "lines": [
        {
          "id": "bilan.savoirs_fondamentaux.mathematiques.comprendre_enonce_consigne",
          "legacyRowId": "math-enonce",
          "label": "Capacité à comprendre un énoncé et une consigne",
          "mode": "automatic",
          "comments": {
            "I": "I. Comprend et exécute une consigne unique.",
            "II": "II. A compris et exécuté partiellement une consigne unique.",
            "III": "III. N’a pas su exécuter une consigne unique.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "score",
              "type": "number",
              "required": true
            },
            {
              "id": "score_max",
              "type": "number",
              "required": true
            }
          ],
          "aggregation": {
            "method": "sum-score",
            "scoreInput": "score",
            "maxInput": "score_max"
          },
          "evaluation": {
            "sourceMetric": "pourcentage",
            "direction": "higher-is-better",
            "levelIThreshold": 70,
            "levelIIThreshold": 45
          },
          "displayTemplates": [
            {
              "id": "pourcentage",
              "label": "Insérer le pourcentage",
              "template": "{{pourcentage}} % de réponses correctes"
            }
          ]
        },
        {
          "id": "bilan.savoirs_fondamentaux.mathematiques.resoudre_problemes",
          "legacyRowId": "math-problemes",
          "label": "Capacité à résoudre des problèmes en lien avec le domaine professionnel, d’autres disciplines ou la vie courante",
          "mode": "automatic",
          "comments": {
            "I": "I. Est capable de calculer, mettre en œuvre des algorithmes et de traiter des problèmes de pourcentages et d’échelles liés à la vie courante.",
            "II": "II. Est capable de calculer et de traiter des problèmes de pourcentages et d’échelles liées à la vie courante en commettant quelques erreurs ou imprécisions.",
            "III": "III. La personne a recouru à des stratégies inappropriées ou sans liens avec les exigences de la situation.",
            "NE": "Non évalué."
          },
          "inputs": [
            {
              "id": "score",
              "type": "number",
              "required": true
            },
            {
              "id": "score_max",
              "type": "number",
              "required": true
            }
          ],
          "aggregation": {
            "method": "sum-score",
            "scoreInput": "score",
            "maxInput": "score_max"
          },
          "evaluation": {
            "sourceMetric": "pourcentage",
            "direction": "higher-is-better",
            "levelIThreshold": 70,
            "levelIIThreshold": 45
          },
          "displayTemplates": [
            {
              "id": "pourcentage",
              "label": "Insérer le pourcentage",
              "template": "{{pourcentage}} % de réponses correctes"
            }
          ]
        }
      ]
    }
  ]
}
});
