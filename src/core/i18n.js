/**
 * Text resources (docx §11): every UI text is a keyed resource. Generated keys follow the
 * Excel TextResID where present (`tr<id>`), otherwise `param.<id>` / `opt.<id>` / `screen.<id>`.
 * English and German are real; the other 24 languages are selectable and fall back to English.
 */
import enChrome from '../data/i18n/en.json';
import enGenerated from '../data/i18n/en.generated.json';
import deChrome from '../data/i18n/de.json';
import deGenerated from '../data/i18n/de.generated.json';

/** Language_Selection option id → { code, native } */
export const LANGUAGES = {
  501: { code: 'en', native: 'English' },
  502: { code: 'de', native: 'Deutsch' },
  503: { code: 'it', native: 'Italiano' },
  504: { code: 'fr', native: 'Français' },
  505: { code: 'es', native: 'Español' },
  506: { code: 'nl', native: 'Nederlands' },
  507: { code: 'da', native: 'Dansk' },
  508: { code: 'pl', native: 'Polski' },
  509: { code: 'tr', native: 'Türkçe' },
  510: { code: 'ru', native: 'Русский' },
  511: { code: 'cs', native: 'Čeština' },
  512: { code: 'zh', native: '中文' },
  513: { code: 'ja', native: '日本語' },
  514: { code: 'hu', native: 'Magyar' },
  515: { code: 'pt', native: 'Português' },
  516: { code: 'ar', native: 'العربية' },
  517: { code: 'ko', native: '한국어' },
  518: { code: 'th', native: 'ไทย' },
  519: { code: 'vi', native: 'Tiếng Việt' },
  520: { code: 'sk', native: 'Slovenčina' },
  521: { code: 'el', native: 'Ελληνικά' },
  522: { code: 'ro', native: 'Română' },
  523: { code: 'sv', native: 'Svenska' },
  524: { code: 'no', native: 'Norsk' },
  525: { code: 'fi', native: 'Suomi' },
  526: { code: 'bg', native: 'Български' },
};

const resources = {
  en: { ...enGenerated, ...enChrome },
  de: { ...deGenerated, ...deChrome },
};

let lang = 'en';
let tempLang = null; // temporary per-session override (docx §8.14), cleared on logout
const listeners = new Set();

export function currentLanguage() {
  return tempLang ?? lang;
}
export function setLanguage(code) {
  lang = code in resources ? code : 'en';
  emit();
}
export function setTemporaryLanguage(code) {
  tempLang = code ? (code in resources ? code : 'en') : null;
  emit();
}
export function clearTemporaryLanguage() {
  if (tempLang != null) {
    tempLang = null;
    emit();
  }
}
export function languageFromOption(optionId) {
  return LANGUAGES[optionId]?.code ?? 'en';
}
export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn(currentLanguage());
}

/**
 * Translate. `t('toast.saved')`, `t('row.needsLevel', { n: 3 })`.
 * Fallback order: current language → English → the key itself.
 */
export function t(key, params) {
  const l = currentLanguage();
  let s = resources[l]?.[key] ?? resources.en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
export function has(key, l = currentLanguage()) {
  return key in (resources[l] ?? {});
}

/** Plural-free number formatting per language (decimal comma for German). */
export function fmtNumber(n, decimals) {
  if (n == null || n === '') return '';
  const l = currentLanguage();
  const opts = decimals != null ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : { maximumFractionDigits: 3 };
  return new Intl.NumberFormat(l === 'de' ? 'de-DE' : 'en-GB', opts).format(Number(n));
}

/**
 * Length audit (docx §11: German runs ~30 % longer). Returns keys whose German text is
 * longer than `factor` × English, or which have no German at all. Used by P4-03.
 */
export function auditLengths(factor = 1.3) {
  const out = { tooLong: [], missing: [] };
  for (const [key, en] of Object.entries(resources.en)) {
    const de = resources.de[key];
    if (de == null) out.missing.push(key);
    else if (de.length > en.length * factor + 2) out.tooLong.push({ key, en: en.length, de: de.length });
  }
  return out;
}
