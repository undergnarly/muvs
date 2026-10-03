// Same Urbanist Latin weights formerly requested from @fontsource/urbanist
// 5.0.16 on jsDelivr. Inline URLs keep Drei's initial font suspension local to
// the loaded bundle, so a third-party font outage cannot blank the 3D menu.
// The unmodified font files retain their SIL OFL license in assets/fonts.
import regularFont from '../assets/fonts/Urbanist500.woff?inline';
import boldFont from '../assets/fonts/Urbanist700.woff?inline';

export const FONT_REGULAR = regularFont;
export const FONT_BOLD = boldFont;
