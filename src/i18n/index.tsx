import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, type Language, type TranslationKey } from './locales';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
  translateCategory: (cat: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'panto_lang';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  };

  const toggleLang = () => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TranslationKey): string => {
    const dict = translations[lang] || translations.zh;
    return dict[key] || translations.zh[key] || key;
  };

  // 针对后端给出的中文分类名做双语映射
  const translateCategory = (cat: string): string => {
    if (lang === 'zh') return cat;
    switch (cat) {
      case 'AI 专区':
        return translations.en.cat_ai;
      case '社交媒体':
        return translations.en.cat_social;
      case '搜索服务':
        return translations.en.cat_search;
      case '全球流媒体':
        return translations.en.cat_streaming;
      case '开发与云':
        return translations.en.cat_dev;
      case '高校学术':
        return translations.en.cat_academic;
      case '国内直连':
        return translations.en.cat_china;
      case '广告拦截':
        return translations.en.cat_ads;
      default:
        return cat;
    }
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t, translateCategory }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
