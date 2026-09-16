/* Shared inline icon set for the music app (`pages/music/`). */

const SvgStroke = function ({ children, size = 20 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
};

export const IconPlay = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M8.2 5.6a1.2 1.2 0 0 1 1.83-1.02l10.1 6.4a1.2 1.2 0 0 1 0 2.03l-10.1 6.4A1.2 1.2 0 0 1 8.2 18.4z" />
    </svg>
);

export const IconPause = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="6" y="4.5" width="4.2" height="15" rx="1.6" />
        <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.6" />
    </svg>
);

export const IconPrev = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="4" y="5.4" width="2.4" height="13.2" rx="1.2" />
        <path d="M20 7v10a1.1 1.1 0 0 1-1.7.92l-7.6-5a1.1 1.1 0 0 1 0-1.84l7.6-5A1.1 1.1 0 0 1 20 7z" />
    </svg>
);

export const IconNext = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="17.6" y="5.4" width="2.4" height="13.2" rx="1.2" />
        <path d="M4 7v10a1.1 1.1 0 0 0 1.7.92l7.6-5a1.1 1.1 0 0 0 0-1.84l-7.6-5A1.1 1.1 0 0 0 4 7z" />
    </svg>
);

export const IconShuffle = () => (
    <SvgStroke size={18}>
        <path d="M16 3h5v5" />
        <path d="M4 20L21 3" />
        <path d="M21 16v5h-5" />
        <path d="M15 15l6 6" />
        <path d="M4 4l5 5" />
    </SvgStroke>
);

export const IconRepeat = () => (
    <SvgStroke size={18}>
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </SvgStroke>
);

export const IconRepeatOne = () => (
    <SvgStroke size={18}>
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        <path d="M11.5 10.2l1.6-1v5.6" strokeWidth="1.8" />
    </SvgStroke>
);

export const IconSearch = () => (
    <SvgStroke size={16}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
    </SvgStroke>
);

export const IconSun = () => (
    <SvgStroke size={17}>
        <circle cx="12" cy="12" r="4.4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4L19 19M19 5l-1.6 1.6M6.6 17.4L5 19" />
    </SvgStroke>
);

export const IconMoon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21 12.8A8.6 8.6 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8z" />
    </svg>
);

export const IconFolder = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h3.6a2 2 0 0 1 1.56.75l1 1.25h6.84A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
    </svg>
);

export const IconRefresh = () => (
    <SvgStroke size={16}>
        <path d="M21.5 4v5h-5" />
        <path d="M2.5 20v-5h5" />
        <path d="M4.6 9a8 8 0 0 1 13.3-3.2L21.5 9M2.5 15l3.6 3.2A8 8 0 0 0 19.4 15" />
    </SvgStroke>
);

export const IconNote = () => (
    <SvgStroke size={18}>
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
    </SvgStroke>
);

// Three beamed notes — the app's / list tab's mark, closer to the reference.
export const IconNoteList = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="8.6" y="2.6" width="2.3" height="13.4" rx="1.15" />
        <rect x="15.6" y="4.6" width="2.3" height="11.4" rx="1.15" />
        <ellipse cx="6.6" cy="17.2" rx="3.5" ry="3.1" transform="rotate(-18 6.6 17.2)" />
        <ellipse cx="13.6" cy="19.2" rx="3.5" ry="3.1" transform="rotate(-18 13.6 19.2)" />
        <ellipse cx="20.6" cy="20.4" rx="3.5" ry="3.1" transform="rotate(-18 20.6 20.4)" />
    </svg>
);

export const IconPerson = () => (
    <SvgStroke size={22}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20.5c1.4-3.3 4.1-5 7.5-5s6.1 1.7 7.5 5" />
    </SvgStroke>
);

export const IconChevronDown = ({ size = 22 }) => (
    <SvgStroke size={size}>
        <path d="M6 9l6 6 6-6" />
    </SvgStroke>
);

export const IconChevronRight = () => (
    <SvgStroke size={14}>
        <path d="M9 6l6 6-6 6" />
    </SvgStroke>
);

// Playlist icon used at the right end of the full-screen player controls.
export const IconQueue = () => (
    <SvgStroke size={20}>
        <path d="M4 6h10" />
        <path d="M4 12h10" />
        <path d="M4 18h7" />
        <circle cx="17.5" cy="15.6" r="2.4" strokeWidth="1.8" />
        <path d="M19.9 15.6V8.4l-2.2 1.2" strokeWidth="1.8" fill="none" />
    </SvgStroke>
);

export const IconHeart = () => (
    <SvgStroke size={22}>
        <path d="M12 20.5S3.8 15 3.8 9.2a4.4 4.4 0 0 1 8.2-2.3 4.4 4.4 0 0 1 8.2 2.3c0 5.8-8.2 11.3-8.2 11.3z" />
    </SvgStroke>
);

export const IconCloud = () => (
    <SvgStroke size={20}>
        <path d="M7 18a4.6 4.6 0 0 1-.6-9.15A6 6 0 0 1 17.8 9.5 4.2 4.2 0 0 1 17 18z" />
    </SvgStroke>
);

export const IconLogout = () => (
    <SvgStroke size={15}>
        <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
    </SvgStroke>
);

// Settings entry of the wide-screen layout (top-right glass button).
export const IconGear = ({ size = 20 }) => (
    <SvgStroke size={size}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1.03z" />
    </SvgStroke>
);

export const IconClose = ({ size = 18 }) => (
    <SvgStroke size={size}>
        <path d="M6 6l12 12M18 6L6 18" />
    </SvgStroke>
);
