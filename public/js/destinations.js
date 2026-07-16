// Liste des destinations desservies, groupées par région de Madagascar.
// Utilisée pour les listes déroulantes (admin) et l'autocomplétion (recherche client).
const MB_DESTINATIONS = {
  "Capitale": ["Antananarivo"],
  "Nord & Nord-Ouest": [
    "Antsiranana / Diego Suarez", "Ambanja", "Antalaha", "Sambava", "Vohemar",
    "Antsohihy", "Mampikony", "Mahajanga", "Katsepy", "Boriziny / Port Bergé"
  ],
  "Est": [
    "Toamasina", "Foulpointe", "Soanierana Ivongo", "Maroantsetra",
    "Mananara Avaratra", "Vavatenina", "Moramanga", "Mahanoro",
    "Nosy Boraha / Ile Sainte-Marie"
  ],
  "Sud & Sud-Est": [
    "Fianarantsoa", "Ambalavao", "Ihosy", "Ranohira / Isalo", "Toliara / Tuléar",
    "Ankazoabo", "Sakaraha", "Betroka", "Ambositra", "Ambatofinandrahana",
    "Farafangana", "Vangaindrano", "Taolagnaro / Fort Dauphin"
  ],
  "Ouest": [
    "Antsirabe", "Betafo", "Miandrivazo", "Morondava", "Belo sur Tsiribihina",
    "Maintirano", "Tsaratanana"
  ],
  "Centre & Hauts-Plateaux": [
    "Ambatondrazaka", "Andilamena", "Ankazobe", "Arivonimamo",
    "Tsiroanomandidy", "Soavinandriana"
  ]
};

// Liste à plat, pratique pour un <datalist>
const MB_DESTINATIONS_FLAT = Object.values(MB_DESTINATIONS).flat();
