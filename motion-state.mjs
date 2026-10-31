const slideImages=[
 ['travel-preparation.png','Préparer un voyage : passeport, billet et maquette d’avion'],
 ['zanzibar.jpg','Évasion et découverte au bord de la mer'],
 ['arabie.jpg','Architecture et lieux de pèlerinage en Arabie saoudite'],
 ['france.jpg','Paris, une destination pour retrouver ses proches et découvrir'],
 ['egypte.jpg','Architecture du Caire et découverte de l’Égypte'],
 ['clouds.jpg','Prendre le large au-dessus des nuages'],
 ['istanbul.jpg','Istanbul et ses monuments entre deux continents'],
 ['maroc.jpg','Architecture marocaine et invitation au voyage'],
 ['canada.jpg','Paysages du Canada et horizons internationaux'],
 ['spirit.jpg','Ruelles et architecture à découvrir lors d’un voyage']
];
export const heroScenes=[
 {id:'vols',title:'Votre prochain vol commence ici.',description:'Au départ du Tchad, préparez votre trajet avec AMZI TRAVEL.',label:'Demander un billet',href:'/devis'},
 {id:'destinations',title:'Choisissez votre prochain horizon.',description:'Égypte, Turquie, Maroc et bien plus : découvrez les destinations à explorer.',label:'Explorer les destinations',href:'/destinations'},
 {id:'pelerinage',title:'Votre pèlerinage se prépare ici.',description:'Omra ou Hajj : parlez de votre projet en Arabie saoudite avec notre agence.',label:'Préparer mon pèlerinage',href:'/devis'},
 {id:'vols',title:'Retrouvez ceux qui comptent.',description:'Une visite en famille ? Indiquez votre destination et vos dates de départ.',label:'Préparer mon départ',href:'/devis'},
 {id:'destinations',title:'L’Égypte vous attend.',description:'Une envie de découverte ? Commençons par votre projet de voyage.',label:'Découvrir les destinations',href:'/destinations'},
 {id:'vols',title:'Vos dates. Votre destination.',description:'Aller simple, aller-retour ou dates flexibles : précisez le trajet qui vous convient.',label:'Étudier mon trajet',href:'/devis'},
 {id:'destinations',title:'Cap sur la Turquie et le Maroc.',description:'De nouvelles villes, de nouvelles rencontres. Choisissez votre prochaine étape.',label:'Trouver ma destination',href:'/destinations'},
 {id:'vols',title:'Un contact au Tchad. À vos côtés.',description:'Échangez avec AMZI TRAVEL pour préciser votre besoin et étudier les options.',label:'Parlons de mon voyage',href:'/devis'},
 {id:'destinations',title:'Voyez plus loin.',description:'France, Canada, États-Unis : votre prochain projet commence par un échange.',label:'Voir les destinations',href:'/destinations'},
 {id:'vols',title:'Faites le premier pas.',description:'Décrivez votre voyage. Nous consultons les prestataires pour préparer votre proposition.',label:'Demander mon devis',href:'/devis'}
].map((scene,index)=>({...scene,image:slideImages[index][0],imageAlt:slideImages[index][1]}));
export const slideEffects=[
 {x:0,y:18},{x:12,y:0},{x:-12,y:0},{x:0,y:-18},
 {scale:.96},{scale:1.02},{rotation:-.7,y:8},{rotation:.7,y:8},
 {rotationX:12,transformPerspective:800},{clipPath:'inset(0 100% 0 0)'}
];
export function sceneAt(index){return heroScenes[((index%heroScenes.length)+heroScenes.length)%heroScenes.length]}
