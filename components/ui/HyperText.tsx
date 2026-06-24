'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface HyperTextProps {
  text: string;
  className?: string;
  animateOnLoad?: boolean;
  duration?: number;
  delay?: number;
  variant?: 'default' | 'wave' | 'glitch' | 'matrix' | 'typewriter';
}

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

function randomChar(): string {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

/**
 * Decorative scramble-in text. SSR-safe: starts as the real text (server and
 * client match), then animates after mount. Best for short hero headlines —
 * not critical/financial copy a stressed user needs to read instantly.
 */
export function HyperText({
  text,
  className = '',
  animateOnLoad = true,
  duration = 800,
  delay = 0,
  variant = 'default',
}: HyperTextProps) {
  const [displayText, setDisplayText] = useState<string[]>(() => text.split(''));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervals = useRef<ReturnType<typeof setInterval>[]>([]);

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    intervals.current.forEach(clearInterval);
    timers.current = [];
    intervals.current = [];
  }, []);

  const animateText = useCallback(() => {
    clearAll();
    const chars = text.split('');

    if (variant === 'wave' || variant === 'typewriter') {
      chars.forEach((_, index) => {
        timers.current.push(
          setTimeout(
            () =>
              setDisplayText(() =>
                chars.map((c, i) => (i <= index ? chars[i] : variant === 'typewriter' ? c.replace(/.*/, '') : randomChar())),
              ),
            (duration / chars.length) * index,
          ),
        );
      });
      return;
    }

    if (variant === 'matrix') {
      const interval = setInterval(() => {
        setDisplayText(() => chars.map((char) => (Math.random() > 0.5 ? char : randomChar())));
      }, 50);
      intervals.current.push(interval);
      timers.current.push(setTimeout(() => {
        clearInterval(interval);
        setDisplayText(chars);
      }, duration));
      return;
    }

    // default + glitch: progressively settle each character
    let iteration = 0;
    const step = variant === 'glitch' ? 0.5 : 1 / 3;
    const interval = setInterval(() => {
      setDisplayText(() => chars.map((char, index) => (index < iteration ? char : randomChar())));
      iteration += step;
      if (iteration >= chars.length) {
        clearInterval(interval);
        setDisplayText(chars);
      }
    }, duration / (chars.length * 2));
    intervals.current.push(interval);
  }, [text, duration, variant, clearAll]);

  useEffect(() => {
    if (!animateOnLoad) return;
    const start = setTimeout(animateText, delay);
    timers.current.push(start);
    return clearAll;
  }, [animateOnLoad, delay, animateText, clearAll]);

  return (
    <span className={className} onClick={animateText} style={{ cursor: 'pointer' }}>
      {displayText.join('')}
    </span>
  );
}
