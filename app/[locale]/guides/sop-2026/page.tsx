import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string }> };

// Facts below are sourced from docs/RESEARCH_FREEZE_DOMAIN.md (verified 2026-07).
// The 02-Jan-2026 SOP was read via secondary legal analyses; exact day-counts
// carry that caveat in the UI. Never present SOP steps as statutory guarantees.
// This page holds both the English source-of-truth and its verified Hindi
// translation; the active locale selects which renders.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale === 'hi') {
    return {
      title: '2026 फ्रीज़ SOP में आपके अधिकार',
      description:
        'MHA/I4C अकाउंट-फ्रीज़ SOP (जनवरी 2026) की आसान हिन्दी गाइड: लियन सिर्फ विवादित रकम पर, 7/15/15 दिन की शिकायत-सीढ़ी, 90 दिन की सीमा, और अपनी ब्रांच में क्या मांगें।',
      keywords: [
        'खाता फ्रीज',
        'अकाउंट अनफ्रीज',
        'MHA SOP 2026',
        'I4C',
        'लियन',
        'साइबर फ्रीज',
        'Unhold',
      ],
    };
  }
  return {
    title: 'Your rights under the 2026 bank account freeze SOP',
    description:
      'Plain-English guide to the MHA/I4C account-freeze SOP (Jan 2026): lien on the disputed amount only, the 7/15/15-day grievance ladder, the 90-day cap, and what to demand at your branch.',
    keywords: [
      'bank account freeze India',
      'unfreeze bank account',
      'MHA freeze SOP 2026',
      'I4C lien disputed amount',
      'cyber freeze rights',
      'Unhold',
    ],
  };
}

export default async function SopGuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return locale === 'hi' ? <HindiGuide /> : <EnglishGuide />;
}

const LADDER_EN = [
  {
    step: '1',
    who: 'Your bank',
    time: '7 days',
    what: 'Verifies your bona fides and forwards your grievance into the CFCFRMS module. Start it by submitting your written grievance at your home branch and getting a stamped acknowledgement.',
  },
  {
    step: '2',
    who: 'Investigating Officer (IO)',
    time: '15 days',
    what: 'Must decide on your grievance — with notice to you, preferably by video conference. If the IO does not decide in time, the grievance auto-escalates.',
  },
  {
    step: '3',
    who: 'District Grievance Officer (Addl. SP / DySP rank)',
    time: '15 days to decide',
    what: 'Decides the escalated grievance; the IO must execute the decision within 2 days.',
  },
  {
    step: '4',
    who: 'State Grievance Officer (ADG / IG / DIG rank)',
    time: '15-day appeal window',
    what: 'If you disagree with the district decision, you can appeal. Approaching a court remains open to you at any stage.',
  },
];

function EnglishGuide() {
  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header className="animate-fade-up space-y-3">
        <p className="type-eyebrow">Know your rights — 2026 freeze SOP</p>
        <Link href="/guides/sop-2026" locale="hi" lang="hi" className="text-sm font-semibold text-[var(--color-sky-deep)] underline underline-offset-4">
          हिन्दी में पढ़ें &rarr;
        </Link>
        <h1 className="type-display mt-1 text-3xl sm:text-4xl">
          Your account is frozen. The rules say it should not stay that way.
        </h1>
        <p className="type-lead max-w-prose">
          In January 2026 the Ministry of Home Affairs (I4C) issued a Standard Operating Procedure for
          cyber-fraud account freezes. It gives you concrete, time-bound rights. Here is what it says,
          in plain words — and exactly what to demand.
        </p>
      </header>

      <article className="u-card animate-fade-up border-[#166534]/30 bg-[#f0fdf4] p-5">
        <h2 className="type-display text-lg">Your single most important right</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">
          <strong>Only the disputed amount should be held — not your whole account.</strong> The lawful
          action against an innocent downstream account is a <strong>lien limited to the disputed
          amount</strong>, and the 2026 SOP follows this principle. Recent High Court rulings (Bombay &amp;
          Delhi, 2025–26) held that blanket-freezing an entire account is unlawful — but these are under
          appeal in the Supreme Court, which has separately allowed freezing &ldquo;with or without
          FIR&rdquo;, so treat them as strong, persuasive rulings, not settled law.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
          So if ₹15,000 is disputed and ₹2,00,000 is frozen, you can demand in writing:
        </p>
        <blockquote className="mt-3 rounded-lg border border-[#166534]/30 bg-white p-4 text-sm leading-relaxed text-[var(--ink)]">
          &ldquo;As per the MHA/I4C SOP dated 02-01-2026 and High Court rulings, any hold must be a lien
          limited to the disputed amount shown in the NCRP trail. I request immediate release of the
          undisputed balance in my account, and written confirmation of the exact lien amount, the legal
          provision used, and the Investigating Officer&rsquo;s details.&rdquo;
        </blockquote>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          This exact demand is already built into your Unhold L1 letter. Attach your bank statement — it
          proves how much of your balance has nothing to do with the disputed transaction.
        </p>
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">The time-bound ladder the SOP created</h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Every step has a clock. Keeping stamped proof at each step is what makes the next step work.
        </p>
        <ol className="mt-4 space-y-3">
          {LADDER_EN.map((row) => (
            <li key={row.step} className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--forest-muted)] text-sm font-bold text-[var(--forest)]">
                {row.step}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {row.who} — <span className="text-[var(--forest)]">{row.time}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">{row.what}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">Two more rules worth knowing</h2>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--ink-muted)]">
          <li className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <strong className="text-[var(--ink)]">The 90-day cap.</strong> If no lawful direction
            (court order or equivalent) arrives within 90 days of your grievance, the bank notifies the
            police 15 days before expiry and — after due diligence and your request — may remove the hold
            and update the NCRP-CFCFRMS record. If your freeze is months old with no order, cite this.
          </li>
          <li className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <strong className="text-[var(--ink)]">Small disputed amounts (under ₹50,000).</strong> The
            SOP eases release/refund in sub-₹50k cases without needing a court order. If your disputed
            amount is small, say so explicitly in your grievance.
          </li>
        </ul>
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">How to actually start the clock</h2>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-relaxed text-[var(--ink-muted)]">
          <li>
            <strong className="text-[var(--ink)]">Report first on the official portal</strong> —{' '}
            <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--color-sky-deep)] underline underline-offset-2">
              cybercrime.gov.in
            </a>{' '}
            or call <a href="tel:1930" className="font-medium text-[var(--color-sky-deep)] underline underline-offset-2">1930</a>.
            Keep the NCRP acknowledgement number — every later step asks for it.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Submit your written grievance at your home branch</strong>{' '}
            with your evidence bundle, and insist on a stamped acknowledgement. This is what starts the
            bank&rsquo;s 7-day window.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Wrongly frozen?</strong> Use the government GRM portal:{' '}
            <a href="https://ncrp-grievanceredressal.mha.gov.in/" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--color-sky-deep)] underline underline-offset-2">
              ncrp-grievanceredressal.mha.gov.in
            </a>
          </li>
          <li>
            <strong className="text-[var(--ink)]">Bank unresponsive for 30 days?</strong> File free with the RBI
            Ombudsman at{' '}
            <a href="https://cms.rbi.org.in" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--color-sky-deep)] underline underline-offset-2">
              cms.rbi.org.in
            </a>{' '}
            or call <a href="tel:14448" className="font-medium text-[var(--color-sky-deep)] underline underline-offset-2">14448</a>.
          </li>
        </ol>
        <p className="mt-4 text-sm text-[var(--ink-muted)]">
          Unhold prepares the grievance letter, the evidence bundle, and the checklist for each of these
          steps —{' '}
          <Link href="/start" className="font-semibold text-[var(--color-sky-deep)] underline underline-offset-2">
            start your case
          </Link>{' '}
          and you get documents matched to your freeze type.
        </p>
      </article>

      <article className="u-card animate-fade-up border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
        <h2 className="type-display text-base text-amber-900">Honest limits of the SOP</h2>
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          <li>The SOP is an executive procedure, not a statute — compliance across banks and states is still uneven.</li>
          <li>It does not require prior notice or a hearing before a freeze is placed.</li>
          <li>Inter-state cases remain slower; cases above ₹50,000 have fewer fixed timelines.</li>
          <li>
            The day-counts above are from the SOP as reported by legal analyses of the 02-Jan-2026 text.
            Always restate them as &ldquo;per the MHA SOP&rdquo; in letters, and expect the officer to have the final text.
          </li>
        </ul>
        <p className="mt-3 text-xs">
          Unhold is not a law firm and does not guarantee outcomes. This page is education, not legal advice.
        </p>
      </article>
    </section>
  );
}

const LADDER_HI = [
  {
    step: '1',
    who: 'आपका बैंक',
    time: '7 दिन',
    what: 'आपकी सच्चाई (bona fides) की जांच करता है और आपकी शिकायत CFCFRMS मॉड्यूल में आगे भेजता है। शुरुआत करने के लिए अपनी होम ब्रांच में लिखित शिकायत जमा करें और स्टाम्प लगी पावती लें।',
  },
  {
    step: '2',
    who: 'जांच अधिकारी (Investigating Officer / IO)',
    time: '15 दिन',
    what: 'आपकी शिकायत पर फैसला लेना ज़रूरी है — आपको सूचना देकर, हो सके तो वीडियो कॉन्फ्रेंस से। अगर IO समय पर फैसला नहीं लेता, तो शिकायत अपने आप ऊपर के स्तर पर चली जाती है।',
  },
  {
    step: '3',
    who: 'ज़िला शिकायत अधिकारी / District Grievance Officer (Addl. SP / DySP रैंक)',
    time: 'फैसले के लिए 15 दिन',
    what: 'ऊपर पहुंची शिकायत पर फैसला लेता है; IO को वह फैसला 2 दिन के भीतर लागू करना होता है।',
  },
  {
    step: '4',
    who: 'राज्य शिकायत अधिकारी / State Grievance Officer (ADG / IG / DIG रैंक)',
    time: '15 दिन की अपील विंडो',
    what: 'अगर आप ज़िले के फैसले से सहमत नहीं हैं, तो आप अपील कर सकते हैं। कोर्ट जाने का रास्ता हर स्तर पर आपके लिए खुला रहता है।',
  },
];

function HindiGuide() {
  return (
    <section lang="hi" className="mx-auto max-w-3xl space-y-8">
      <header className="animate-fade-up space-y-3">
        <p className="type-eyebrow">अपने अधिकार जानें — 2026 फ्रीज़ SOP</p>
        <Link href="/guides/sop-2026" locale="en" lang="en" className="text-sm font-semibold text-[var(--color-sky-deep)] underline underline-offset-4">
          Read in English &rarr;
        </Link>
        <h1 className="type-display mt-1 text-3xl sm:text-4xl">
          आपका अकाउंट फ्रीज़ है। नियम कहते हैं कि यह ऐसा नहीं रहना चाहिए।
        </h1>
        <p className="type-lead max-w-prose">
          जनवरी 2026 में गृह मंत्रालय (MHA/I4C) ने साइबर-फ्रॉड अकाउंट फ्रीज़ के लिए एक Standard
          Operating Procedure (SOP) जारी की। यह आपको ठोस, समय-बद्ध अधिकार देती है। यहां आसान शब्दों
          में बताया गया है कि इसमें क्या लिखा है — और आपको ठीक-ठीक क्या मांगना चाहिए।
        </p>
      </header>

      <article className="u-card animate-fade-up border-[#166534]/30 bg-[#f0fdf4] p-5">
        <h2 className="type-display text-lg">आपका सबसे ज़रूरी अधिकार</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">
          <strong>सिर्फ विवादित रकम रोकी जानी चाहिए — आपका पूरा खाता नहीं।</strong> किसी निर्दोष
          डाउनस्ट्रीम अकाउंट पर कानूनी कार्रवाई सिर्फ इतनी हो सकती है: <strong>विवादित रकम तक सीमित
          लियन</strong>। कई हाई कोर्ट कह चुके हैं कि सिर्फ पुलिस की चिट्ठी के आधार पर पूरा अकाउंट
          फ्रीज़ करना गैर-कानूनी है, और 2026 की SOP भी इसी सिद्धांत पर चलती है।
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
          तो अगर ₹15,000 विवादित हैं और ₹2,00,000 फ्रीज़ हैं, तो आप लिखित में यह मांग कर सकते हैं:
        </p>
        <blockquote className="mt-3 rounded-lg border border-[#166534]/30 bg-white p-4 text-sm leading-relaxed text-[var(--ink)]">
          &ldquo;MHA/I4C की 02-01-2026 की SOP और हाई कोर्ट के फैसलों के अनुसार, कोई भी होल्ड NCRP
          ट्रेल में दिखाई गई विवादित रकम तक सीमित लियन ही हो सकता है। मेरा अनुरोध है कि मेरे अकाउंट
          की गैर-विवादित शेष राशि तुरंत रिलीज़ की जाए, और मुझे लियन की सटीक रकम, इस्तेमाल किए गए
          कानूनी प्रावधान और जांच अधिकारी (Investigating Officer) के विवरण की लिखित पुष्टि दी
          जाए।&rdquo;
        </blockquote>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          यही मांग आपके Unhold L1 लेटर में पहले से शामिल है। अपना बैंक स्टेटमेंट साथ लगाएं — यह साबित
          करता है कि आपके बैलेंस का कितना हिस्सा विवादित लेनदेन से बिल्कुल अलग है।
        </p>
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">SOP ने जो समय-बद्ध सीढ़ी बनाई</h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          हर कदम की एक घड़ी है। हर कदम पर स्टाम्प लगी पावती संभालकर रखना ही अगले कदम को कारगर बनाता
          है।
        </p>
        <ol className="mt-4 space-y-3">
          {LADDER_HI.map((row) => (
            <li key={row.step} className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--forest-muted)] text-sm font-bold text-[var(--forest)]">
                {row.step}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {row.who} — <span className="text-[var(--forest)]">{row.time}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">{row.what}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">दो और नियम जो जानने लायक हैं</h2>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--ink-muted)]">
          <li className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <strong className="text-[var(--ink)]">90 दिन की सीमा।</strong> अगर आपकी शिकायत के 90 दिन
            के भीतर कोई कानूनी आदेश (कोर्ट का आदेश या उसके बराबर) नहीं आता, तो बैंक अवधि खत्म होने से
            15 दिन पहले पुलिस को सूचित करता है और — ज़रूरी जांच और आपके अनुरोध के बाद — होल्ड हटाकर
            NCRP-CFCFRMS रिकॉर्ड अपडेट कर सकता है। अगर आपका फ्रीज़ महीनों पुराना है और कोई आदेश नहीं
            है, तो इसका हवाला दें।
          </li>
          <li className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <strong className="text-[var(--ink)]">छोटी विवादित रकम (₹50,000 से कम)।</strong> SOP
            ₹50,000 से कम के मामलों में कोर्ट के आदेश के बिना रिलीज़/रिफंड आसान बनाती है। अगर आपकी
            विवादित रकम छोटी है, तो अपनी शिकायत में यह साफ-साफ लिखें।
          </li>
        </ul>
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">घड़ी असल में कैसे शुरू करें</h2>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-relaxed text-[var(--ink-muted)]">
          <li>
            <strong className="text-[var(--ink)]">सबसे पहले सरकारी पोर्टल पर रिपोर्ट करें</strong> —{' '}
            <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--color-sky-deep)] underline underline-offset-2">
              cybercrime.gov.in
            </a>{' '}
            पर, या <a href="tel:1930" className="font-medium text-[var(--color-sky-deep)] underline underline-offset-2">1930</a> पर कॉल करें।
            NCRP पावती नंबर संभालकर रखें — आगे के हर कदम पर यह मांगा जाता है।
          </li>
          <li>
            <strong className="text-[var(--ink)]">अपनी होम ब्रांच में लिखित शिकायत जमा करें</strong>{' '}
            — अपने सबूतों के बंडल के साथ, और स्टाम्प लगी पावती पर ज़ोर दें। इसी से बैंक की 7 दिन की
            घड़ी शुरू होती है।
          </li>
          <li>
            <strong className="text-[var(--ink)]">गलत तरीके से फ्रीज़ हुआ है?</strong> सरकारी GRM पोर्टल इस्तेमाल करें:{' '}
            <a href="https://ncrp-grievanceredressal.mha.gov.in/" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--color-sky-deep)] underline underline-offset-2">
              ncrp-grievanceredressal.mha.gov.in
            </a>
          </li>
          <li>
            <strong className="text-[var(--ink)]">बैंक 30 दिन से जवाब नहीं दे रहा?</strong> RBI
            Ombudsman के पास मुफ्त शिकायत करें —{' '}
            <a href="https://cms.rbi.org.in" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--color-sky-deep)] underline underline-offset-2">
              cms.rbi.org.in
            </a>{' '}
            पर, या <a href="tel:14448" className="font-medium text-[var(--color-sky-deep)] underline underline-offset-2">14448</a> पर कॉल करें।
          </li>
        </ol>
        <p className="mt-4 text-sm text-[var(--ink-muted)]">
          Unhold इनमें से हर कदम के लिए शिकायत-पत्र, सबूतों का बंडल और चेकलिस्ट तैयार करता है —{' '}
          <Link href="/start" className="font-semibold text-[var(--color-sky-deep)] underline underline-offset-2">
            अपना केस शुरू करें
          </Link>{' '}
          और आपको अपने फ्रीज़ के प्रकार के हिसाब से दस्तावेज़ मिलेंगे।
        </p>
      </article>

      <article className="u-card animate-fade-up border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
        <h2 className="type-display text-base text-amber-900">SOP की ईमानदार सीमाएं</h2>
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          <li>SOP एक कार्यकारी प्रक्रिया है, कानून (statute) नहीं — बैंकों और राज्यों में इसका पालन अब भी एक जैसा नहीं है।</li>
          <li>फ्रीज़ लगाने से पहले आपको सूचना देना या सुनवाई का मौका देना इसमें ज़रूरी नहीं है।</li>
          <li>दूसरे राज्य से जुड़े मामले अब भी धीमे चलते हैं; ₹50,000 से ऊपर के मामलों में तय समय-सीमाएं कम हैं।</li>
          <li>
            ऊपर दिए गए दिनों की गिनती 02-01-2026 के SOP टेक्स्ट की कानूनी समीक्षाओं पर आधारित है।
            पत्रों में इन्हें हमेशा &ldquo;MHA SOP के अनुसार&rdquo; लिखें, और मानकर चलें कि अंतिम टेक्स्ट अधिकारी के पास होगा।
          </li>
        </ul>
        <p className="mt-3 text-xs">
          Unhold कोई लॉ फर्म नहीं है और किसी नतीजे की गारंटी नहीं देता। यह पेज शिक्षा के लिए है, कानूनी सलाह नहीं।
        </p>
      </article>
    </section>
  );
}
