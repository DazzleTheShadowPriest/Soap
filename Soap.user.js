// ==UserScript==
// @name         Soap — расширенный кастомайзер Bubble
// @namespace    thedoctorcrow/soap
// @version      1.0
// @updateURL    https://raw.githubusercontent.com/DazzleTheShadowPriest/Soap/main/Soap.user.js
// @downloadURL  https://raw.githubusercontent.com/DazzleTheShadowPriest/Soap/main/Soap.user.js
// @description  Soap она же Мыльница, более расширенный кастомайзер под соц.сеть Bubble. Неограниченные цвета, прозрачность, смена иконок, сохранение своих тем в 5 ячейках, экспорт и импорт, а также поддержка css для более замороченной кастомизации.
// @author       Dazzle, The Shadow Priest aka TheDoctorCrow
// @license      MIT
// @match        https://bubble-web.net/*
// @match        https://www.bubble-web.net/*
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
'use strict';
/* Soap theme engine. Pure ES module: no DOM, userscript API or network calls. */
const VERSION = '1.0';
const SLOT_COUNT = 5;
const MAX_ASSET_BYTES = 4 * 1024 * 1024;
const MAX_CSS_CHARS = 200000;
const MAX_THEME_BYTES = 24 * 1024 * 1024;
const MAX_ICON_BYTES = 256 * 1024;

const DARK_PALETTE = Object.freeze({ enabled: false, primary: '#85a9ed', accent: '#b0d781', text: '#e5edf6', surface: '#202b39', canvas: '#141d29' });
const NAV_ITEMS = Object.freeze([
  ['profile', 'Профиль'], ['feed', 'Лента'], ['messages', 'Сообщения'], ['friends', 'Друзья'],
  ['music', 'Музыка'], ['communities', 'Сообщества'], ['notifications', 'Уведомления'],
  ['search', 'Поиск'], ['settings', 'Настройки'], ['soap', 'Soap'], ['about', 'О проекте'],
  ['contact', 'Связаться'], ['rules', 'Правила'],
]);
const ICON_PRESETS = Object.freeze({
  person: ['Человек', '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2c0-4 3-6 8-6s8 2 8 6v2"/>'],
  home: ['Дом', '<path d="m2 11 10-8 10 8M5 10v11h14V10M10 21v-7h4v7"/>'],
  news: ['Записи', '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 8h4v4H7zM14 8h3M14 11h3M7 16h10"/>'],
  chat: ['Чат', '<path d="M3 4h18v13H9l-6 4zM7 9h10M7 12h7"/>'],
  mail: ['Конверт', '<rect x="2" y="5" width="20" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>'],
  people: ['Друзья', '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 21v-3c0-3 2-5 6-5s6 2 6 5v3M16 14c4 0 6 2 6 5v2"/>'],
  music: ['Нота', '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>'],
  bell: ['Колокол', '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4M12 4V2"/>'],
  search: ['Лупа', '<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/>'],
  gear: ['Настройки', '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M20 4l-2 2M6 18l-2 2"/>'],
  palette: ['Палитра', '<path d="M21 12c0-6-5-10-10-9C1 4-1 18 8 21c5 2 4-4 7-4h3c2 0 3-2 3-5z"/><circle cx="7" cy="10" r="1"/><circle cx="11" cy="6" r="1"/><circle cx="16" cy="7" r="1"/>'],
  star: ['Звезда', '<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z"/>'],
  heart: ['Сердце', '<path d="M12 21C-5 10 3-4 12 6c9-10 17 4 0 15z"/>'],
  folder: ['Папка', '<path d="M2 6h8l2 3h10l-2 12H2zM2 6V3h8l3 3h7v3"/>'],
  flower: ['Цветок', '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="4" rx="3" ry="3"/><ellipse cx="12" cy="20" rx="3" ry="3"/><ellipse cx="4" cy="12" rx="3" ry="3"/><ellipse cx="20" cy="12" rx="3" ry="3"/>'],
  bubbles: ['Пузырьки', '<circle cx="9" cy="14" r="7"/><circle cx="18" cy="6" r="4"/><circle cx="19" cy="19" r="2"/>'],
  moon: ['Луна', '<path d="M20 15A9 9 0 0 1 9 3C-3 5 0 23 12 22a9 9 0 0 0 8-7z"/>'],
  game: ['Геймпад', '<path d="M7 6h10c4 0 7 13 3 14-2 1-4-4-5-4H9c-1 0-3 5-5 4C0 19 3 6 7 6zM6 11h5M8.5 8.5v5M16 10h.1M19 13h.1"/>'],
});

function iconURL(name, color = '#24384a') {
  const shape = ICON_PRESETS[name]?.[1] || ICON_PRESETS.bubbles[1];
  const safeColor = /^#[\da-f]{6}$/i.test(color) ? color : '#24384a';
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${safeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`);
}

function navKey(href) {
  try {
    const url = new URL(href, 'https://bubble-web.net/');
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (/^\/u\//.test(url.pathname)) return 'profile';
    if (url.pathname === '/' || url.pathname === '/explore') return 'feed';
    const first = url.pathname.split('/')[1];
    if (first === 'settings' && url.searchParams.get('soap') === '1') return 'soap';
    return NAV_ITEMS.some(([key]) => key === first) ? first : '';
  } catch { return ''; }
}

const DEFAULT_THEME = Object.freeze({
  enabled: true,
  scheme: 'site',
  darkPalette: DARK_PALETTE,
  logo: Object.freeze({ enabled: false, source: 'site', url: '', hue: 0, brightness: 100, height: 54 }),
  icons: Object.freeze({ enabled: false, size: 24, items: Object.freeze(Object.fromEntries(NAV_ITEMS.map(([key]) => [key, Object.freeze({ kind: 'site', preset: 'bubbles', url: '' })]))) }),
  palette: Object.freeze({ enabled: false, primary: '#349af4', accent: '#bfec67', text: '#123b60', surface: '#f2faff', canvas: '#e4f3fc' }),
  wallpaper: Object.freeze({ enabled: false, zoom: 100, x: 50, y: 50 }),
  effects: Object.freeze({ enabled: false, opacity: 90, radius: 10 }),
  css: Object.freeze({ enabled: true, text: '' }),
});

const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const bool = (value, fallback) => typeof value === 'boolean' ? value : fallback;
const text = (value, fallback = '', limit = 1000) => typeof value === 'string' ? value.slice(0, limit) : fallback;
const color = (value, fallback) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
const option = (value, choices, fallback) => choices.includes(value) ? value : fallback;
const number = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.min(max, Math.max(min, value))) : fallback;
const cloneTheme = (theme = DEFAULT_THEME) => JSON.parse(JSON.stringify(theme));

function imageURL(value) {
  if (typeof value !== 'string' || value.length > MAX_ASSET_BYTES * 1.4 + 200) return '';
  const trimmed = value.trim();
  if (/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,[a-z\d+/=\s]+$/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed, 'https://bubble-web.net/');
    return trimmed && ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function normalizeTheme(input) {
  const value = record(input);
  const p = record(value.palette), w = record(value.wallpaper);
  const e = record(value.effects), c = record(value.css), d = DEFAULT_THEME;
  const l = record(value.logo), i = record(value.icons), di = record(value.darkPalette), items = record(i.items);
  const palette = (p, fallback) => ({ enabled: bool(p.enabled, false), ...Object.fromEntries(['primary', 'accent', 'text', 'surface', 'canvas'].map((key) => [key, color(p[key], fallback[key])])) });
  return {
    enabled: bool(value.enabled, d.enabled),
    scheme: option(value.scheme, ['site', 'dark'], 'site'),
    darkPalette: palette(di, DARK_PALETTE),
    logo: { enabled: bool(l.enabled, false), source: option(l.source, ['site', 'image'], 'site'), url: imageURL(l.url), hue: number(l.hue, 0, 360, 0), brightness: number(l.brightness, 20, 200, 100), height: number(l.height, 24, 100, 54) },
    icons: { enabled: bool(i.enabled, false), size: number(i.size, 14, 36, 24), items: Object.fromEntries(NAV_ITEMS.map(([key]) => { const item = record(items[key]); return [key, { kind: option(item.kind, ['site', 'preset', 'image'], 'site'), preset: option(item.preset, Object.keys(ICON_PRESETS), 'bubbles'), url: imageURL(item.url) }]; })) },
    palette: { enabled: bool(p.enabled, false), primary: color(p.primary, d.palette.primary), accent: color(p.accent, d.palette.accent), text: color(p.text, d.palette.text), surface: color(p.surface, d.palette.surface), canvas: color(p.canvas, d.palette.canvas) },
    wallpaper: { enabled: bool(w.enabled, false), zoom: number(w.zoom, 100, 400, 100), x: number(w.x, 0, 100, 50), y: number(w.y, 0, 100, 50) },
    effects: { enabled: bool(e.enabled, false), opacity: number(e.opacity, 0, 100, 90), radius: number(e.radius, 0, 30, 10) },
    css: { enabled: bool(c.enabled, true), text: text(c.text, '', MAX_CSS_CHARS) },
  };
}

function ink(hex) {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255).map((s) => s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4);
  const l = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  return (l + .05) / .05 >= 1.05 / (l + .05) ? '#101318' : '#ffffff';
}

/* Token selectors include each theme host because Bubble sets inline variables there. */
// :where keeps specificity low so the user's later !important rules can override this layer.
const HOSTS = ':where(html[data-soap-active], html[data-soap-active] [data-theme^="aero-"], html[data-soap-active] .aero-home)';
const HOME = ':where(html[data-soap-active] .aero-home)';
const cssURL = (url) => `url(${JSON.stringify(url)})`;

function visualCSS(input) {
  const theme = normalizeTheme(input);
  if (!theme.enabled) return '';
  const vars = {}, rules = [];
  if (theme.palette.enabled) {
    const p = theme.palette;
    const mix = (a, percent, b) => `color-mix(in srgb, ${a} ${percent}%, ${b})`;
    Object.assign(vars, {
      '--aero-chosen-primary': p.primary, '--aero-chosen-accent': p.accent, '--aero-chosen-accent-ink': ink(p.accent),
      '--aero-color-primary': p.primary, '--aero-color-secondary': mix(p.primary, 40, p.text),
      '--aero-color-text': p.text, '--aero-color-text-muted': mix(p.text, 65, p.surface), '--aero-color-text-control': p.text,
      '--aero-color-link': mix(p.primary, 35, p.text), '--aero-color-canvas': p.canvas,
      '--aero-color-surface': p.surface, '--aero-color-surface-solid': p.surface, '--aero-color-field': p.surface,
      '--aero-color-border': mix(p.primary, 45, p.surface), '--aero-color-border-strong': mix(p.primary, 70, p.text),
      '--aero-color-highlight': mix(p.surface, 70, 'transparent'), '--aero-color-highlight-solid': p.surface,
      '--aero-color-highlight-positive': p.accent, '--aero-color-focus': p.primary, '--aero-color-focus-gap': p.surface,
      '--aero-color-hover-border': p.primary, '--aero-color-active-border': p.text,
      '--aero-color-disabled-text': mix(p.text, 60, p.surface), '--aero-color-disabled-surface': p.canvas,
      '--aero-color-disabled-border': mix(p.primary, 40, p.surface), '--aero-color-shadow': mix(p.text, 22, 'transparent'),
      '--aero-color-raised': mix(p.primary, 25, p.surface), '--aero-color-action': mix(p.primary, 40, p.text),
      '--aero-color-action-soft': mix(p.primary, 25, p.surface), '--aero-color-composer': p.surface,
      '--aero-color-header-ink': p.text, '--aero-color-header-border': mix(p.primary, 65, p.surface),
      '--aero-color-frame-outline': mix(p.primary, 65, p.text), '--aero-color-frame-shadow': mix(p.text, 25, 'transparent'),
      '--aero-color-frame-reflection': mix(p.surface, 18, 'transparent'), '--aero-color-hero': p.text,
      '--aero-color-hero-muted': p.canvas, '--aero-color-hero-decoration': p.primary,
      '--aero-color-notice-text': p.text, '--aero-color-notice-surface': p.canvas, '--aero-color-notice-border': p.primary,
      '--aero-color-scrollbar-track': p.canvas, '--aero-color-scrollbar-thumb': mix(p.primary, 25, p.surface),
      '--aero-gradient-header': `linear-gradient(${mix(p.primary, 20, p.surface)}, ${mix(p.primary, 40, p.surface)} 49%, ${mix(p.primary, 55, p.surface)} 51%, ${mix(p.primary, 30, p.surface)})`,
      '--aero-gradient-rail': `linear-gradient(135deg, ${p.surface}, ${p.canvas})`,
      '--aero-gradient-panel': `linear-gradient(135deg, ${p.surface}, ${p.canvas})`,
      '--aero-gradient-card': `linear-gradient(135deg, ${p.surface}, ${mix(p.primary, 15, p.surface)})`,
      '--aero-gradient-button': `linear-gradient(${p.surface}, ${p.canvas} 48%, ${mix(p.primary, 30, p.surface)} 49%, ${p.surface})`,
      '--aero-gradient-button-hover': `linear-gradient(${p.surface}, ${mix(p.primary, 30, p.surface)})`,
      '--aero-gradient-button-active': `linear-gradient(${mix(p.primary, 35, p.surface)}, ${p.canvas})`,
      '--aero-gradient-tab-active': `linear-gradient(${p.surface}, ${mix(p.primary, 30, p.surface)})`,
      '--aero-gradient-frame': `linear-gradient(135deg, ${mix(p.surface, 40, 'transparent')}, ${mix(p.primary, 35, 'transparent')})`,
      '--aero-gradient-glass': 'var(--aero-gradient-frame)',
      '--aero-gradient-scrollbar': `linear-gradient(90deg, ${p.surface}, ${p.canvas}, ${p.surface})`,
      '--aero-gradient-scrollbar-hover': `linear-gradient(90deg, ${p.surface}, ${mix(p.primary, 30, p.surface)})`,
      '--bg': p.canvas, '--surface': p.surface, '--surface-2': p.canvas, '--text': p.text,
      '--muted': mix(p.text, 65, p.surface), '--border': mix(p.primary, 45, p.surface),
      '--accent': p.primary, '--accent-hover': mix(p.primary, 70, p.text), '--accent-contrast': ink(p.primary),
      '--accent-soft': mix(p.primary, 20, p.surface), '--gold': p.accent, '--gold-ink': ink(p.accent),
    });
  }
  if (theme.effects.enabled) {
    const e = theme.effects;
    Object.assign(vars, { '--aero-window-opacity': `${e.opacity}%`, '--aero-radius-panel': `${e.radius}px`, '--aero-radius-control': `${Math.min(e.radius, 16)}px`, '--radius': `${e.radius}px`, '--radius-sm': `${Math.min(e.radius, 16)}px` });
    rules.push(`${HOME} .shell { background: color-mix(in srgb, var(--aero-color-canvas) ${e.opacity}%, transparent) !important; }
${HOME} :is(.aero-panel, .aero-card, .aero-dialog, .card, .music-attachment-picker) { background: color-mix(in srgb, var(--aero-color-surface-solid) ${e.opacity}%, transparent) !important; border-radius: ${e.radius}px !important; }
${HOME} :is(.btn, .aero-button, .aero-input, input, select, textarea) { border-radius: ${Math.min(e.radius, 16)}px !important; }`);
  }
  return `${Object.keys(vars).length ? HOSTS + ' {\n' + Object.entries(vars).map(([key, value]) => `  ${key}: ${value} !important;`).join('\n') + '\n}' : ''}\n${rules.join('\n')}`;
}

/* Explicit interface overrides run after user CSS, so imported skins retain usable controls. */
function interfaceCSS(input) {
  const theme = normalizeTheme(input);
  if (!theme.enabled) return '';
  const rules = [];
  const scope = 'html[data-soap-active]';
  if (theme.scheme === 'dark') {
    const p = theme.darkPalette.enabled ? theme.darkPalette : DARK_PALETTE;
    const panel = theme.effects.enabled ? `color-mix(in srgb, ${p.surface} ${theme.effects.opacity}%, transparent)` : p.surface;
    const canvas = theme.effects.enabled ? `color-mix(in srgb, ${p.canvas} ${theme.effects.opacity}%, transparent)` : p.canvas;
    const desktop = p.canvas;
    const darkScope = 'html[data-soap-active][data-soap-dark]';
    const darkHosts = `${darkScope}, ${darkScope} [data-theme^="aero-"], ${darkScope} .aero-home`;
    const darkBase = visualCSS({ ...theme, palette: { ...p, enabled: true }, effects: { ...theme.effects, enabled: false } });
    rules.push(darkBase.replace(HOSTS, darkHosts));
    rules.push(`${darkScope} { color-scheme: dark !important; scrollbar-color: ${p.surface} ${p.canvas} !important; }
${darkScope}, ${darkScope} body, ${darkScope} .aero-home, ${darkScope} .aero-home::before { background-color: ${desktop} !important; color: ${p.text} !important; }
${darkScope} .aero-home :is(.shell, .left-nav, .right-rail, .header, .bottom-nav, .feed-tabs, .chat-list, .chat-messages) { background: ${p.canvas} !important; color: ${p.text} !important; border-color: #46576c !important; }
${darkScope} .aero-home .shell { background: ${canvas} !important; }
${darkScope} :is(.aero-panel, .aero-card, .card, .post, .composer, .profile, .aero-widget, .aero-dialog, .drawer, .message-context-menu, .chat-attachments__menu, .music-player, .music-player__queue, .chat-emoji, .music-attachment-picker) { background: ${panel} !important; color: ${p.text} !important; border-color: #46576c !important; box-shadow: none !important; }
${darkScope} .aero-home :is(.post-head, .chat-head, .aero-titlebar, .chat-form .image-drop-field) { background: ${p.surface} !important; color: ${p.text} !important; border-color: #46576c !important; }
${darkScope} .aero-home :is(.post-head, .aero-titlebar) :is(a, span, time, h1, h2, h3), ${darkScope} .aero-home :is(.music-player__title, .music-player__artist, .music-player__timeline, .bubble-time) { color: ${p.text} !important; text-shadow: none !important; }
${darkScope} .aero-home :is(.side-link, .nav-link, .brand-word, .icon-btn) { color: ${p.text} !important; text-shadow: none !important; }
${darkScope} .aero-home :is(.btn, .aero-button, .aero-window-control, .tab, .tab-link, .music-player__play, .music-player__mode, .music-player__close, .music-player__mute) { background: ${p.surface} !important; color: ${p.text} !important; border-color: #61758d !important; text-shadow: none !important; box-shadow: none !important; }
${darkScope} .aero-home :is(.side-link.active, .nav-link.active, .tab.active, .tab-link.active, .mine .bubble) { background: color-mix(in srgb, ${p.primary} 25%, ${p.surface}) !important; color: ${p.text} !important; }
${darkScope} .aero-home .bubble { background: ${p.surface} !important; color: ${p.text} !important; border-color: #61758d !important; }
${darkScope} .aero-home .aero-window-control i { border-color: ${p.text} !important; }
${darkScope} .aero-home .aero-control-close::before, ${darkScope} .aero-home .aero-control-close::after { background: ${p.text} !important; }
${darkScope} .aero-home :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"]), textarea, select, [contenteditable="true"]) { background: ${p.canvas} !important; color: ${p.text} !important; border-color: #61758d !important; caret-color: ${p.text} !important; }
${darkScope} .aero-home .chat-form textarea.chat-form__text--mirrored { color: transparent !important; -webkit-text-fill-color: transparent !important; background: transparent !important; border: 0 !important; }
${darkScope} .aero-home .chat-form .chat-form__mirror { color: ${p.text} !important; background: transparent !important; border: 0 !important; }
${darkScope} .aero-home :is(input, textarea)::placeholder { color: #b0bccb !important; }
${darkScope}::-webkit-scrollbar-track, ${darkScope} .aero-home ::-webkit-scrollbar-track { background: ${p.canvas} !important; }
${darkScope}::-webkit-scrollbar-thumb, ${darkScope} .aero-home ::-webkit-scrollbar-thumb { background: ${p.surface} !important; border-color: #61758d !important; }`);
  }
  if (theme.logo.enabled) {
    const logo = theme.logo;
    const selector = `${scope} .aero-home .header-logo img`;
    rules.push(`${selector} { filter: hue-rotate(${logo.hue}deg) brightness(${logo.brightness}%) !important; height: ${logo.height}px !important; width: auto !important; object-fit: contain !important; }`);
    if (logo.source === 'image' && logo.url) rules.push(`${selector} { content: ${cssURL(logo.url)} !important; max-width: min(320px, 45vw) !important; }`);
  }
  if (theme.icons.enabled) for (const [key] of NAV_ITEMS) {
    const item = theme.icons.items[key];
    if (item.kind === 'site' || item.kind === 'image' && !item.url) continue;
    const selector = `${scope} [data-soap-nav="${key}"]`;
    rules.push(`${selector} [data-soap-original-icon] { display: none !important; }
${selector} [data-soap-replacement-icon] { display: inline-block !important; width: ${theme.icons.size}px !important; height: ${theme.icons.size}px !important; flex: 0 0 ${theme.icons.size}px !important; vertical-align: middle !important; }`);
    if (item.kind === 'preset') rules.push(`${selector} [data-soap-replacement-icon] { background-color: currentColor !important; background-image: none !important; mask: ${cssURL(iconURL(item.preset, '#000000'))} center / contain no-repeat !important; -webkit-mask: ${cssURL(iconURL(item.preset, '#000000'))} center / contain no-repeat !important; }`);
    else rules.push(`${selector} [data-soap-replacement-icon] { background: none !important; mask: none !important; -webkit-mask: none !important; }
${selector} [data-soap-custom-icon-image] { display: block !important; width: ${theme.icons.size}px !important; height: ${theme.icons.size}px !important; max-width: none !important; object-fit: contain !important; opacity: 1 !important; visibility: visible !important; filter: none !important; }`);
  }
  return rules.join('\n');
}

/* Cover the viewport and clamp panning inside the image's overflow rectangle. */
function wallpaperGeometry(imageWidth, imageHeight, viewWidth, viewHeight, zoom = 100, x = 50, y = 50) {
  if (![imageWidth, imageHeight, viewWidth, viewHeight].every(value => Number.isFinite(value) && value > 0)) return null;
  const scale = Math.max(viewWidth / imageWidth, viewHeight / imageHeight) * number(zoom, 100, 400, 100) / 100;
  const width = Math.ceil(imageWidth * scale), height = Math.ceil(imageHeight * scale);
  const left = Math.max(viewWidth - width, Math.min(0, (viewWidth - width) * number(x, 0, 100, 50) / 100)) || 0;
  const top = Math.max(viewHeight - height, Math.min(0, (viewHeight - height) * number(y, 0, 100, 50) / 100)) || 0;
  return { width, height, left, top };
}

function wallpaperCSS(input, context) {
  const theme = normalizeTheme(input);
  if (!theme.enabled || !theme.wallpaper.enabled || !context?.url) return '';
  const layout = theme.wallpaper;
  const geometry = wallpaperGeometry(context.imageWidth, context.imageHeight, context.viewWidth, context.viewHeight, layout.zoom, layout.x, layout.y);
  const size = geometry ? `${geometry.width}px ${geometry.height}px` : 'cover';
  const position = geometry ? `${geometry.left}px ${geometry.top}px` : `${layout.x}% ${layout.y}%`;
  return `html[data-soap-active] .aero-app.aero-home, html[data-soap-active] .aero-app.aero-home::before { background-image: ${cssURL(context.url)} !important; background-size: ${size} !important; background-position: ${position} !important; background-repeat: no-repeat !important; background-attachment: fixed !important; background-origin: border-box !important; }`;
}

function customCSS(input) {
  const theme = normalizeTheme(input);
  return theme.enabled && theme.css.enabled ? theme.css.text : '';
}

function exportTheme(theme, name = 'Моя тема') {
  return JSON.stringify({ format: 'soap-theme', version: 2, name: text(name, 'Моя тема', 80), theme: normalizeTheme(theme) }, null, 2);
}

function parseThemeFile(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_THEME_BYTES) throw new Error('Слишком большой файл темы (не более 24 МБ).');
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('Не удалось прочитать JSON темы.'); }
  if (!data || data.format !== 'soap-theme' || ![1, 2].includes(data.version) || !data.theme || typeof data.theme !== 'object' || Array.isArray(data.theme)) throw new Error('Это не поддерживаемый файл темы Soap (версии 1 или 2).');
  return { name: text(data.name, 'Импортированная тема', 80), theme: normalizeTheme(data.theme) };
}

const EDITOR_CSS = ":host { --ui-bg:#f6f9fb;--ui-card:#fff;--ui-ink:#24384a;--ui-muted:#627783;--ui-border:#bdcfd9;--ui-soft:#eaf2f5;--ui-accent:#14768a;--ui-input:#fbfdfe;color-scheme:light; }\n:host([data-scheme=\"dark\"]) { --ui-bg:#17202c;--ui-card:#202d3d;--ui-ink:#e3ecf5;--ui-muted:#b0bfd0;--ui-border:#465b74;--ui-soft:#293a4f;--ui-accent:#84c5df;--ui-input:#131e2b;color-scheme:dark; }\n*,*::before,*::after { box-sizing:border-box; }\n.soap-page { width:100%;min-width:0;padding:20px;border:1px solid var(--ui-border);border-radius:12px;background:var(--ui-bg);color:var(--ui-ink);font:14px/1.45 \"Segoe UI\",Tahoma,sans-serif;color-scheme:inherit; }\nbutton,input,textarea,select { font:inherit;color:inherit; }\nbutton { min-height:34px;padding:6px 11px;border:1px solid var(--ui-border);border-radius:6px;background:var(--ui-card);color:var(--ui-ink);font-weight:600;cursor:pointer; }\nbutton:hover:enabled { background:var(--ui-soft);border-color:var(--ui-accent); }\nbutton:disabled { opacity:.45;cursor:default; }\nbutton:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible { outline:3px solid var(--ui-accent);outline-offset:2px; }\n.page-heading { display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-bottom:15px;border-bottom:1px solid var(--ui-border); }\n.brand { display:flex;align-items:center;gap:12px; }\n.brand h1 { margin:0;font-size:28px;line-height:1;letter-spacing:-.8px;color:var(--ui-ink); }\n.brand p { margin:5px 0 0;color:var(--ui-muted);font-size:12px; }\n.version { margin-left:6px;font-size:10px; }\n.bubbles { position:relative;width:37px;height:37px;border:1px solid #86b4c9;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff 0 10%,#e9fbff80 15%,#b1cddd80 65%,#bdc1e0); }\n.bubbles::after { content:\"\";position:absolute;width:14px;height:14px;right:-5px;top:-5px;border:1px solid #aac8df;border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff,#bac4df); }\n.controls { display:flex;flex-wrap:wrap;gap:14px 24px;padding:14px 0; }\n.toggle { display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer; }\n.toggle input { width:16px;height:16px;margin:0;accent-color:var(--ui-accent); }\nnav { display:flex;flex-wrap:wrap;gap:4px;margin-bottom:18px;border-bottom:1px solid var(--ui-border); }\nnav button { min-height:40px;border:0;border-bottom:3px solid transparent;border-radius:6px 6px 0 0;background:transparent;color:var(--ui-muted);font-size:12px; }\nnav button[aria-selected=\"true\"] { border-bottom-color:var(--ui-accent);background:var(--ui-card);color:var(--ui-ink); }\n.workspace { display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);align-items:start;gap:22px; }\n.editor-column,.preview-column,#soap-panel { min-width:0; }\n#soap-panel { outline-offset:3px; }\n.hint { margin:8px 0 13px;color:var(--ui-muted);font-size:12px;line-height:1.55;overflow-wrap:anywhere; }\nfieldset { min-width:0;margin:0 0 17px;padding:11px 12px 13px;border:1px solid var(--ui-border);border-radius:9px;background:var(--ui-card); }\nlegend { padding:0 5px;color:var(--ui-ink);font-size:13px; }\nfieldset:disabled .group-body { opacity:.5; }\n.color-row { display:flex;align-items:center;gap:9px;min-height:39px;cursor:pointer; }\n.color-row input { width:33px;height:29px;padding:2px;border:1px solid var(--ui-border);border-radius:5px;background:var(--ui-input);cursor:pointer; }\n.color-row span { flex:1;font-size:13px; }\n.color-row code { color:var(--ui-muted);font-size:11px; }\n.field { display:flex;flex-direction:column;min-width:0;gap:5px;margin:9px 0;font-size:12px;font-weight:600; }\n.field input,.field select,textarea,.preview-heading select { width:100%;min-width:0;min-height:34px;padding:7px 9px;border:1px solid var(--ui-border);border-radius:6px;background:var(--ui-input);color:var(--ui-ink);font-weight:400; }\n.field input:invalid { border-color:#c45a5a; }\n.two-col { display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px; }\n.range-row { display:block;margin:13px 0;font-size:12px; }\n.range-row > span { display:flex;justify-content:space-between;gap:12px;margin-bottom:6px; }\n.range-row output { color:var(--ui-accent);font-variant-numeric:tabular-nums; }\n.range-row input { width:100%;margin:0;accent-color:var(--ui-accent); }\n.inline { display:flex;align-items:center;flex-wrap:wrap;gap:8px; }\n.inline button { font-size:12px; }\n.quiet { border-color:transparent;background:transparent;color:var(--ui-muted); }\n.primary { border-color:#14677c;background:#14758a;color:#fff; }\n.primary:hover:enabled { background:#116377;color:#fff; }\n#css-editor { min-height:330px;height:48vh;resize:vertical;padding:12px;background:#111e2a;color:#dceef1;font:13px/1.6 Consolas,\"Courier New\",monospace;tab-size:2;white-space:pre;overflow:auto; }\n#css-editor::placeholder { color:#92aab5; }\ndetails { padding:10px 12px;border:1px solid var(--ui-border);border-radius:7px;background:var(--ui-soft); }\nsummary { cursor:pointer;font-size:12px;font-weight:600; }\npre { margin:10px 0;overflow:auto;font:11px/1.6 Consolas,\"Courier New\",monospace; }\ncode { font-family:Consolas,\"Courier New\",monospace; }\n.import-export { margin:12px 0 8px; }\n.slots { display:grid;gap:10px; }\n.slot { display:grid;grid-template-columns:25px minmax(0,1fr);gap:0 9px;padding:12px;border:1px solid var(--ui-border);border-radius:8px;background:var(--ui-card); }\n.slot-number { grid-row:span 2;display:grid;place-items:center;align-self:start;width:25px;height:25px;margin-top:20px;border-radius:50%;background:var(--ui-soft);color:var(--ui-accent);font-size:12px; }\n.slot .field { margin:0 0 9px; }\n.slot .inline { grid-column:2; }\n.status { min-height:40px;padding:10px 12px;margin-top:12px;border:1px solid var(--ui-border);border-radius:6px;background:var(--ui-soft);color:var(--ui-muted);font-size:12px;overflow-wrap:anywhere; }\n.status[data-error=\"true\"] { color:#c54646;background:#fff0ee; }\nfooter { display:grid;gap:10px;padding-top:12px; }\n.footer-row { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px; }\n#state { color:var(--ui-muted);font-size:11px; }\n.preview-column { position:sticky;top:120px;padding:13px;border:1px solid var(--ui-border);border-radius:9px;background:var(--ui-card); }\n.preview-heading { display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px; }\n.preview-heading strong { font-size:13px; }\n.preview-heading select { width:auto;max-width:150px;min-height:30px;padding:4px 7px;font-size:12px; }\n#preview-box { position:relative;width:100%;overflow:hidden;border:1px solid var(--ui-border);border-radius:4px;background:#fff; }\n#site-preview { display:block;position:absolute;top:0;left:0;border:0;transform-origin:top left;pointer-events:none; }\n.logo-preview { display:grid;place-items:center;min-height:90px;margin:7px 0 14px;padding:12px;border:1px solid var(--ui-border);border-radius:6px;background:repeating-conic-gradient(var(--ui-soft) 0% 25%,var(--ui-card) 0% 50%) 0 0/16px 16px; }\n.logo-preview img { display:block;max-width:100%;max-height:68px;object-fit:contain; }\n.logo-preview span { color:var(--ui-muted);font-size:12px; }\n.icon-rows { display:grid;gap:12px; }\n.icon-row { padding:10px;border:1px solid var(--ui-border);border-radius:7px;background:var(--ui-bg); }\n.icon-row-head { display:flex;align-items:center;gap:10px; }\n.icon-row-head strong { font-size:13px; }\n.icon-preview { display:grid;place-items:center;width:35px;height:35px;border:1px solid var(--ui-border);border-radius:6px;background:var(--ui-card); }\n.icon-preview img { width:25px;height:25px;object-fit:contain; }\n[hidden] { display:none!important; }\n@media(max-width:900px) { .workspace { grid-template-columns:minmax(0,1fr); } .preview-column { position:static; } }\n@media(max-width:520px) { .soap-page { padding:12px;border-radius:8px; } .page-heading { gap:10px; } .brand h1 { font-size:25px; } nav { gap:1px; } nav button { flex:1 1 40%;font-size:12px; } .two-col { grid-template-columns:minmax(0,1fr); } .field input,.field select { font-size:16px; } .footer-row > .inline { width:100%;justify-content:flex-end; } }\n";
/* Browser adapter; theme calculations remain independent of the DOM. */
const SETTINGS_KEY = 'soap:v1:settings';
const SLOTS_KEY = 'soap:v1:slots';
const UI_ID = 'soap-editor-host';
if (document.getElementById(UI_ID)) return;
let storageProblem = '';
function load(key, fallback) {
  try { const raw = typeof GM_getValue === 'function' ? GM_getValue(key, null) : localStorage.getItem(key); return raw == null ? fallback : typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { storageProblem = 'Не удалось прочитать настройки. Можно импортировать файл .soap.'; return fallback; }
}
async function persist(key, value) {
  const raw = JSON.stringify(value);
  if (typeof GM_setValue === 'function') await GM_setValue(key, raw); else localStorage.setItem(key, raw);
}
let saved = normalizeTheme(load(SETTINGS_KEY, DEFAULT_THEME));
const storedSlots = load(SLOTS_KEY, []);
let slots = Array.from({ length: SLOT_COUNT }, (_, index) => {
  const item = Array.isArray(storedSlots) ? storedSlots[index] : null;
  return item && typeof item.name === 'string' && item.theme ? { name: item.name.slice(0, 80), theme: normalizeTheme(item.theme) } : null;
});
let draft = cloneTheme(saved), preview = true, editing = false, visible = false, busy = false, tab = 'visual';
let host, shadow, page, status, main, previewFrame, snapshot, nativeLogoURL = '';
let frame = 0, integrationFrame = 0, generation = 0, headObserver, bodyObserver, resizeObserver, suspended = false;
let returnURL = '/', lastNativeURL = location.pathname + location.search + location.hash;
const covered = new Map(), themeStyles = new Map();
const navObservers = new Map(), appearanceObservers = new Map(), wallpaperCache = new Map();
const TABS = [['visual', 'Внешний вид'], ['interface', 'Логотип и иконки'], ['css', 'Свой CSS'], ['themes', 'Темы']];
const NAV_SELECTOR = '.left-nav nav a[href], .drawer-links a[href], .bottom-nav a[href], .nav-mobile a[href]';
const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml', ico: 'image/x-icon' };
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const at = path => path.split('.').reduce((item, key) => item[key], draft);
function setAt(path, value) { const keys = path.split('.'); let item = draft; for (const key of keys.slice(0, -1)) item = item[key]; item[keys.at(-1)] = value; }
const isSoapRoute = () => new URL(location.href).searchParams.get('soap') === '1';
const dirty = () => JSON.stringify(normalizeTheme(draft)) !== JSON.stringify(saved);
const currentTheme = () => editing && preview ? draft : saved;
const SHELL_CSS = `
html [data-soap-replacement-icon] { display:none!important; }
.soap-settings-link { padding-inline-start:18px; }
.soap-menu-symbol { display:inline-flex;align-items:center;justify-content:center;flex:none; }
html[data-soap-editor-page] .aero-home .right-rail { display:none!important; }
html[data-soap-editor-page] #main { min-width:0!important; }
@media(min-width:1101px) { html[data-soap-editor-page] .shell.has-left > #main { grid-column:2/-1!important; } html[data-soap-editor-page] .shell:not(.has-left) > #main { grid-column:1/-1!important; } }
@media(max-width:1100px) { html[data-soap-editor-page] .shell > #main { grid-column:1/-1!important; } }
`;
function ensureStyle(id, content) {
  let style = document.getElementById(id);
  if (!style) { style = document.createElement('style'); style.id = id; (document.head || document.documentElement).append(style); }
  if (style.textContent !== content) style.textContent = content;
  return style;
}
function cssImageURL(value, doc) {
  const match = /^url\(([\s\S]*)\)$/i.exec(value.trim()); if (!match) return '';
  let raw = match[1].trim();
  try {
    if (raw.startsWith('"')) raw = JSON.parse(raw); else if (raw.startsWith("'")) raw = raw.slice(1, -1).replace(/\\'/g, "'");
    const url = new URL(raw, doc.baseURI || location.href);
    return ['http:', 'https:', 'blob:'].includes(url.protocol) || url.protocol === 'data:' && /^data:image\//i.test(raw) ? url.href : '';
  } catch { return ''; }
}
function nativeWallpaperURL(doc) {
  const home = doc.querySelector('.aero-home'); if (!home) return '';
  const inline = home.style.getPropertyValue('--aero-wallpaper') || home.style.getPropertyValue('background-image');
  const own = cssImageURL(inline, doc); if (own) return own;
  const inherited = doc.defaultView?.getComputedStyle(home).getPropertyValue('--aero-wallpaper-image') || '';
  return cssImageURL(inherited, doc) || new URL('/bubble-background.jpg', doc.baseURI || location.href).href;
}
function wallpaperContext(doc) {
  const url = nativeWallpaperURL(document) || nativeWallpaperURL(doc); if (!url) return null;
  if (!wallpaperCache.has(url)) {
    const entry = { width: 0, height: 0, state: 'loading' }; wallpaperCache.set(url, entry);
    if (wallpaperCache.size > 16) wallpaperCache.delete(wallpaperCache.keys().next().value);
    const image = new Image();
    image.onload = () => { if (wallpaperCache.get(url) !== entry) return; entry.width = image.naturalWidth; entry.height = image.naturalHeight; entry.state = 'ready'; schedulePreview(); };
    image.onerror = () => { if (wallpaperCache.get(url) === entry) { entry.state = 'error'; schedulePreview(); } };
    image.src = url;
  }
  const cached = wallpaperCache.get(url);
  const phone = doc !== document && shadow?.getElementById('preview-viewport').value === 'mobile';
  return { url, imageWidth: cached?.width || 0, imageHeight: cached?.height || 0,
    viewWidth: doc === document ? document.documentElement.clientWidth || innerWidth : phone ? 390 : 1280,
    viewHeight: doc === document ? innerHeight || document.documentElement.clientHeight : phone ? 780 : 900 };
}
function layerData(theme, doc = document) {
  const layout = theme.enabled && theme.wallpaper.enabled ? wallpaperCSS(theme, wallpaperContext(doc)) : '';
  return [['soap-visual-style', visualCSS(theme)], ['soap-custom-style', customCSS(theme)], ['soap-interface-style', [interfaceCSS(theme), layout].filter(Boolean).join('\n')]];
}
function applyTheme(theme) {
  if (!document.documentElement) return;
  document.documentElement.toggleAttribute('data-soap-active', theme.enabled);
  document.documentElement.toggleAttribute('data-soap-dark', theme.enabled && theme.scheme === 'dark');
  ensureStyle('soap-shell-style', SHELL_CSS);
  for (const [id, css] of layerData(theme)) themeStyles.set(id, ensureStyle(id, css));
  const parent = document.head || document.documentElement, styles = Array.from(themeStyles.values());
  if (parent.lastElementChild !== styles.at(-1) || styles.some((node, i) => node.parentNode !== parent || i < styles.length - 1 && node.nextElementSibling !== styles[i + 1])) parent.append(...styles);
  if (host) host.dataset.scheme = theme.scheme === 'dark' ? 'dark' : 'light';
  syncIconImages(theme);
  updatePreview(theme);
}
function applyCurrent() { if (frame) cancelAnimationFrame(frame); frame = 0; applyTheme(currentTheme()); }
function schedulePreview() { if (suspended || !document.documentElement) return; if (!frame) frame = requestAnimationFrame(() => { frame = 0; applyTheme(currentTheme()); }); }
function message(value, error = false) { if (status) { status.textContent = value; status.dataset.error = String(error); } }
function updateState() { if (shadow) shadow.getElementById('state').textContent = dirty() ? 'Есть несохранённые изменения' : saved.enabled ? 'Настройки сохранены' : 'Оформление Soap отключено'; }
function reflectInput(path) {
  shadow.querySelectorAll('[data-display]').forEach(node => { if (node.dataset.display === path) node.textContent = String(at(path)) + (node.dataset.unit || ''); });
  if (path.endsWith('.enabled')) { const fieldset = shadow.querySelector(`[data-group="${path.split('.')[0]}"]`); if (fieldset) fieldset.disabled = !at(path); }
  const logo = shadow.getElementById('logo-preview'); if (logo) logo.style.filter = `hue-rotate(${draft.logo.hue}deg) brightness(${draft.logo.brightness}%)`;
  updateState();
}

/* Add our own navigation entry; do not replace React's links or unread counters. */
function navigate(url) {
  const target = new URL(url, location.href); if (target.origin !== location.origin) return;
  if (target.href !== location.href) {
    history.pushState({ ...history.state, key: 'soap-' + Date.now(), idx: Number(history.state?.idx || 0) + 1 }, '', target.pathname + target.search + target.hash);
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  }
  syncRoute(); scheduleIntegration();
}
function makeSoapLink(settings) {
  const anchor = document.createElement('a'); anchor.href = '/settings?soap=1';
  anchor.className = settings.className.replace(/\bactive\b/g, '').trim() + ' soap-settings-link';
  anchor.dataset.soapEntry = 'true'; anchor.dataset.soapInjected = 'true';
  const icon = document.createElement('span'); icon.className = settings.closest('.left-nav') ? 'side-icon' : 'soap-menu-symbol';
  const img = document.createElement('img'); img.src = iconURL('bubbles'); img.alt = ''; img.width = 24; img.height = 24; img.setAttribute('aria-hidden', 'true'); icon.append(img);
  const label = document.createElement('span'); label.className = settings.closest('.left-nav') ? 'side-label' : ''; label.textContent = 'Soap';
  anchor.append(icon, label);
  anchor.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); event.stopPropagation(); openEditor('/settings?soap=1');
  });
  return anchor;
}
function syncNavigation() {
  const img = document.querySelector('.header-logo img'); if (img?.getAttribute('src')) nativeLogoURL = new URL(img.getAttribute('src'), location.href).href;
  const links = Array.from(document.querySelectorAll(NAV_SELECTOR));
  for (const settings of links.filter(link => navKey(link.href) === 'settings' && link.closest('.left-nav, .drawer-links'))) {
    const group = settings.closest('.left-nav nav, .drawer-links'); if (!group || group.querySelector('[data-soap-entry]')) continue;
    const ownLink = makeSoapLink(settings);
    const owner = settings.parentElement?.tagName === 'SPAN' && settings.parentElement.children.length === 1 ? settings.parentElement : settings;
    if (owner !== settings) { const wrapper = document.createElement('span'); wrapper.dataset.soapInjected = 'true'; wrapper.append(ownLink); owner.after(wrapper); } else owner.after(ownLink);
  }
  for (const link of document.querySelectorAll(NAV_SELECTOR)) {
    if (new URL(link.href).origin !== location.origin) continue;
    const key = navKey(link.href); if (!key) continue;
    if (link.dataset.soapNav !== key) link.dataset.soapNav = key;
    const original = Array.from(link.querySelectorAll('[data-soap-original-icon], .side-icon svg, .side-icon img, .tab-icon svg, .tab-icon img, svg, img, .navigation-icon, .material-symbols-rounded, .material-symbols-outlined')).find(node => !node.closest('[data-soap-replacement-icon]'));
    if (original && !original.dataset.soapOriginalIcon) original.dataset.soapOriginalIcon = 'true';
    if (original && !link.querySelector('[data-soap-replacement-icon]')) { const replacement = document.createElement('span'); replacement.dataset.soapReplacementIcon = 'true'; replacement.dataset.soapInjected = 'true'; replacement.setAttribute('aria-hidden', 'true'); original.after(replacement); }
    if (link.dataset.soapEntry) { link.classList.toggle('active', isSoapRoute()); if (isSoapRoute()) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
  }
  syncIconImages(currentTheme());
  for (const [node, observer] of navObservers) if (!node.isConnected) { observer.disconnect(); navObservers.delete(node); }
  for (const node of document.querySelectorAll('.left-nav nav, .drawer-links, .bottom-nav, .nav-mobile')) if (!navObservers.has(node)) {
    const observer = new MutationObserver(changes => { if (navigationChanged(changes)) scheduleIntegration(); });
    observer.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'src', 'srcset', 'class'] }); navObservers.set(node, observer);
  }
  for (const [node, observer] of appearanceObservers) if (!node.isConnected) { observer.disconnect(); appearanceObservers.delete(node); }
  for (const node of document.querySelectorAll('.aero-home')) if (!appearanceObservers.has(node)) {
    let previous = node.style.getPropertyValue('--aero-wallpaper');
    const observer = new MutationObserver(() => { const value = node.style.getPropertyValue('--aero-wallpaper'); if (value !== previous) { previous = value; if (currentTheme().wallpaper.enabled) schedulePreview(); } });
    observer.observe(node, { attributes: true, attributeFilter: ['style'] }); appearanceObservers.set(node, observer);
  }
  if (currentTheme().wallpaper.enabled) schedulePreview();
}
function syncIconImages(theme, doc = document) {
  for (const link of doc.querySelectorAll('[data-soap-nav]')) {
    const item = theme.icons.items[link.dataset.soapNav], replacement = link.querySelector('[data-soap-replacement-icon]');
    if (!replacement) continue;
    let image = replacement.querySelector('[data-soap-custom-icon-image]');
    if (theme.enabled && theme.icons.enabled && item?.kind === 'image' && item.url) {
      if (!image) { image = doc.createElement('img'); image.dataset.soapCustomIconImage = 'true'; image.dataset.soapInjected = 'true'; image.alt = ''; image.setAttribute('aria-hidden', 'true'); image.loading = 'eager'; replacement.append(image); }
      if (image.getAttribute('src') !== item.url) image.setAttribute('src', item.url);
    } else image?.remove();
  }
}
function navigationChanged(changes) {
  return changes.some(change => {
    if (change.target.closest?.('[data-soap-entry], [data-soap-replacement-icon]')) return false;
    if (change.type === 'attributes') return true;
    if (Array.from(change.removedNodes).some(node => node.nodeType === 1 && node.hasAttribute('data-soap-replacement-icon'))) return true;
    return Array.from(change.addedNodes).concat(Array.from(change.removedNodes)).some(node => node.nodeType === 1 && node !== host && !node.hasAttribute('data-soap-injected'));
  });
}
function restoreCovered() {
  for (const [node, previous] of covered) { if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display'); node.removeAttribute('data-soap-covered'); }
  covered.clear();
}
function positionEditor() {
  const target = document.querySelector('.aero-home #main, #main, .aero-home main.container'); if (!target || !host) return;
  if (host.parentElement !== target || target.firstElementChild !== host) target.prepend(host);
  for (const node of target.children) if (node !== host && !covered.has(node)) { covered.set(node, { value: node.style.getPropertyValue('display'), priority: node.style.getPropertyPriority('display') }); node.dataset.soapCovered = 'true'; node.style.setProperty('display', 'none', 'important'); }
  for (const [node, previous] of covered) if (!node.isConnected) { if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display'); node.removeAttribute('data-soap-covered'); covered.delete(node); }
  host.style.setProperty('display', 'block', 'important'); host.hidden = false; visible = true;
  document.documentElement.setAttribute('data-soap-editor-page', ''); fitPreview();
}
function hideEditor() { restoreCovered(); visible = false; if (host) { host.hidden = true; host.style.setProperty('display', 'none', 'important'); } document.documentElement.removeAttribute('data-soap-editor-page'); }
function syncRoute() {
  if (!host) return;
  if (isSoapRoute()) { if (!editing) { draft = cloneTheme(saved); editing = true; preview = true; generation += 1; render(); } if (!snapshot) captureSnapshot(); positionEditor(); }
  else { hideEditor(); lastNativeURL = location.pathname + location.search + location.hash; }
}
function scheduleIntegration() { if (suspended || !document.documentElement || !document.body) return; if (!integrationFrame) integrationFrame = requestAnimationFrame(() => { integrationFrame = 0; if (!document.documentElement) return; syncNavigation(); syncRoute(); }); }

/* A sandboxed, read-only snapshot: no second application, scripts, audio or chat connection. */
function captureSnapshot() {
  const app = document.querySelector('.aero-home'); if (!app) return;
  const wasVisible = visible; if (wasVisible) restoreCovered();
  const body = document.createElement('body'); body.append((app.closest('#root') || app).cloneNode(true));
  body.querySelectorAll(`#${UI_ID}, script, iframe, object, embed, audio, video`).forEach(node => node.remove());
  body.querySelectorAll('*').forEach(node => {
    for (const attribute of Array.from(node.attributes)) if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
    node.removeAttribute('autofocus'); node.setAttribute('tabindex', '-1'); if (node.tagName === 'IMG') node.setAttribute('loading', 'eager');
  });
  body.querySelectorAll('.aero-window > .shell').forEach(node => node.style.removeProperty('clip-path'));
  const head = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style')).filter(node => !node.id.startsWith('soap-')).map(node => node.cloneNode(true));
  snapshot = { body, head, path: location.pathname, base: new URL('/', location.href).href };
  if (wasVisible) positionEditor(); installSnapshot();
}
function installSnapshot() {
  const doc = previewFrame?.contentDocument; if (!doc?.head || !doc.body || !snapshot) return;
  const base = doc.createElement('base'); base.href = snapshot.base;
  doc.head.replaceChildren(base, ...snapshot.head.map(node => doc.importNode(node, true)));
  doc.body.replaceChildren(...Array.from(snapshot.body.childNodes).map(node => doc.importNode(node, true)));
  doc.documentElement.lang = 'ru'; shadow.getElementById('preview-source').textContent = 'Снимок страницы: ' + snapshot.path;
  updatePreview(currentTheme()); fitPreview();
}
function updatePreview(theme) {
  const doc = previewFrame?.contentDocument; if (!doc?.head || !snapshot) return;
  doc.documentElement.toggleAttribute('data-soap-active', theme.enabled); doc.documentElement.toggleAttribute('data-soap-dark', theme.enabled && theme.scheme === 'dark');
  for (const [id, css] of [['soap-preview-base', 'html [data-soap-replacement-icon]{display:none!important}'], ...layerData(theme, doc)]) { let style = doc.getElementById(id); if (!style) { style = doc.createElement('style'); style.id = id; doc.head.append(style); } if (style.textContent !== css) style.textContent = css; }
  syncIconImages(theme, doc);
  fitPreview();
}
function fitPreview() {
  if (!previewFrame || !shadow) return;
  const box = shadow.getElementById('preview-box'), width = shadow.getElementById('preview-viewport').value === 'mobile' ? 390 : 1280, height = width === 390 ? 780 : 900;
  const available = box.clientWidth || box.getBoundingClientRect().width, scale = available ? Math.min(1, available / width) : .4;
  previewFrame.style.width = width + 'px'; previewFrame.style.height = height + 'px'; previewFrame.style.transform = `scale(${scale})`; box.style.height = Math.ceil(height * scale) + 'px';
  const doc = previewFrame.contentDocument, home = doc?.querySelector('.aero-home'), chrome = doc?.querySelector('.aero-window-chrome');
  const chromeHeight = chrome?.getBoundingClientRect().height;
  if (home && chromeHeight) home.style.setProperty('--aero-chrome-height', chromeHeight + 'px');
}

const check = path => at(path) ? 'checked' : '';
const toggle = (path, title) => `<label class="toggle"><input type="checkbox" data-path="${path}" ${check(path)}><span>${title}</span></label>`;
const group = (name, title, content) => `<fieldset data-group="${name}" ${at(name + '.enabled') ? '' : 'disabled'}><legend>${toggle(name + '.enabled', title)}</legend><div class="group-body">${content}</div></fieldset>`;
const colorControl = (path, title) => `<label class="color-row"><input type="color" data-path="${path}" value="${at(path)}"><span>${title}</span><code data-display="${path}">${at(path)}</code></label>`;
const rangeControl = (path, title, min, max, unit = '') => `<label class="range-row"><span>${title}<output data-display="${path}" data-unit="${unit}">${at(path)}${unit}</output></span><input type="range" data-path="${path}" min="${min}" max="${max}" step="1" value="${at(path)}"></label>`;
const selectControl = (path, title, options) => `<label class="field"><span>${title}</span><select data-path="${path}">${options.map(([value, label]) => `<option value="${value}" ${at(path) === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`;
const urlControl = (path, title) => `<label class="field"><span>${title}</span><input type="url" data-path="${path}" value="${escapeHTML(at(path).startsWith('data:') ? '' : at(path))}" placeholder="https://…" spellcheck="false"></label>`;
function renderVisual() {
  const palette = draft.scheme === 'dark' ? 'darkPalette' : 'palette';
  return `${selectControl('scheme', 'Режим оформления', [['site', 'Тема Bubble / свой CSS'], ['dark', 'Тёмная тема']])}<p class="hint">Тёмный режим затемняет панели, поля и текст поверх CSS-темы. Картинки сохраняют свои цвета.</p>
${group(palette, draft.scheme === 'dark' ? 'Цвета тёмной темы' : 'Свои цвета', [['primary', 'Основной цвет'], ['accent', 'Акцент'], ['text', 'Текст'], ['surface', 'Панели'], ['canvas', 'Область записей']].map(([key, title]) => colorControl(palette + '.' + key, title)).join(''))}
${group('wallpaper', 'Расположение фона Bubble', `<p class="hint">Картинку выбери в настройках Bubble. Здесь меняются только её размер и положение. 100% заполняет экран; края не оголяются.</p>${rangeControl('wallpaper.zoom', 'Масштаб фона', 100, 400, '%')}${rangeControl('wallpaper.x', 'По горизонтали', 0, 100, '%')}${rangeControl('wallpaper.y', 'По вертикали', 0, 100, '%')}<button type="button" data-action="wallpaper-center">По центру, 100%</button>`)}
${group('effects', 'Прозрачность и форма', `${rangeControl('effects.opacity', 'Непрозрачность панелей', 0, 100, '%')}${rangeControl('effects.radius', 'Скругление', 0, 30, ' px')}`)}`;
}
function renderInterface() {
  const logo = draft.logo.source === 'image' && draft.logo.url ? draft.logo.url : nativeLogoURL, iconColor = draft.scheme === 'dark' ? '#dde7f5' : '#28434a';
  const rows = NAV_ITEMS.map(([key, label]) => {
    const item = draft.icons.items[key], value = item.kind === 'preset' ? 'preset:' + item.preset : item.kind;
    const native = document.querySelector(`[data-soap-nav="${key}"] [data-soap-original-icon]`);
    let originalURL = '';
    if (native?.tagName === 'IMG') originalURL = native.currentSrc || native.src;
    else if (native?.tagName?.toLowerCase() === 'svg') originalURL = 'data:image/svg+xml,' + encodeURIComponent(new XMLSerializer().serializeToString(native).replace(/currentColor/g, iconColor));
    const src = item.kind === 'image' ? item.url : item.kind === 'site' ? originalURL : iconURL(item.preset, iconColor);
    return `<section class="icon-row"><div class="icon-row-head"><span class="icon-preview">${src ? `<img src="${escapeHTML(src)}" alt="" loading="lazy">` : ''}</span><strong>${label}</strong></div><label class="field"><span>Иконка для «${label}»</span><select data-icon-key="${key}"><option value="site" ${value === 'site' ? 'selected' : ''}>Стандартная</option>${Object.entries(ICON_PRESETS).map(([id, [name]]) => `<option value="preset:${id}" ${value === 'preset:' + id ? 'selected' : ''}>${name}</option>`).join('')}<option value="image" ${value === 'image' ? 'selected' : ''}>Своя картинка</option></select></label>${item.kind === 'image' ? urlControl(`icons.items.${key}.url`, 'Ссылка на иконку') : ''}<div class="inline"><button type="button" data-action="icon-upload" data-key="${key}">Загрузить файл</button><button type="button" data-action="icon-reset" data-key="${key}" class="quiet">Стандартная</button></div></section>`;
  }).join('');
  return `${group('logo', 'Логотип Bubble', `<div class="logo-preview">${logo ? `<img id="logo-preview" src="${escapeHTML(logo)}" alt="Предпросмотр логотипа" style="filter:hue-rotate(${draft.logo.hue}deg) brightness(${draft.logo.brightness}%)">` : '<span>Логотип появится на странице Bubble</span>'}</div>${selectControl('logo.source', 'Изображение', [['site', 'Стандартный логотип'], ['image', 'Своё изображение']])}${draft.logo.source === 'image' ? urlControl('logo.url', 'Ссылка на логотип') : ''}<div class="inline"><button type="button" data-action="logo-upload">Загрузить логотип</button><button type="button" data-action="logo-reset" class="quiet">Вернуть стандартный</button></div>${rangeControl('logo.hue', 'Оттенок логотипа', 0, 360, '°')}${rangeControl('logo.brightness', 'Яркость логотипа', 20, 200, '%')}${rangeControl('logo.height', 'Высота логотипа', 24, 100, ' px')}<p class="hint">Картинка до 4 МБ. Ползунки меняют цвета изображения; белые и серые участки реагируют на яркость.</p>`)}
${group('icons', 'Иконки интерфейса', `${rangeControl('icons.size', 'Размер иконок', 14, 36, ' px')}<p class="hint">Выберите значок или загрузите PNG, JPG, GIF, WebP, SVG, ICO до 256 КБ. Счётчики уведомлений сохраняются.</p><div class="icon-rows">${rows}</div>`)}`;
}
function renderCSS() {
  return `${toggle('css.enabled', 'Применять свой CSS')}<p class="hint">CSS применяется после визуальных настроек. Выбранный тёмный режим, логотип и замены иконок применяются последним слоем.</p><label class="field"><span>Код CSS</span><textarea id="css-editor" data-path="css.text" spellcheck="false" autocapitalize="off" maxlength="${MAX_CSS_CHARS}" placeholder="/* CSS без тегов &lt;style&gt; */">${escapeHTML(draft.css.text)}</textarea></label><p class="hint" id="css-count">${draft.css.text.length.toLocaleString('ru-RU')} / ${MAX_CSS_CHARS.toLocaleString('ru-RU')} символов · Tab — отступ, Ctrl+S — сохранить.</p><details><summary>Селекторы для начала</summary><pre>.aero-home { /* общие стили */ }
.aero-home .aero-panel { /* панели */ }
.aero-home .shell { /* область контента */ }
.aero-home .post { /* запись */ }
.aero-home .aero-button { /* кнопки */ }</pre><p class="hint">Для переопределения визуальных настроек используйте !important. Редактор отделён от CSS страницы.</p></details>`;
}
function renderSlots() {
  return `<p class="hint">Пять тем: цвета, CSS, логотип, иконки и расположение фона сохраняются вместе.</p><div class="inline import-export"><button type="button" data-action="export">Экспорт .soap</button><button type="button" data-action="import">Импорт .soap</button></div><div class="slots">${slots.map((slot, index) => `<section class="slot" aria-label="Слот ${index + 1}"><span class="slot-number">${index + 1}</span><label class="field"><span>Название темы</span><input type="text" data-slot-name="${index}" maxlength="80" value="${escapeHTML(slot?.name || '')}" placeholder="Пустой слот"></label><div class="inline"><button type="button" data-action="slot-load" data-index="${index}" ${slot ? '' : 'disabled'}>Загрузить</button><button type="button" data-action="slot-save" data-index="${index}">Записать</button></div></section>`).join('')}</div>`;
}
function render() {
  if (!shadow) return;
  shadow.getElementById('controls').innerHTML = `${toggle('enabled', 'Применять Soap')}<label class="toggle"><input id="preview" type="checkbox" ${preview ? 'checked' : ''}><span>Предпросмотр</span></label>`;
  shadow.getElementById('tabs').innerHTML = TABS.map(([id, label]) => `<button type="button" role="tab" id="tab-${id}" aria-selected="${tab === id}" aria-controls="soap-panel" tabindex="${tab === id ? '0' : '-1'}" data-tab="${id}">${label}</button>`).join('');
  main.setAttribute('aria-labelledby', 'tab-' + tab); main.innerHTML = tab === 'visual' ? renderVisual() : tab === 'interface' ? renderInterface() : tab === 'css' ? renderCSS() : renderSlots(); updateState();
}
function openEditor(target) {
  mount(); if (!host) return;
  if (!visible) { returnURL = lastNativeURL; captureSnapshot(); }
  if (!editing) { draft = cloneTheme(saved); editing = true; preview = true; generation += 1; }
  render();
  document.querySelector('button[aria-controls="mobile-menu"][aria-expanded="true"]')?.click();
  const hasSettings = Array.from(document.querySelectorAll(NAV_SELECTOR)).some(link => navKey(link.href) === 'settings');
  const next = typeof target === 'string' ? target : hasSettings ? '/settings?soap=1' : (() => { const url = new URL(location.href); url.searchParams.set('soap', '1'); return url.pathname + url.search + url.hash; })();
  navigate(next); applyCurrent(); message(storageProblem || 'Настройте тему и проверьте предпросмотр. «Сохранить» запомнит изменения.', Boolean(storageProblem));
}
function cancelDraft() { if (busy) return; draft = cloneTheme(saved); generation += 1; render(); applyCurrent(); message('Возвращена сохранённая тема.'); }
function peek() { if (!busy) navigate(returnURL.includes('soap=1') ? '/' : returnURL); }
function setBusy(value) {
  busy = value; page.setAttribute('aria-busy', String(value)); main.inert = value; shadow.getElementById('controls').inert = value;
  shadow.querySelectorAll('footer button, .page-heading button, #tabs button').forEach(button => { button.disabled = value; });
}
async function save() {
  if (busy || !editing || !Array.from(shadow.querySelectorAll('input')).every(input => input.reportValidity())) return;
  const next = normalizeTheme(draft); setBusy(true); message('Сохраняю…');
  try { await persist(SETTINGS_KEY, next); saved = next; draft = cloneTheme(next); setBusy(false); render(); applyCurrent(); message('Тема сохранена.'); }
  catch (error) { setBusy(false); message('Не удалось сохранить. Черновик оставлен в редакторе. ' + error.message, true); }
}
async function emergencyOff() {
  saved = { ...saved, enabled: false }; draft = { ...draft, enabled: false }; applyCurrent();
  try { await persist(SETTINGS_KEY, saved); storageProblem = ''; } catch { storageProblem = 'Стили отключены в этой вкладке; не удалось запомнить отключение.'; }
  render(); message(storageProblem || 'Оформление Soap отключено. Ваш CSS и тема сохранены.', Boolean(storageProblem));
}
function download(name, content) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
  document.documentElement.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function saveSlot(index) {
  if (index < 0 || index >= SLOT_COUNT || busy) return;
  const name = shadow.querySelector(`[data-slot-name="${index}"]`).value.trim().slice(0, 80) || `Тема ${index + 1}`, next = slots.slice(); next[index] = { name, theme: normalizeTheme(draft) }; setBusy(true);
  try { await persist(SLOTS_KEY, next); slots = next; setBusy(false); render(); message(`Тема «${name}» записана в слот ${index + 1}.`); } catch (error) { setBusy(false); message('Не удалось записать слот. ' + error.message, true); }
}
function readDataURL(file, type) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Не удалось прочитать файл.')); reader.readAsDataURL(new Blob([file], { type })); }); }
async function useFile(input) {
  const file = input.files?.[0]; input.value = ''; if (!file || busy) return;
  const ticket = generation, iconKey = input.dataset.key;
  try {
    if (input.id === 'theme-file') {
      if (file.size > MAX_THEME_BYTES) throw new Error('Файл темы должен быть не больше 24 МБ.');
      const imported = parseThemeFile(await file.text()); if (suspended || !editing || ticket !== generation) return;
      draft = imported.theme; render(); applyCurrent(); message(`Тема «${imported.name}» открыта для предпросмотра.`); return;
    }
    const icon = input.id === 'icon-file';
    if (file.size > (icon ? MAX_ICON_BYTES : MAX_ASSET_BYTES)) throw new Error(icon ? 'Иконка должна быть не больше 256 КБ.' : 'Логотип должен быть не больше 4 МБ.');
    const type = IMAGE_TYPES[file.name.split('.').at(-1).toLowerCase()]; if (!type) throw new Error('Поддерживаются PNG, JPG, GIF, WebP, AVIF, SVG и ICO.');
    const url = await readDataURL(file, type); if (suspended || !editing || ticket !== generation) return;
    if (icon && NAV_ITEMS.some(([key]) => key === iconKey)) { draft.icons.items[iconKey] = { ...draft.icons.items[iconKey], kind: 'image', url }; draft.icons.enabled = true; }
    else if (input.id === 'logo-file') { draft.logo.url = url; draft.logo.source = 'image'; draft.logo.enabled = true; }
    render(); applyCurrent(); message('Файл добавлен в черновик темы.');
  } catch (error) { message(error.message, true); }
}
function onInput(event) {
  const input = event.target; if (busy) return;
  if (input.dataset.iconKey) {
    const key = input.dataset.iconKey, value = input.value; if (!NAV_ITEMS.some(([id]) => id === key)) return;
    if (value.startsWith('preset:')) draft.icons.items[key] = { ...draft.icons.items[key], kind: 'preset', preset: value.slice(7) }; else draft.icons.items[key].kind = value === 'image' ? 'image' : 'site';
    render(); schedulePreview(); return;
  }
  const path = input.dataset.path; if (!path) return;
  let value = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
  if (path.endsWith('.url')) { const raw = String(value).trim(); if (raw && !/^https?:\/\//i.test(raw)) { input.setCustomValidity('Введите ссылку с https:// или http://.'); return; } value = imageURL(raw); input.setCustomValidity(raw && !value ? 'Проверьте ссылку на картинку.' : ''); if (raw && !value) return; }
  setAt(path, value); reflectInput(path);
  if (path === 'css.text') shadow.getElementById('css-count').textContent = `${value.length.toLocaleString('ru-RU')} / ${MAX_CSS_CHARS.toLocaleString('ru-RU')} символов · Tab — отступ, Ctrl+S — сохранить.`;
  if (path === 'scheme' || path === 'logo.source') render(); schedulePreview();
}
async function onClick(event) {
  const button = event.target.closest('button'); if (!button || button.disabled || busy) return;
  if (button.dataset.tab) { tab = button.dataset.tab; render(); shadow.getElementById('tab-' + tab).focus(); return; }
  const action = button.dataset.action, key = button.dataset.key;
  if (action === 'save') await save(); else if (action === 'cancel') cancelDraft(); else if (action === 'peek') peek(); else if (action === 'native-settings') navigate('/settings'); else if (action === 'refresh-preview') captureSnapshot();
  else if (action === 'reset') { draft = cloneTheme(); generation += 1; render(); applyCurrent(); message('Настройки сброшены в черновике. Нажмите «Сохранить» или «Отменить».'); }
  else if (action === 'export') { download('Soap-theme.soap', exportTheme(draft)); message('Файл .soap содержит текущий черновик, логотип и иконки.'); }
  else if (action === 'import') shadow.getElementById('theme-file').click(); else if (action === 'logo-upload') shadow.getElementById('logo-file').click();
  else if (action === 'icon-upload') { const input = shadow.getElementById('icon-file'); input.dataset.key = key; input.click(); }
  else if (action === 'wallpaper-center') { draft.wallpaper = { ...draft.wallpaper, zoom: 100, x: 50, y: 50 }; render(); schedulePreview(); }
  else if (action === 'logo-reset') { draft.logo = cloneTheme().logo; render(); schedulePreview(); }
  else if (action === 'icon-reset' && NAV_ITEMS.some(([id]) => id === key)) { draft.icons.items[key] = cloneTheme().icons.items[key]; render(); schedulePreview(); }
  else if (action === 'slot-save') await saveSlot(Number(button.dataset.index));
  else if (action === 'slot-load') { const slot = slots[Number(button.dataset.index)]; if (slot) { draft = cloneTheme(slot.theme); generation += 1; render(); applyCurrent(); message(`Тема «${slot.name}» открыта для предпросмотра.`); } }
}
function onKey(event) {
  const target = event.target;
  if (target.id === 'css-editor' && event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) { event.preventDefault(); target.setRangeText('  ', target.selectionStart, target.selectionEnd, 'end'); target.dispatchEvent(new Event('input', { bubbles: true })); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
  if (target.getAttribute('role') === 'tab' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const index = TABS.findIndex(([id]) => id === tab); tab = TABS[event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0]; render(); shadow.getElementById('tab-' + tab).focus(); }
}
function mount() {
  if (host || !document.body) return;
  host = document.createElement('section'); host.id = UI_ID; host.hidden = true;
  for (const [key, value] of Object.entries({ all: 'initial', display: 'none', width: '100%', 'min-width': '0', 'grid-column': '1 / -1', 'box-sizing': 'border-box' })) host.style.setProperty(key, value, 'important');
  shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${EDITOR_CSS}</style><section class="soap-page" aria-labelledby="soap-title"><header class="page-heading"><div class="brand"><span class="bubbles" aria-hidden="true"></span><div><h1 id="soap-title">Soap</h1><p>Оформление Bubble <span class="version">${VERSION}</span></p></div></div><button type="button" data-action="native-settings" class="quiet">Настройки Bubble</button></header><div id="controls" class="controls"></div><nav id="tabs" role="tablist" aria-label="Способ настройки"></nav><div class="workspace"><div class="editor-column"><div id="soap-panel" role="tabpanel" tabindex="0"></div><div class="status" role="status" aria-live="polite"></div><footer><div class="footer-row"><button type="button" data-action="reset" class="quiet">Сбросить</button><small id="state"></small></div><div class="footer-row"><button type="button" data-action="peek">Посмотреть на сайте</button><div class="inline"><button type="button" data-action="cancel">Отменить</button><button type="button" data-action="save" class="primary">Сохранить</button></div></div></footer></div><aside class="preview-column" aria-label="Предпросмотр оформления"><div class="preview-heading"><strong>Предпросмотр</strong><select id="preview-viewport" aria-label="Размер экрана предпросмотра"><option value="desktop">Компьютер</option><option value="mobile">Телефон</option></select></div><div id="preview-box"><iframe id="site-preview" title="Предпросмотр Bubble" sandbox="allow-same-origin" tabindex="-1"></iframe></div><p class="hint" id="preview-source">Снимок страницы появится после загрузки Bubble.</p><p class="hint">Здесь показан вид страницы. Для проверки переходов и кнопок нажмите «Посмотреть на сайте», затем вернитесь через пункт Soap.</p><button type="button" data-action="refresh-preview" class="quiet">Обновить снимок</button></aside></div><input type="file" id="theme-file" accept=".soap,.json,application/json" hidden><input type="file" id="logo-file" accept=".png,.jpg,.jpeg,.gif,.webp,.avif,.svg,.ico" hidden><input type="file" id="icon-file" accept=".png,.jpg,.jpeg,.gif,.webp,.avif,.svg,.ico" hidden></section>`;
  document.body.append(host); page = shadow.querySelector('.soap-page'); main = shadow.getElementById('soap-panel'); status = shadow.querySelector('.status'); previewFrame = shadow.getElementById('site-preview'); previewFrame.inert = true;
  previewFrame.srcdoc = '<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body></body></html>'; previewFrame.addEventListener('load', installSnapshot);
  const src = document.querySelector('.header-logo img')?.getAttribute('src'); if (src) nativeLogoURL = new URL(src, location.href).href;
  shadow.addEventListener('click', event => { onClick(event).catch(error => message(error.message, true)); }); shadow.addEventListener('input', onInput);
  shadow.addEventListener('change', event => { if (event.target.id === 'preview') { preview = event.target.checked; applyCurrent(); } if (event.target.id === 'preview-viewport') { fitPreview(); updatePreview(currentTheme()); } if (event.target.type === 'file') useFile(event.target).catch(error => message(error.message, true)); });
  shadow.addEventListener('keydown', onKey);
  if (typeof ResizeObserver === 'function') { resizeObserver = new ResizeObserver(fitPreview); resizeObserver.observe(shadow.getElementById('preview-box')); }
  window.addEventListener('resize', () => { fitPreview(); if (currentTheme().wallpaper.enabled) schedulePreview(); }); render();
}
if (typeof GM_registerMenuCommand === 'function') { GM_registerMenuCommand('Открыть Soap', () => openEditor()); GM_registerMenuCommand('Отключить стили Soap', emergencyOff); }
window.addEventListener('popstate', scheduleIntegration);
window.addEventListener('keydown', event => { if (event.altKey && event.shiftKey && event.code === 'KeyS' && !event.repeat) { event.preventDefault(); if (visible) peek(); else openEditor(); } });
document.addEventListener('click', event => { if (event.target.closest?.('a[href]')) scheduleIntegration(); }, true);
window.addEventListener('beforeunload', event => { if (editing && dirty()) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('pagehide', () => {
  suspended = true;
  for (const observer of navObservers.values()) observer.disconnect(); navObservers.clear();
  for (const observer of appearanceObservers.values()) observer.disconnect(); appearanceObservers.clear();
  headObserver?.disconnect(); bodyObserver?.disconnect(); resizeObserver?.disconnect(); headObserver = null; bodyObserver = null;
  if (frame) cancelAnimationFrame(frame); if (integrationFrame) cancelAnimationFrame(integrationFrame); frame = 0; integrationFrame = 0;
});
window.addEventListener('pageshow', event => { if (event.persisted) { start(); if (resizeObserver && shadow) resizeObserver.observe(shadow.getElementById('preview-box')); } });
function start() {
  suspended = false;
  applyCurrent(); mount(); syncNavigation(); syncRoute();
  if (document.head && !headObserver) { headObserver = new MutationObserver(changes => { if (changes.some(change => Array.from(change.addedNodes).some(node => node.nodeType === 1 && /^(STYLE|LINK)$/.test(node.tagName) && !node.id.startsWith('soap-')))) schedulePreview(); }); headObserver.observe(document.head, { childList: true }); }
  if (document.body && !bodyObserver) { bodyObserver = new MutationObserver(changes => { if (changes.some(change => Array.from(change.addedNodes).concat(Array.from(change.removedNodes)).some(node => node.nodeType === 1 && node !== host && !node.hasAttribute('data-soap-injected')))) scheduleIntegration(); }); bodyObserver.observe(document.body, { childList: true, subtree: true }); }
}
if (document.documentElement) start();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();

})();
