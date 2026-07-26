import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'hi'],
  defaultLocale: 'en',
  // Existing English URLs stay unprefixed (/start, /cases…); Hindi lives at /hi/*.
  localePrefix: 'as-needed',
});
