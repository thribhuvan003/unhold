import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Bank-account freeze: official steps — Unhold',
  description:
    'A careful, citizen-facing checklist for collecting bank-freeze details and using official channels in India.',
};

type Props = { params: Promise<{ locale: string }> };

const OFFICIAL_LINKS = [
  { label: 'National Cyber Crime Reporting Portal', href: 'https://www.cybercrime.gov.in/' },
  { label: 'Money Restoration Module (for fraud victims)', href: 'https://mrm-ncrp.mha.gov.in/' },
  { label: 'RBI Complaint Management System', href: 'https://cms.rbi.org.in/' },
] as const;

function OfficialLinks() {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {OFFICIAL_LINKS.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--color-sky-deep)] underline underline-offset-2"
          >
            {link.label} ↗
          </a>
        </li>
      ))}
    </ul>
  );
}

function EnglishGuide() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="animate-fade-up space-y-3">
        <p className="type-eyebrow">Official-process guide</p>
        <Link href="/guides/sop-2026" locale="hi" lang="hi" className="text-sm font-semibold text-[var(--color-sky-deep)] underline underline-offset-4">
          हिंदी में पढ़ें →
        </Link>
        <h1 className="type-display mt-1 text-3xl sm:text-4xl">Your account is frozen. Start with written facts.</h1>
        <p className="type-lead max-w-prose">
          Unhold is not a government service, a law firm, or a substitute for a lawyer. It helps you prepare a clear package; the bank and competent authority decide what happens to a hold.
        </p>
      </header>

      <article className="u-card animate-fade-up border-[var(--warn)]/30 bg-[var(--warn-muted)] p-5">
        <h2 className="type-display text-lg">Important limit</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">
          The Ministry of Home Affairs has confirmed that an NCRP-CFCFRMS SOP exists. However, Unhold has not treated its exact timelines or remedies as a promise for your individual case. Do not send a legal demand copied from the internet without confirming the facts and getting independent advice where needed.
        </p>
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">What to do first</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--ink)]">
          <li><strong>Ask your bank in writing</strong> for the exact amount under hold, the date, the ordering authority, and the NCRP/FIR or other reference number.</li>
          <li><strong>Submit the request at your branch</strong> and keep a stamped acknowledgement or email receipt. Do not rely only on a phone call.</li>
          <li><strong>Keep the original notice and statement.</strong> Save the freeze message, a relevant account statement, and any prior complaint acknowledgement.</li>
          <li><strong>If you are reporting cybercrime or are a fraud victim,</strong> use the official citizen portal or call 1930 promptly. A report is not a guaranteed account-release mechanism.</li>
          <li><strong>Escalate only with the written record.</strong> Use your bank&apos;s published grievance process. If the issue concerns a bank service deficiency and the bank has not resolved it, consider the RBI CMS. Seek independent legal advice for a court remedy.</li>
        </ol>
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">Use only citizen-facing official sites</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
          Do not try to sign in to internal I4C, ICJS, or Bank/FI staff portals. They are not public citizen submission forms.
        </p>
        <OfficialLinks />
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">What Unhold does and does not do</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
          Unhold can organize your documents, generate a copy-only draft, and keep your own record of steps. It does not contact the bank, police, RBI, or government systems; authenticate a document; decide whether a freeze is lawful; or promise an outcome.
        </p>
      </article>
    </section>
  );
}

function HindiGuide() {
  return (
    <section lang="hi" className="mx-auto max-w-3xl space-y-6">
      <header className="animate-fade-up space-y-3">
        <p className="type-eyebrow">आधिकारिक प्रक्रिया गाइड</p>
        <Link href="/guides/sop-2026" locale="en" lang="en" className="text-sm font-semibold text-[var(--color-sky-deep)] underline underline-offset-4">
          Read in English →
        </Link>
        <h1 className="type-display mt-1 text-3xl sm:text-4xl">खाता फ्रीज़ है। पहले लिखित तथ्य लें।</h1>
        <p className="type-lead max-w-prose">
          Unhold सरकारी सेवा, कानून फर्म या वकील का विकल्प नहीं है। यह आपके दस्तावेज़ व्यवस्थित करने में मदद करता है; रोक पर फैसला बैंक और सक्षम प्राधिकरण लेते हैं।
        </p>
      </header>

      <article className="u-card animate-fade-up border-[var(--warn)]/30 bg-[var(--warn-muted)] p-5">
        <h2 className="type-display text-lg">महत्वपूर्ण सीमा</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">
          गृह मंत्रालय ने NCRP-CFCFRMS SOP होने की पुष्टि की है। लेकिन Unhold इसकी किसी समय-सीमा या उपाय को आपके व्यक्तिगत मामले के लिए वादा नहीं मानता। तथ्य जाँचें और ज़रूरत पड़ने पर स्वतंत्र कानूनी सलाह लें।
        </p>
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">पहले क्या करें</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--ink)]">
          <li><strong>बैंक से लिखित में माँगें</strong> कि कितनी रकम रोकी गई है, तारीख क्या है, रोक किस प्राधिकरण ने लगाई है और NCRP/FIR या अन्य संदर्भ नंबर क्या है।</li>
          <li><strong>शाखा में लिखित अनुरोध जमा करें</strong> और स्टाम्प लगी पावती या ईमेल रसीद रखें। केवल फोन कॉल पर निर्भर न रहें।</li>
          <li><strong>मूल नोटिस और स्टेटमेंट रखें।</strong> फ्रीज़ संदेश, संबंधित बैंक स्टेटमेंट और पुरानी शिकायत की पावती सुरक्षित रखें।</li>
          <li><strong>अगर आप साइबर अपराध रिपोर्ट कर रहे हैं या फ्रॉड के पीड़ित हैं,</strong> आधिकारिक नागरिक पोर्टल इस्तेमाल करें या तुरंत 1930 पर कॉल करें। रिपोर्ट करना खाता खुलने की गारंटी नहीं है।</li>
          <li><strong>लिखित रिकॉर्ड के साथ ही एस्केलेट करें।</strong> बैंक की प्रकाशित शिकायत प्रक्रिया अपनाएँ। बैंक सेवा की कमी पर RBI CMS देखें; अदालत के उपाय के लिए स्वतंत्र कानूनी सलाह लें।</li>
        </ol>
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">केवल नागरिकों के लिए आधिकारिक साइट इस्तेमाल करें</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
          I4C, ICJS या Bank/FI के आंतरिक स्टाफ पोर्टल में साइन-इन करने की कोशिश न करें। वे नागरिकों के लिए आवेदन फॉर्म नहीं हैं।
        </p>
        <OfficialLinks />
      </article>

      <article className="u-card animate-fade-up p-5">
        <h2 className="type-display text-lg">Unhold क्या करता है और क्या नहीं</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
          Unhold दस्तावेज़ व्यवस्थित कर सकता है, कॉपी करने योग्य ड्राफ्ट बना सकता है और आपके कदमों का रिकॉर्ड रख सकता है। यह बैंक, पुलिस, RBI या सरकारी सिस्टम से संपर्क नहीं करता; दस्तावेज़ की प्रामाणिकता तय नहीं करता; किसी रोक को कानूनी/गैर-कानूनी नहीं कहता; और कोई परिणाम नहीं देता।
        </p>
      </article>
    </section>
  );
}

export default async function SopGuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return locale === 'hi' ? <HindiGuide /> : <EnglishGuide />;
}
