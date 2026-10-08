const translations = {
  it: {
    'nav.about': 'Chi sono',
    'nav.portfolio': 'Portfolio',
    'nav.campaigns': 'Campagne',
    'nav.contact': 'Contatti',
    'hero.eyebrow': 'Portfolio di modella',
    'hero.title': 'Ciao, sono Claudia.',
    'hero.lead': 'Questo è il mio spazio per condividere il mio percorso e i progetti a cui lavoro. Sto preparando nuove foto: le troverai qui presto.',
    'hero.primaryBtn': 'Guarda il portfolio',
    'hero.secondaryBtn': 'Contattami',
    'portfolio.eyebrow': 'Selezione',
    'portfolio.title': 'Editorial, beauty e movimento.',
    'placeholder.photos': 'Nuove foto in arrivo',
    'placeholder.portfolio': 'Le nuove immagini del portfolio saranno aggiunte dopo lo shooting.',
    'about.eyebrow': 'Chi sono',
    'about.title': 'Una nuova immagine, presto.',
    'about.p1': 'La biografia e le informazioni professionali saranno aggiunte dopo lo shooting.',
    'campaigns.eyebrow': 'Campagne',
    'campaigns.title': 'Collaborazioni recenti',
    'placeholder.campaigns': 'Le collaborazioni saranno aggiunte quando saranno disponibili i contenuti verificati.',
    'compcard.eyebrow': 'Comp card',
    'compcard.title': 'Comp card in aggiornamento',
    'compcard.text': 'La comp card scaricabile sara disponibile dopo lo shooting professionale.',
    'contact.eyebrow': 'Booking',
    'contact.title': 'Disponibile per fashion, beauty ed editorial.',
    'aboutPage.eyebrow': 'Chi sono',
    'aboutPage.title': 'Ciao, sono Claudia.',
    'aboutPage.intro': 'Sto preparando questa pagina per raccontarti qualcosa di più su di me e sul mio percorso. Aggiungerò qui la mia storia molto presto.',
    'footer.tag': 'Portfolio di modella'
  },
  en: {
    'nav.about': 'About',
    'nav.portfolio': 'Portfolio',
    'nav.campaigns': 'Campaigns',
    'nav.contact': 'Contact',
    'hero.eyebrow': 'Model portfolio',
    'hero.title': 'Hi, I’m Claudia.',
    'hero.lead': 'This is where I’ll share a little about my journey and the projects I’m working on. I’m getting new photos ready to share here soon.',
    'hero.primaryBtn': 'View portfolio',
    'hero.secondaryBtn': 'Get in touch',
    'portfolio.eyebrow': 'Selected work',
    'portfolio.title': 'Editorial, beauty, and movement.',
    'placeholder.photos': 'New photos coming soon',
    'placeholder.portfolio': 'New portfolio images will be added after the photo shoot.',
    'about.eyebrow': 'About',
    'about.title': 'A new look, coming soon.',
    'about.p1': 'Biography and professional information will be added after the photo shoot.',
    'campaigns.eyebrow': 'Campaigns',
    'campaigns.title': 'Recent collaborations',
    'placeholder.campaigns': 'Collaborations will be added when verified project details are available.',
    'compcard.eyebrow': 'Comp card',
    'compcard.title': 'Comp card coming soon',
    'compcard.text': 'The downloadable comp card will be available after the professional photo shoot.',
    'contact.eyebrow': 'Booking',
    'contact.title': 'Available for fashion, beauty, and editorial work.',
    'aboutPage.eyebrow': 'About me',
    'aboutPage.title': 'Hi, I’m Claudia.',
    'aboutPage.intro': 'I’m putting this page together to share a little more about myself and my journey. I’ll add my story here soon.',
    'footer.tag': 'Model portfolio'
  }
};

const langButtons = document.querySelectorAll('.lang-btn');
const i18nNodes = document.querySelectorAll('[data-i18n]');

function applyTranslations(lang) {
  const dict = translations[lang] || translations.it;

  i18nNodes.forEach((node) => {
    const key = node.dataset.i18n;
    const text = dict[key];

    if (!text) return;
    node.innerHTML = text;
  });

  document.documentElement.lang = lang;
  document.title = 'claudiapetrillimodel | Claudia Petrilli';
}

const defaultLang = localStorage.getItem('portfolio-lang') || 'it';
applyTranslations(defaultLang);

langButtons.forEach((button) => {
  const isActive = button.dataset.lang === defaultLang;
  button.classList.toggle('is-active', isActive);

  button.addEventListener('click', () => {
    const nextLang = button.dataset.lang;
    localStorage.setItem('portfolio-lang', nextLang);
    langButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.lang === nextLang));
    applyTranslations(nextLang);
  });
});

const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
const yearNode = document.querySelector('#year');

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('is-open');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}
