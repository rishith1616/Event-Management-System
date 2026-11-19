/**
 * services/eventImages.js — Curated Unsplash images for PES University campus clubs & fests.
 */

const PES_CLUB_IMAGES = {
  aatmatrisha: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80', // Massive concert pro-nite
  equinox: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80', // Deep space galaxy & rockets
  robotics: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80', // High-tech robotics & AI
  samarpana: 'https://images.unsplash.com/photo-1514533212735-5df27d970db0?auto=format&fit=crop&w=1200&q=80', // Cultural heritage & Indian arts
  gcube: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80', // Esports & game development
  trance: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1200&q=80', // Western dance battle stage
  sanskriti: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80', // Classical Indian dance performance
  ecell: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80', // E-Summit startup pitching
  qforest: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80', // Quantum physics & laser grid
  hopes: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80', // Professional camera lens & photowalk
  aura: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80', // GenAI neural network
  shunya: 'https://images.unsplash.com/photo-1635070041409-e63e783ee3c1?auto=format&fit=crop&w=1200&q=80', // Math fractal matrix
  munsoc: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80', // Model United Nations diplomacy
  music: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80', // Live acoustic band amphitheatre
};

export const getEventImage = (event) => {
  if (event?.imageUrl && event.imageUrl.startsWith('http')) {
    return event.imageUrl;
  }

  const title = (event?.title || '').toLowerCase();
  const desc = (event?.description || '').toLowerCase();
  const organizer = (event?.organizer?.name || '').toLowerCase();
  const fullText = `${title} ${desc} ${organizer}`;

  // Club & Fest matching
  if (fullText.includes('aatmatrisha') || fullText.includes('pro-nite') || fullText.includes('comedy')) {
    return PES_CLUB_IMAGES.aatmatrisha;
  }
  if (fullText.includes('equinox') || fullText.includes('space') || fullText.includes('astronomy') || fullText.includes('cansat')) {
    return PES_CLUB_IMAGES.equinox;
  }
  if (fullText.includes('robotics') || fullText.includes('ieee') || fullText.includes('drone') || fullText.includes('robowar')) {
    return PES_CLUB_IMAGES.robotics;
  }
  if (fullText.includes('samarpana') || fullText.includes('heritage') || fullText.includes('folk')) {
    return PES_CLUB_IMAGES.samarpana;
  }
  if (fullText.includes('gcube') || fullText.includes('game') || fullText.includes('unity') || fullText.includes('unreal')) {
    return PES_CLUB_IMAGES.gcube;
  }
  if (fullText.includes('trance') || fullText.includes('hip-hop') || fullText.includes('western dance')) {
    return PES_CLUB_IMAGES.trance;
  }
  if (fullText.includes('sanskriti') || fullText.includes('classical dance') || fullText.includes('bharatanatyam')) {
    return PES_CLUB_IMAGES.sanskriti;
  }
  if (fullText.includes('ecell') || fullText.includes('e-cell') || fullText.includes('startup') || fullText.includes('venture') || fullText.includes('shark tank')) {
    return PES_CLUB_IMAGES.ecell;
  }
  if (fullText.includes('qforest') || fullText.includes('quantum') || fullText.includes('qiskit')) {
    return PES_CLUB_IMAGES.qforest;
  }
  if (fullText.includes('hopes') || fullText.includes('photowalk') || fullText.includes('photography') || fullText.includes('monochrome')) {
    return PES_CLUB_IMAGES.hopes;
  }
  if (fullText.includes('aura') || fullText.includes('genai') || fullText.includes('llm') || fullText.includes('artificial intelligence')) {
    return PES_CLUB_IMAGES.aura;
  }
  if (fullText.includes('shunya') || fullText.includes('math') || fullText.includes('cryptography') || fullText.includes('olympiad')) {
    return PES_CLUB_IMAGES.shunya;
  }
  if (fullText.includes('munsoc') || fullText.includes('model un') || fullText.includes('diplomacy') || fullText.includes('summit')) {
    return PES_CLUB_IMAGES.munsoc;
  }
  if (fullText.includes('music club') || fullText.includes('acoustic') || fullText.includes('rock') || fullText.includes('band')) {
    return PES_CLUB_IMAGES.music;
  }

  // Fallback hash
  const keys = Object.keys(PES_CLUB_IMAGES);
  const hashKey = (event?._id || event?.title || '0').toString();
  let sum = 0;
  for (let i = 0; i < hashKey.length; i++) {
    sum += hashKey.charCodeAt(i);
  }
  return PES_CLUB_IMAGES[keys[sum % keys.length]];
};
