'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { SaveCaseCard } from '@/components/case/SaveCaseCard';
import { SAVE_CASE_STORAGE_KEY, type CaseBootstrap } from '@/lib/case/save-case-storage';

/**
 * Forced pause after case create: user must acknowledge case code (+ recovery)
 * before entering the workspace. Recovery plaintext only lives in sessionStorage
 * from the create response — never re-fetched from the server.
 */
export default function SaveCasePage() {
  const t = useTranslations('SaveCasePage');
  const params = useParams();
  const caseId = typeof params.id === 'string' ? params.id : '';
  const [bootstrap, setBootstrap] = useState<CaseBootstrap | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SAVE_CASE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CaseBootstrap;
      if (parsed.caseId === caseId) {
        setBootstrap(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
  }, [caseId]);

  const publicId = bootstrap?.publicId ?? '—';

  return (
    <section className="mx-auto flex max-w-[430px] flex-col gap-4">
      <SaveCaseCard
        caseId={caseId}
        publicId={publicId}
        recoveryCode={bootstrap?.recoveryCode ?? null}
      />
      <Link
        href={`/cases/${caseId}`}
        className="u-btn u-btn-primary flex min-h-[52px] w-full text-base font-semibold"
        onClick={() => {
          try {
            // Keep publicId for my-case hints; drop recovery after continue.
            if (bootstrap) {
              sessionStorage.setItem(
                SAVE_CASE_STORAGE_KEY,
                JSON.stringify({ caseId: bootstrap.caseId, publicId: bootstrap.publicId }),
              );
            }
          } catch {
            // ignore
          }
        }}
      >
        {t('continue')}
      </Link>
    </section>
  );
}
