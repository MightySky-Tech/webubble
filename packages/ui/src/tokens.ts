// Generated from packages/ui/tokens/tokens.json by build-tokens.mjs. Do not edit.
export const tokens = {
  "color": {
    "light": {
      "bg": "#FFFFFF",
      "surface": "#F4F5F7",
      "text": "#16181D",
      "textMuted": "#4A5160",
      "border": "#7A8394",
      "primary": "#1F5FBF",
      "onPrimary": "#FFFFFF",
      "danger": "#B42318",
      "onDanger": "#FFFFFF",
      "success": "#18794E",
      "focus": "#1F5FBF"
    },
    "dark": {
      "bg": "#121418",
      "surface": "#1C1F26",
      "text": "#F2F4F7",
      "textMuted": "#B4BCC8",
      "border": "#7D8597",
      "primary": "#7FAEF5",
      "onPrimary": "#0B1830",
      "danger": "#F97066",
      "onDanger": "#2A0A07",
      "success": "#47CD89",
      "focus": "#7FAEF5"
    }
  },
  "space": {
    "0": 0,
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 24,
    "6": 32,
    "7": 48,
    "8": 64
  },
  "radius": {
    "sm": 4,
    "md": 8,
    "lg": 12,
    "full": 9999
  },
  "fontSize": {
    "xs": 12,
    "sm": 14,
    "md": 16,
    "lg": 18,
    "xl": 22,
    "xxl": 28,
    "xxxl": 34
  },
  "fontWeight": {
    "regular": 400,
    "medium": 500,
    "bold": 700
  },
  "lineHeight": {
    "tight": 1.25,
    "normal": 1.5
  },
  "size": {
    "touchTarget": 48,
    "borderWidth": 1,
    "focusRingWidth": 3
  },
  "breakpoint": {
    "sm": 480,
    "md": 768,
    "lg": 1024,
    "xl": 1280
  }
} as const;

export type ColorToken = keyof typeof tokens.color.light;
