// Single source of truth for the guided tasting-note pill options.
// Kept deliberately small so a tasting can be logged in seconds.

export interface PillGroup {
  key: string
  label: string
  hint?: string
  multi?: boolean
  options: string[]
}

export interface TastingStep {
  key: 'appearance' | 'nose' | 'palate' | 'finish'
  title: string
  emoji: string
  blurb: string
  groups: PillGroup[]
}

export const TASTING_STEPS: TastingStep[] = [
  {
    key: 'appearance',
    title: 'Appearance',
    emoji: '👁️',
    blurb: 'Hold it to the light.',
    groups: [
      {
        key: 'colour',
        label: 'Colour',
        options: [
          'Water White',
          'Pale Straw',
          'White Wine',
          'Pale Gold',
          'Golden',
          'Honeyed',
          'Old Gold',
          'Amber',
          'Burnished Copper',
          'Tawny',
          'Chestnut',
          'Russet',
          'Mahogany',
          'Deep Treacle',
        ],
      },
      {
        key: 'clarity',
        label: 'Clarity',
        options: [
          'Star-Bright',
          'Crystal Clear',
          'Gin-Clear',
          'Limpid',
          'Faintly Veiled',
          'Hazy',
          'Cloudy',
        ],
      },
    ],
  },
  {
    key: 'nose',
    title: 'Nose',
    emoji: '👃',
    blurb: 'Give it a gentle swirl and sniff.',
    groups: [
      {
        key: 'intensity',
        label: 'Intensity',
        options: ['Light', 'Medium', 'Pronounced', 'Powerful'],
      },
      {
        key: 'aromas',
        label: 'Aromas',
        hint: 'Pick any that fit',
        multi: true,
        options: ['Fruit', 'Floral', 'Honey', 'Vanilla', 'Smoke', 'Spice', 'Oak', 'Butter', 'Toast'],
      },
    ],
  },
  {
    key: 'palate',
    title: 'Palate',
    emoji: '👅',
    blurb: 'Let it sit on the tongue.',
    groups: [
      {
        key: 'sweetness',
        label: 'Sweetness',
        options: ['Bone Dry', 'Dry', 'Medium', 'Sweet'],
      },
      {
        key: 'body',
        label: 'Body',
        options: ['Light', 'Medium', 'Full', 'Oily'],
      },
    ],
  },
  {
    key: 'finish',
    title: 'Finish',
    emoji: '🔥',
    blurb: 'How long does it linger?',
    groups: [
      {
        key: 'length',
        label: 'Length',
        options: ['Short', 'Medium', 'Long', 'Very Long', 'Endless'],
      },
    ],
  },
]

// Emoji map for aroma pills to add a touch of character.
export const AROMA_EMOJI: Record<string, string> = {
  Fruit: '🍑',
  Floral: '🌸',
  Honey: '🍯',
  Vanilla: '🍦',
  Smoke: '💨',
  Spice: '🌶️',
  Oak: '🪵',
  Butter: '🧈',
  Toast: '🍞',
}

export const COLOUR_SWATCH: Record<string, string> = {
  'Water White': '#f7f3df',
  'Pale Straw': '#f3e9bf',
  'White Wine': '#efe3a3',
  'Pale Gold': '#eed789',
  Golden: '#e9c46a',
  Honeyed: '#e5b455',
  'Old Gold': '#dca63f',
  Amber: '#d9922b',
  'Burnished Copper': '#c1732f',
  Tawny: '#b4652e',
  Chestnut: '#9e5228',
  Russet: '#8f4a24',
  Mahogany: '#7c3f1d',
  'Deep Treacle': '#5f2f16',
}
