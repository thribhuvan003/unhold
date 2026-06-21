import { LetterPreview } from '@/components/letters/LetterPreview';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string; level: string }>;
};

const VALID = new Set(['L1', 'L2', 'L3']);

export default async function LetterPage({ params }: PageProps) {
  const { id, level } = await params;
  if (!VALID.has(level)) notFound();

  const supabase = await createClient();

  const { data: escalation } = await supabase
    .from('escalations')
    .select('*')
    .eq('case_id', id)
    .eq('level', level as 'L1' | 'L2' | 'L3')
    .maybeSingle();

  if (!escalation?.letter_body || !escalation.letter_subject) {
    notFound();
  }

  const metadata = (escalation.metadata_json ?? {}) as {
    placeholders_missing?: string[];
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>{level} letter draft</h1>
      <LetterPreview
        subject={escalation.letter_subject}
        body={escalation.letter_body}
        level={level}
        placeholdersMissing={metadata.placeholders_missing ?? []}
        approved={escalation.status === 'approved' || escalation.approved_at != null}
      />
      <p style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
        Copy-only — you must send this letter yourself via email or post.
      </p>
    </main>
  );
}