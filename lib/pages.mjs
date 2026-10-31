export const publicPages={
 '/destinations':{id:'destinations',title:'Nos destinations',intro:'Trouvez votre prochain voyage au départ du Tchad.',visible:['#destinations','#tarifs','.horizons']},
 '/agence':{id:'agence',title:'Notre agence',intro:'AMZI TRAVEL, votre interlocuteur au Tchad.',visible:['.agency-complete']},
 '/services':{id:'services',title:'Nos services',intro:'Billets, séjours et pèlerinage : préparez votre projet avec nous.',visible:['#services','.tailor-strip','.journey-board','.route-section']},
 '/devis':{id:'devis',title:'Demander un devis',intro:'Décrivez votre projet pour recevoir une proposition adaptée.',visible:['#devis','#conseils']}
};
export function renderPublicPage(html,path){
 const page=publicPages[path];if(!page)return html;
 const banners={
  destinations:{image:'istanbul.jpg',alt:'Vue d’Istanbul et de ses monuments au bord de l’eau'},
  agence:{image:'agency-consultation.png',alt:'Illustration d’un échange autour d’un projet de voyage'},
  services:{image:'travel-preparation.png',alt:'Passeport, billet et maquette d’avion pour préparer un départ'},
  devis:{image:'clouds.jpg',alt:'Un ciel ouvert sur le prochain voyage'}
 };
 const banner=banners[page.id];
 return html.replace('<body>',`<body data-page="${page.id}">`)
 .replace(/<title>[^<]*<\/title>/,`<title>${page.title} — AMZI TRAVEL</title>`)
 .replace('<main id="main">',`<main id="main"><header class="page-intro page-banner" aria-labelledby="page-title"><img class="page-banner-image" src="/assets/${banner.image}" alt="${banner.alt}" width="1500" height="1000" fetchpriority="high"><div class="page-banner-copy"><nav class="page-breadcrumb" aria-label="Fil d’Ariane"><a href="/">Accueil</a><span aria-hidden="true">/</span><span aria-current="page">${page.title}</span></nav><h1 id="page-title">${page.title}</h1><p>${page.intro}</p></div></header>`)
 .replace(/<link\b[^>]*href="styles.css"[^>]*>/,`<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/pages.css">`)
 .replace(/<script\b[^>]*src="assets\/gsap.js"[^>]*><\/script>/,'').replace(/<script\b[^>]*src="motion.js"[^>]*><\/script>/,'');
}
