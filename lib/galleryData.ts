export interface CharacterTextureAsset {
  id: string;
  codename: string;
  name: string;
  role: string;
  district: string;
  coordinates: string;
  imagePath: string;
  resolution: string;
  shaderProfile: string;
  fabricFinish: string;
  wantedLevel: number;
  bounty: string;
  accentHex: string;
  secondaryHex: string;
  hudTagline: string;
  materialNotes: string;
  pbrSpecs: {
    roughness: string;
    sheen: string;
    weaveDensity: string;
    specularTint: string;
  };
}

export type LightingMoodId = 'vice-dusk' | 'neon-midnight' | 'steam-glow';

export interface LightingMood {
  id: LightingMoodId;
  label: string;
  description: string;
  bgHex: string;
  fogHex: string;
  fogDensity: number;
  keyColor: string;
  keyIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  neonPinkColor: string;
  neonPinkIntensity: number;
  neonCyanColor: string;
  neonCyanIntensity: number;
  vanityColor: string;
  vanityIntensity: number;
}

export type CameraPresetId = 'hero' | 'wide' | 'mirror' | 'macro';

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const CHARACTER_TEXTURES: CharacterTextureAsset[] = [
  {
    id: 'lucia',
    codename: 'VC-01',
    name: 'Lucia Caminos',
    role: 'Ocean Beach Lead',
    district: 'OCEAN BEACH · LEONIDA',
    coordinates: '25.7825° N, 80.1304° W',
    imagePath: '/textures/vice_lucia.jpg',
    resolution: '4096 × 5460 · 16-bit sRGB',
    shaderProfile: 'Anisotropic Leather + Neon Rim',
    fabricFinish: 'Satin-Weave Shower Vinyl',
    wantedLevel: 3,
    bounty: '$485,200',
    accentHex: '#ff4fd8',
    secondaryHex: '#2ee7ff',
    hudTagline: 'HIGH HEAT · OCEAN DRIVE',
    materialNotes:
      'High-contrast twilight key art mapping full-grain moto leather speculars, gold hoop micro-reflections, and wet asphalt neon bounce onto reactive shower-curtain drapery.',
    pbrSpecs: {
      roughness: '0.46 (Micro-Weave)',
      sheen: '0.78 Magenta Edge',
      weaveDensity: '320 GSM Matte Vinyl',
      specularTint: '#ff6ae4',
    },
  },
  {
    id: 'jason',
    codename: 'VC-02',
    name: 'Jason Duval',
    role: 'Vice Keys Drifter',
    district: 'STARFISH MOTEL · VICE KEYS',
    coordinates: '25.7617° N, 80.1918° W',
    imagePath: '/textures/vice_jason.jpg',
    resolution: '4096 × 5460 · 16-bit sRGB',
    shaderProfile: 'Cotton Slub + Humid Specular',
    fabricFinish: 'Heavy Translucent Duck Cloth',
    wantedLevel: 2,
    bounty: '$210,750',
    accentHex: '#2ee7ff',
    secondaryHex: '#ff6b9e',
    hudTagline: 'MOTEL SAFEHSE · COASTAL PALMS',
    materialNotes:
      'Detailed floral rayon print and ribbed cotton tank folds balanced against hot motel tube glow, showcasing subtle cloth cavity shadowing across deep curtain pleats.',
    pbrSpecs: {
      roughness: '0.58 (Organic Cotton)',
      sheen: '0.62 Cyan Rim',
      weaveDensity: '280 GSM Heavy Canvas',
      specularTint: '#5ef2ff',
    },
  },
  {
    id: 'valerie',
    codename: 'VC-03',
    name: 'Valerie Vance',
    role: 'Club Odyssey Wheelman',
    district: 'WASHINGTON BEACH · ART DECO',
    coordinates: '25.7743° N, 80.1342° W',
    imagePath: '/textures/vice_valerie.jpg',
    resolution: '4096 × 5460 · 16-bit sRGB',
    shaderProfile: 'Iridescent Visor + White Linen',
    fabricFinish: 'Pearlescent Wet-Look Curtain',
    wantedLevel: 4,
    bounty: '$920,400',
    accentHex: '#b45cff',
    secondaryHex: '#22e6ff',
    hudTagline: 'NIGHTLIFE SYNDICATE · VIP',
    materialNotes:
      'Crisp white Art Deco blazer tailoring paired with holographic visor refraction and wet boulevard magenta highlights for extreme dynamic range under dim bathroom neon.',
    pbrSpecs: {
      roughness: '0.38 (Pearl Satin)',
      sheen: '0.88 Violet Chrome',
      weaveDensity: '340 GSM Coated Linen',
      specularTint: '#c985ff',
    },
  },
  {
    id: 'mateo',
    codename: 'VC-04',
    name: 'Mateo Solis',
    role: 'Bayshore Penthouse Broker',
    district: 'VICE POINT · BAYSHORE',
    coordinates: '25.7907° N, 80.1286° W',
    imagePath: '/textures/vice_mateo.jpg',
    resolution: '4096 × 5460 · 16-bit sRGB',
    shaderProfile: 'Midnight Silk Jacquard + Gold',
    fabricFinish: 'Dark Luxury Jacquard Drape',
    wantedLevel: 5,
    bounty: '$2,450,000',
    accentHex: '#ff9d3b',
    secondaryHex: '#ff4fd8',
    hudTagline: 'MOST WANTED · PENTHOUSE',
    materialNotes:
      'Deep sapphire jacquard silk florals with sunset amber rim highlights and turquoise bay backdrop engineered to emphasize fold depth and chromatic glitch dispersion.',
    pbrSpecs: {
      roughness: '0.42 (Silk Sheen)',
      sheen: '0.84 Sunset Amber',
      weaveDensity: '310 GSM Jacquard Vinyl',
      specularTint: '#ffb25c',
    },
  },
  {
    id: 'david',
    codename: 'VC-05',
    name: 'David Haz',
    role: 'Canvas UI Architect',
    district: 'VICE BEACH · SHADER DISTRICT',
    coordinates: '25.7862° N, 80.1300° W',
    imagePath: '/textures/vice_david.jpg',
    resolution: '4096 × 5460 · 16-bit sRGB',
    shaderProfile: 'WebGL Cloth + Neon Rim',
    fabricFinish: 'Custom html-in-canvas Weave',
    wantedLevel: 5,
    bounty: '$6,157,000',
    accentHex: '#2ee7ff',
    secondaryHex: '#ff4fd8',
    hudTagline: 'CREATOR EDITION · CANVAS UI',
    materialNotes:
      'Signature midnight resort camp-shirt key art lit by dual Ocean Drive cyan and magenta tubes, crafted as a tribute to David Haz and the Canvas UI Cloth component.',
    pbrSpecs: {
      roughness: '0.44 (GPU Cloth)',
      sheen: '0.92 Electric Cyan',
      weaveDensity: '360 GSM WebGL Weave',
      specularTint: '#2ee7ff',
    },
  },
];

export const LIGHTING_MOODS: LightingMood[] = [
  {
    id: 'vice-dusk',
    label: 'Vice Dusk',
    description: 'Signature sunset magenta & tropical cyan dim bathroom neon',
    bgHex: '#090612',
    fogHex: '#090612',
    fogDensity: 0.052,
    keyColor: '#f5c2eb',
    keyIntensity: 0.92,
    hemiSky: '#583b9c',
    hemiGround: '#130b1f',
    hemiIntensity: 0.68,
    neonPinkColor: '#ff28ae',
    neonPinkIntensity: 9.2,
    neonCyanColor: '#0ce5ff',
    neonCyanIntensity: 8.4,
    vanityColor: '#ff9d66',
    vanityIntensity: 3.8,
  },
  {
    id: 'neon-midnight',
    label: 'Neon Midnight',
    description: 'Deep electric cyan club glow with razor magenta rim highlights',
    bgHex: '#050811',
    fogHex: '#050811',
    fogDensity: 0.058,
    keyColor: '#a6e7ff',
    keyIntensity: 0.78,
    hemiSky: '#1d4f7a',
    hemiGround: '#0a0714',
    hemiIntensity: 0.62,
    neonPinkColor: '#ff1f96',
    neonPinkIntensity: 10.2,
    neonCyanColor: '#00ecff',
    neonCyanIntensity: 11.0,
    vanityColor: '#6f5cff',
    vanityIntensity: 3.2,
  },
  {
    id: 'steam-glow',
    label: 'Steam Glow',
    description: 'Warm motel amber vanity light cutting through humid violet haze',
    bgHex: '#100811',
    fogHex: '#100811',
    fogDensity: 0.064,
    keyColor: '#ffd4a3',
    keyIntensity: 1.05,
    hemiSky: '#874c78',
    hemiGround: '#160c14',
    hemiIntensity: 0.74,
    neonPinkColor: '#ff4f86',
    neonPinkIntensity: 7.8,
    neonCyanColor: '#3cd0e8',
    neonCyanIntensity: 5.8,
    vanityColor: '#ff943b',
    vanityIntensity: 5.8,
  },
];

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'hero',
    label: 'Curtain Hero',
    position: [0.22, 1.56, 3.48],
    target: [0.0, 1.48, -0.32],
    fov: 46,
  },
  {
    id: 'wide',
    label: 'Bathroom Wide',
    position: [-1.28, 1.66, 3.92],
    target: [0.18, 1.42, -0.45],
    fov: 50,
  },
  {
    id: 'mirror',
    label: 'Vanity Angle',
    position: [1.52, 1.64, 3.05],
    target: [-0.32, 1.5, -0.2],
    fov: 48,
  },
  {
    id: 'macro',
    label: 'Texture Macro',
    position: [0.04, 1.54, 1.88],
    target: [0.0, 1.52, -0.32],
    fov: 38,
  },
];
