// ==========================================
// CAMPUS CLUBS DIRECTORY — SINGLE SOURCE OF TRUTH
// Add a club by adding one object below; set instagram/whatsapp to null
// (not an empty string) when no link exists yet — the render code treats
// null as "not linked" and disables that button automatically.
//
// `description` is a short paragraph shown when someone hovers a club
// card on the Clubs page — what the club is for and what to expect from
// it. Leave it as '' until you write one; cards with no description just
// show a plain "No description yet" hint on hover instead of breaking.
// ==========================================

export const CLUB_CATEGORIES = [
  {
    id: 'technical',
    label: 'Technical Cell',
    clubs: [
      { name: 'ACM (CSE)', instagram: 'https://www.instagram.com/acm_iitroorkee', whatsapp: null, description: 'The student chapter of the Association for Computing Machinery — runs coding contests, workshops, and speaker sessions for anyone interested in computer science, from beginners to competitive programmers.' },
      { name: 'AirSoc (Aerodynamics)', instagram: 'https://www.instagram.com/airsoc_iitr', whatsapp: null, description: '' },
      { name: 'ArIES (AI Transports)', instagram: 'https://www.instagram.com/ariesiitr', whatsapp: null, description: '' },
      { name: 'ASME (Mechanical)', instagram: 'https://www.instagram.com/asmeiitr', whatsapp: null, description: '' },
      { name: 'BlocSoc', instagram: 'https://www.instagram.com/blocsociitr', whatsapp: null, description: '' },
      { name: 'CIG', instagram: null, whatsapp: null, description: '' },
      { name: 'Design Studio', instagram: 'https://www.instagram.com/designstudio.iitr', whatsapp: null, description: '' },
      { name: 'DSG (Data Science)', instagram: 'https://www.instagram.com/dsgiitr', whatsapp: null, description: '' },
      { name: 'E-Cell', instagram: 'https://www.instagram.com/ecelliitr', whatsapp: null, description: 'The Entrepreneurship Cell — organizes startup bootcamps, pitch competitions, and networking events with founders and investors for students who want to build something of their own.' },
      { name: 'Enactus', instagram: 'https://www.instagram.com/enactus_iitroorkee', whatsapp: null, description: '' },
      { name: 'Finance Club', instagram: 'https://www.instagram.com/financeclub.iitr', whatsapp: null, description: '' },
      { name: 'iGEM (Biology)', instagram: 'https://www.instagram.com/igem_iitr', whatsapp: null, description: '' },
      { name: 'MotorSports', instagram: 'https://www.instagram.com/iitroorkeemotorsports', whatsapp: null, description: '' },
      { name: 'iMG (Tech Management)', instagram: 'https://www.instagram.com/img_iitr', whatsapp: null, description: '' },
      { name: 'InfoSec (Hacking)', instagram: 'https://www.instagram.com/infoseciitr', whatsapp: null, description: '' },
      { name: 'MaRS (Robotics)', instagram: 'https://www.instagram.com/mars_iitr', whatsapp: null, description: '' },
      { name: 'MdG Space', instagram: 'https://www.instagram.com/mdgspace', whatsapp: null, description: '' },
      { name: 'PaG (Programming)', instagram: 'https://www.instagram.com/pag_iitr', whatsapp: null, description: '' },
      { name: 'PaAC (Physics and Astronomy)', instagram: 'https://www.instagram.com/astro_iitr', whatsapp: null, description: '' },
      { name: 'QcG (Quantum Computing)', instagram: 'https://www.instagram.com/qcgiitr', whatsapp: null, description: '' },
      { name: 'RoboCon', instagram: 'https://www.instagram.com/roboconiitr', whatsapp: null, description: '' },
      { name: 'SaE (Automobiles)', instagram: 'https://www.instagram.com/sae_iitr', whatsapp: null, description: '' },
      { name: 'SdS Labs (Programming)', instagram: 'https://www.instagram.com/sdslabs', whatsapp: null, description: '' },
      { name: 'ShARE (Consulting and Analytics)', instagram: null, whatsapp: null, description: '' },
      { name: 'Team Knox (Automobile Building)', instagram: 'https://www.instagram.com/teamknox.iitr', whatsapp: null, description: '' },
      { name: 'Tinkering Lab', instagram: 'https://www.instagram.com/tinkering_lab_iitr', whatsapp: null, description: '' },
      { name: 'VlG (Programming)', instagram: 'https://www.instagram.com/vlgiitr', whatsapp: null, description: '' }
    ]
  },
  {
    id: 'cultural',
    label: 'Cultural Section',
    clubs: [
      { name: 'Audio Section', instagram: 'https://www.instagram.com/audiosection.iitr', whatsapp: null, description: '' },
      { name: 'Choreography and Dance', instagram: 'https://www.instagram.com/choreo.iitr', whatsapp: null, description: '' },
      { name: 'Cinema Club', instagram: 'https://www.instagram.com/cinema_club_iitr', whatsapp: null, description: '' },
      { name: 'Cinematic Section', instagram: 'https://www.instagram.com/cineseciitr', whatsapp: null, description: '' },
      { name: 'Culinary Club', instagram: 'https://www.instagram.com/culinaryclubiitr', whatsapp: null, description: '' },
      { name: 'DebSoc (Debating Society)', instagram: 'https://www.instagram.com/debsociitr', whatsapp: null, description: '' },
      { name: 'Dramatics Section', instagram: 'https://www.instagram.com/dramsiitr', whatsapp: null, description: '' },
      { name: 'Fine Arts', instagram: 'https://www.instagram.com/fineartsiitr', whatsapp: null, description: '' },
      { name: 'irMUN', instagram: 'https://www.instagram.com/ir_mun.s', whatsapp: null, description: '' },
      { name: 'Music Section', instagram: 'https://www.instagram.com/musicsectioniitr', whatsapp: null, description: '' },
      { name: 'onRec (Storytelling and Podcast)', instagram: 'https://www.instagram.com/iitr_onrec', whatsapp: null, description: '' },
      { name: 'Photography Club', instagram: 'https://www.instagram.com/photog_iitr', whatsapp: null, description: '' },
      { name: 'The Quizzing Section', instagram: 'https://www.instagram.com/quizzingiitr', whatsapp: null, description: '' },
      { name: 'SpicMacay', instagram: 'https://www.instagram.com/spic_macay_iitr', whatsapp: null, description: '' },
      { name: 'Standup Comedy', instagram: 'https://www.instagram.com/comedysection.iitr', whatsapp: null, description: '' }
    ]
  },
  {
    id: 'social',
    label: 'Social',
    clubs: [
      { name: 'CCF', instagram: 'https://www.instagram.com/ccf.india', whatsapp: null, description: '' },
      { name: 'ECO-IITR', instagram: 'https://www.instagram.com/eco_iitr', whatsapp: null, description: '' },
      { name: 'OutReach', instagram: 'https://www.instagram.com/outreachiitr', whatsapp: null, description: '' },
      { name: 'Qagaar', instagram: 'https://www.instagram.com/qagaariitr', whatsapp: null, description: '' },
      { name: 'UbA', instagram: 'https://www.instagram.com/uba.iitr', whatsapp: null, description: '' },
      { name: 'CRY', instagram: null, whatsapp: null, description: '' }
    ]
  },
  {
    id: 'magazines',
    label: 'Magazines',
    clubs: [
      { name: 'Geek Gazette', instagram: 'https://www.instagram.com/geek_gazette', whatsapp: null, description: '' },
      { name: 'Kshitij', instagram: 'https://www.instagram.com/kshitij_iitr', whatsapp: null, description: '' },
      { name: 'WatchOut', instagram: 'https://www.instagram.com/watchoutiitr', whatsapp: null, description: '' }
    ]
  },
  {
    id: 'branch',
    label: 'Branch Specific',
    clubs: [
      { name: 'AIChE (Chemical Engineering)', instagram: 'https://www.instagram.com/aiche_iitr', whatsapp: null, description: '' },
      { name: 'CEC (Civil Engineering)', instagram: 'https://www.instagram.com/cec_iitr', whatsapp: null, description: '' },
      { name: 'EcSS (Electronics and Communication)', instagram: 'https://www.instagram.com/ecss_iitr/', whatsapp: null, description: '' },
      { name: 'EeSS (Electrical Engineering)', instagram: 'https://www.instagram.com/eess.iitr', whatsapp: null, description: '' },
      { name: 'MieSS (Mechanical Engineering)', instagram: 'https://www.instagram.com/miess_iitr', whatsapp: null, description: '' }
    ]
  },
  {
    id: 'misc',
    label: 'Miscellaneous',
    clubs: [
      { name: 'ARP (Academic)', instagram: 'https://www.instagram.com/arp.iitr/', whatsapp: null, description: '' },
      { name: 'CDC', instagram: 'https://www.instagram.com/cdc_iitr/', whatsapp: null, description: '' },
      { name: 'ESports', instagram: 'https://www.instagram.com/iitresports', whatsapp: null, description: '' },
      { name: 'Himalayan Explorers Club', instagram: null, whatsapp: null, description: '' },
      { name: 'iARC (Alumni)', instagram: 'https://www.instagram.com/iarc_iitr/', whatsapp: null, description: '' },
      { name: 'P-Block (Product Management)', instagram: 'https://www.instagram.com/pblock__iitr', whatsapp: null, description: '' },
      { name: 'PiC (Placement)', instagram: null, whatsapp: null, description: '' },
      { name: 'SMP (Student Mentorship)', instagram: 'https://www.instagram.com/smp_iitr', whatsapp: null, description: '' },
      { name: 'Wellness Centre', instagram: 'https://www.instagram.com/wellnessiitr', whatsapp: null, description: '' }
    ]
  }
];