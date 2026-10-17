const translations = {
  it: {
    'nav.about': 'Chi sono',
    'nav.portfolio': 'Portfolio',
    'nav.campaigns': 'Campagne',
    'nav.compcard': 'Comp card',
    'nav.contact': 'Contatti',
    'hero.eyebrow': 'Portfolio di modella',
    'hero.title': 'Ciao, sono Claudia.',
    'hero.lead': 'Uno sguardo più da vicino al mio lavoro, ai miei progetti e alla mia visione come modella e creator.',
    'hero.primaryBtn': 'Guarda il portfolio',
    'hero.secondaryBtn': 'Contattami',
    'carousel.label': 'Galleria fotografica',
    'carousel.previous': 'Foto precedente',
    'carousel.next': 'Foto successiva',
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
    'compcard.title': 'La mia comp card digitale',
    'compcard.text': 'Apri la comp card su Canva. Puoi modificarla dal tuo account Canva; il download è disponibile se consentito dalle impostazioni di condivisione.',
    'compcard.open': 'Apri la comp card',
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
    'aboutPage.intro': 'Sto costruendo il mio percorso nel modeling con curiosità e attenzione. Mi interessano fashion, beauty, progetti editoriali e campagne commercial e lifestyle: mondi diversi, uniti dal racconto delle persone e dello stile.',
    'aboutPage.detailsEyebrow': 'Profilo',
    'aboutPage.detailsTitle': 'Informazioni',
    'aboutPage.height': 'Altezza',
    'aboutPage.city': 'Città',
    'aboutPage.cityValue': 'Roma, Italia',
    'aboutPage.languages': 'Lingue',
    'aboutPage.languagesValue': 'Italiano e inglese',
    'aboutPage.measurements': 'Misure',
    'aboutPage.measurementsValue': 'Busto: 97 cm, vita: 71 cm, fianchi: 93 cm',
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
    'nav.compcard': 'Comp card',
    'nav.contact': 'Contact',
    'hero.eyebrow': 'Model portfolio',
    'hero.title': 'Hi, I’m Claudia.',
    'hero.lead': 'A closer look at my work, projects and direction as a model and creator.',
    'hero.primaryBtn': 'View portfolio',
    'hero.secondaryBtn': 'Get in touch',
    'carousel.label': 'Photo gallery',
    'carousel.previous': 'Previous photo',
    'carousel.next': 'Next photo',
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
    'compcard.title': 'My digital comp card',
    'compcard.text': 'Open the comp card on Canva. You can edit it from your Canva account; downloading is available if enabled in the sharing settings.',
    'compcard.open': 'Open the comp card',
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
    'aboutPage.intro': 'I’m building my path in modeling with curiosity and care. I’m interested in fashion, beauty, editorial work, and commercial and lifestyle campaigns—different worlds connected by the way they tell stories about people and style.',
    'aboutPage.detailsEyebrow': 'Profile',
    'aboutPage.detailsTitle': 'Details',
    'aboutPage.height': 'Height',
    'aboutPage.city': 'City',
    'aboutPage.cityValue': 'Rome, Italy',
    'aboutPage.languages': 'Languages',
    'aboutPage.languagesValue': 'Italian and English',
    'aboutPage.measurements': 'Measurements',
    'aboutPage.measurementsValue': 'Bust: 97 cm, waist: 71 cm, hips: 93 cm',
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

  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    carousel.setAttribute('aria-label', dict['carousel.label']);
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

const carousel = document.querySelector('[data-carousel]');

if (carousel) {
  const track = carousel.querySelector('[data-carousel-track]');
  const slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
  const status = carousel.querySelector('[data-carousel-status]');
  let currentSlide = 0;

  const showSlide = (index) => {
    currentSlide = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    slides.forEach((slide, slideIndex) => {
      slide.setAttribute('aria-hidden', String(slideIndex !== currentSlide));
    });
    status.textContent = `${currentSlide + 1} / ${slides.length}`;
  };

  carousel.querySelector('[data-carousel-prev]').addEventListener('click', () => {
    showSlide(currentSlide - 1);
  });
  carousel.querySelector('[data-carousel-next]').addEventListener('click', () => {
    showSlide(currentSlide + 1);
  });

  let pointerStartX = null;
  carousel.addEventListener('pointerdown', (event) => {
    pointerStartX = event.clientX;
  });
  carousel.addEventListener('pointerup', (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(distance) < 50) return;
    showSlide(currentSlide + (distance < 0 ? 1 : -1));
  });
  carousel.addEventListener('pointercancel', () => {
    pointerStartX = null;
  });

  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') showSlide(currentSlide - 1);
    if (event.key === 'ArrowRight') showSlide(currentSlide + 1);
  });

  showSlide(0);
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
