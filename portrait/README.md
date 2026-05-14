# ChromaMe Portrait

Mobile portrait version of the AI Photobooth application. A pixel-perfect implementation based on Figma design exports.

## Features

- **Landing Screen**: Gradient background with animated orbs, mode selection cards
- **Camera Screen**: Photo capture with countdown timer and frame overlay
- **AI Analysis**: Animated processing with progress indicator
- **Outfit Selection**: Tab-based gender/category filtering, outfit grid
- **Try-On Processing**: Visual feedback during AI processing
- **Results Screen**: Download and retry functionality
- **Color Analysis**: Season, undertone, contrast detection with color palette

## Screens Implemented

1. **Landing** - Entry point with mode selection
2. **Camera** - Photo capture interface
3. **Analysis Processing** - Loading state with animations
4. **Outfit Selection** - Browse and select outfits
5. **Try-On Processing** - AI outfit fitting animation
6. **Results** - View and download generated photo
7. **Analysis Results** - Color analysis details and recommendations

## Tech Stack

- HTML5
- CSS3 (Custom properties, Grid, Flexbox, Animations)
- Vanilla JavaScript (ES6+)
- MediaDevices API (Camera)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or open directly in browser
open index.html
```

## Design System

### Colors
- Background: `#0f0f1a` to `#1a1a2e`
- Primary Accent: `#6366f1`
- Secondary Accent: `#8b5cf6`
- Text Primary: `#ffffff`
- Text Secondary: `rgba(255, 255, 255, 0.7)`

### Typography
- Font Family: System UI stack (-apple-system, BlinkMacSystemFont, etc.)
- Base Size: 16px
- Scale: 0.625rem to 2.5rem

### Spacing
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px
- XXL: 48px

### Border Radius
- SM: 8px
- MD: 12px
- LG: 16px
- XL: 24px
- Full: 9999px

## File Structure

```
portrait/
├── index.html          # Main HTML with all screens
├── css/
│   └── portrait.css    # Complete styling
├── js/
│   └── portrait.js     # Interactions & logic
├── assets/             # Images and icons
├── package.json
└── README.md
```

## Browser Support

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- iOS Safari 14+
- Chrome Android 90+

## Notes

This is a frontend implementation with mock data. For production use, integrate with:
- AI Color Analysis API
- Virtual Try-On API
- Image processing backend

Based on Figma design exports from:
- Frame 281-284: Landing & Camera
- Frame 289-293: Processing & Selection
- Frame 294-300: Results & Analysis
