'use strict';

const fs=require('fs');
const os=require('os');
const path=require('path');
const { buildBilanDocxBuffer }=require('../src/bilan-docx-main');

(async()=>{
  const payload={
    filename:'Evaluation_TEST_R17.docx',
    candidate:{nom:'TEST',prenom:'R17',date:'2026-10-07'},
    rows:[
      {type:'section',text:'Compétences techniques',strong:true},
      {
        type:'row',
        id:'organisation',
        module:'Gestion logistique\nRanger le stock de produits\nCapacité à effectuer le classement des produits dans un espace de stockage en respectant les consignes.',
        level:'III',
        levelTexts:{NE:'',I:'',II:'',III:''},
        comment:'III. Réalise la tâche avec de nombreuses erreurs nécessitant un accompagnement.',
        detail:'33 erreurs'
      },
      {
        type:'row',
        id:'tri-temps',
        module:'Tri de chevilles\nCapacité à effectuer une tâche simple et répétitive en un temps imparti.\nMoyenne 11:40',
        level:'I',
        levelTexts:{NE:'',I:'-10 à 12 min',II:'12 à 14 min',III:'14 min et plus'},
        comment:'',
        detail:'',
        extra:'N°1 : 11 min 00 s\nN°2 : 11 min 40 s\nN°3 : 12 min 00 s\nN°4 : 12 min 00 s'
      }
    ],
    summary:'Synthèse de test. Autoévaluation du candidat : repères déclarés par la personne.',
    feeling:''
  };
  const buffer=await buildBilanDocxBuffer(payload);
  if(!Buffer.isBuffer(buffer)||buffer.length<5000)throw new Error('Buffer DOCX invalide ou trop petit.');
  if(buffer[0]!==0x50||buffer[1]!==0x4b)throw new Error('Le document généré n’est pas une archive DOCX/ZIP.');
  const target=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'seb-evalpro-r17-bilan-smoke.docx');
  fs.writeFileSync(target,buffer);
  console.log('BILAN_DOCX_SMOKE=OK');
  console.log('BILAN_DOCX_SMOKE_PATH='+target);
})().catch(error=>{
  console.error('BILAN_DOCX_SMOKE=FAIL');
  console.error(error&&error.stack||error);
  process.exit(2);
});
