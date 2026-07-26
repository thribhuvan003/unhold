import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware navigation: these keep the active locale on every internal
// navigation and let <Link locale> switch languages.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
