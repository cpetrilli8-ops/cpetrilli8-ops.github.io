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
    'contactBooking.eyebrow': 'Contatti & Booking',
    'contactBooking.title': 'Parliamo del tuo prossimo progetto.',
    'contactForm.name': 'Nome',
    'contactForm.email': 'Email',
    'contactForm.profession': 'Agenzia, brand o professione',
    'contactForm.message': 'Messaggio',
    'contactForm.submit': 'Invia richiesta',
    'aboutPage.eyebrow': 'Chi sono',
    'aboutPage.title': 'Claudia Petrilli',
    'aboutPage.intro': 'Sto costruendo il mio percorso nel modeling con curiosità e attenzione. Mi interessano fashion, beauty, e-commerce e campagne commercial e lifestyle: mondi diversi, uniti dal racconto delle persone e dello stile.',
    'aboutPage.detailsEyebrow': 'Profilo',
    'aboutPage.detailsTitle': 'Informazioni',
    'aboutPage.height': 'Altezza',
    'aboutPage.city': 'Città',
    'aboutPage.languages': 'Lingue',
    'aboutPage.measurements': 'Misure',
    'aboutPage.experience': 'Esperienze',
    'aboutPage.contact': 'Contatti professionali',
    'aboutPage.placeholder': '[Da inserire]',
    'aboutPage.experiencePlaceholder': '[Da completare]',
    'aboutPage.contactPlaceholder': '[Email / agenzia da inserire]',
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
    'contactBooking.eyebrow': 'Contact & Booking',
    'contactBooking.title': 'Let’s talk about your next project.',
    'contactForm.name': 'Name',
    'contactForm.email': 'Email',
    'contactForm.profession': 'Agency, brand, or profession',
    'contactForm.message': 'Message',
    'contactForm.submit': 'Send inquiry',
    'aboutPage.eyebrow': 'About me',
    'aboutPage.title': 'Claudia Petrilli',
    'aboutPage.intro': 'I’m building my path in modeling with curiosity and care. I’m interested in fashion, beauty, e-commerce, and commercial and lifestyle campaigns—different worlds connected by the way they tell stories about people and style.',
    'aboutPage.detailsEyebrow': 'Profile',
    'aboutPage.detailsTitle': 'Details',
    'aboutPage.height': 'Height',
    'aboutPage.city': 'City',
    'aboutPage.languages': 'Languages',
    'aboutPage.measurements': 'Measurements',
    'aboutPage.experience': 'Experience',
    'aboutPage.contact': 'Professional contact',
    'aboutPage.placeholder': '[To be added]',
    'aboutPage.experiencePlaceholder': '[To be completed]',
    'aboutPage.contactPlaceholder': '[Email / agency to be added]',
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
  document.title = document.body.dataset.page === 'about'
    ? `${dict['aboutPage.eyebrow']} | claudiapetrillimodel`
    : 'claudiapetrillimodel | Claudia Petrilli';
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

const contactForm = document.querySelector('#contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const profession = String(formData.get('profession') || '').trim();
    const message = String(formData.get('message') || '').trim();
    const body = [
      `Nome: ${name}`,
      `Email: ${email}`,
      `Agenzia, brand o professione: ${profession || '-'}`,
      '',
      'Messaggio:',
      message
    ].join('\n');
    const subject = 'Richiesta di collaborazione — Claudia Petrilli';
    const mailto = `mailto:claudiapetrilli8@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  });
}
