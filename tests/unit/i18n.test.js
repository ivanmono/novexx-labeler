import { describe, it, expect, afterEach } from 'vitest';
import { t, setLanguage, setTemporaryLanguage, clearTemporaryLanguage, currentLanguage, languageFromOption, fmtNumber, auditLengths } from '../../src/core/i18n.js';

afterEach(() => {
  clearTemporaryLanguage();
  setLanguage('en');
});

describe('i18n', () => {
  it('translates chrome and generated keys, with parameters', () => {
    expect(t('nav.menu')).toBe('Menu');
    expect(t('screen.start')).toBe('Start');
    expect(t('toast.needsLevel', { n: 3 })).toBe('Needs access level 3');
  });
  it('German with English fallback', () => {
    setLanguage('de');
    expect(t('nav.menu')).toBe('Menü');
    expect(t('screen.hmi')).toBe('HMI');
    expect(t('param.900')).toBe('Diagnoseaufzeichnung');
    expect(t('tr6')).toBe('Speed Selection'); // not translated yet → English
  });
  it('unknown languages fall back to English', () => {
    setLanguage(languageFromOption(512)); // Chinese
    expect(currentLanguage()).toBe('en');
    expect(t('nav.back')).toBe('Back');
  });
  it('temporary language overrides until cleared', () => {
    setLanguage('en');
    setTemporaryLanguage('de');
    expect(t('nav.back')).toBe('Zurück');
    clearTemporaryLanguage();
    expect(t('nav.back')).toBe('Back');
  });
  it('unknown key returns the key', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });
  it('number formatting follows the language', () => {
    setLanguage('de');
    expect(fmtNumber(12.5, 1)).toBe('12,5');
    setLanguage('en');
    expect(fmtNumber(12.5, 1)).toBe('12.5');
  });
  it('length audit reports missing German', () => {
    const a = auditLengths();
    expect(a.missing.length).toBeGreaterThan(0);
    expect(Array.isArray(a.tooLong)).toBe(true);
  });
});
