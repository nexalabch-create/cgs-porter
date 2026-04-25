// Lightweight stroke icons matching iOS feel
export const Icon = {
  Pin: ({ size = 16, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12Z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  ),
  Bag: ({ size = 16, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14l-1 12H6L5 8Z"/>
      <path d="M9 8V6a3 3 0 0 1 6 0v2"/>
    </svg>
  ),
  Phone: ({ size = 16, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h3l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>
    </svg>
  ),
  Building: ({ size = 16, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1.5"/>
      <path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2"/>
    </svg>
  ),
  Cash: ({ size = 16, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2"/>
      <circle cx="12" cy="12" r="2.5"/>
      <path d="M6 9v.01M18 15v.01"/>
    </svg>
  ),
  Plane: ({ size = 16, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 1 0-3 0V9l-8 5v2l8-2.5V19l-2.5 1.5V22L12 21l3.5 1.5V20.5L13 19v-5.5l8 2.5Z"/>
    </svg>
  ),
  Clock: ({ size = 16, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </svg>
  ),
  ChevronLeft: ({ size = 22, color = 'currentColor', stroke = 2 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6"/>
    </svg>
  ),
  ChevronRight: ({ size = 18, color = 'currentColor', stroke = 2 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6"/>
    </svg>
  ),
  Mail: ({ size = 18, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <path d="M3 7l9 6 9-6"/>
    </svg>
  ),
  Lock: ({ size = 18, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2"/>
      <path d="M8 11V8a4 4 0 1 1 8 0v3"/>
    </svg>
  ),
  Eye: ({ size = 18, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Plus: ({ size = 18, color = 'currentColor', stroke = 2.4 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  Minus: ({ size = 18, color = 'currentColor', stroke = 2.4 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round">
      <path d="M5 12h14"/>
    </svg>
  ),
  Calendar: ({ size = 16, color = 'currentColor', stroke = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M3 9h18M8 3v4M16 3v4"/>
    </svg>
  ),
  Inbox: ({ size = 32, color = 'currentColor', stroke = 1.6 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13l3-7h12l3 7"/>
      <path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/>
      <path d="M3 13h5l1 2h6l1-2h5"/>
    </svg>
  ),
};
