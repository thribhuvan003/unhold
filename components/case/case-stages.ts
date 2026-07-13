/**
 * Pure stage machine for the case page — furthest milestone wins, never
 * regresses. Progress is track-aware: cyber freezes do not pretend “wait for
 * the bank” is the whole path after Letter 1.
 */

import type { UnfreezeTrack } from '@/lib/case/unfreeze-path';

export type CaseStageInput = {
  /** Who can actually lift this freeze (from getUnfreezePath). */
  track: UnfreezeTrack;
  /** Sha-verified core papers. Letter unlocks on notice + statement; PAN helps. */
  hasFreezeNotice: boolean;
  hasBankStatement: boolean;
  hasPan: boolean;
  l1Drafted: boolean;
  l1Sent: boolean;
};

export type StageTarget = 'papers' | 'letter' | 'path' | 'authority' | null;

export type StageRowModel = {
  title: string;
  note: string;
  state: 'done' | 'current' | 'ready' | 'locked';
  /** Which sub-page / anchor the row's Open button targets. */
  target: StageTarget;
};

export type DoThisNowModel = {
  title: string;
  desc: string;
  cta: string | null;
  target: StageTarget;
  upNext: string | null;
};

export type CaseStageModel = {
  /** 0-based index of the current stage. */
  current: number;
  /** 1-based step number for the "Step N of 5" line. */
  stageNum: number;
  stageTitle: string;
  letterUnlocked: boolean;
  stages: StageRowModel[];
  doNow: DoThisNowModel;
};

const STAGE_TITLES_EN = [
  'Tell your story',
  'Add your papers',
  'Read your letter',
  'Send it yourself',
  'Follow the real path',
] as const;

const STAGE_TITLES_HI = [
  'अपनी कहानी बताएं',
  'अपने दस्तावेज़ जोड़ें',
  'अपना पत्र पढ़ें',
  'खुद भेजें',
  'असली रास्ता अपनाएँ',
] as const;

function postSendDoNow(track: UnfreezeTrack, hi: boolean): DoThisNowModel {
  if (track === 'branch') {
    return hi
      ? {
          title: 'बैंक की बताई हुई जवाब की तारीख का पालन करें',
          desc: 'आपने शाखा-पत्र भेज दिया। उसकी रसीद संभालकर रखें और बैंक की बताई हुई जवाब की तारीख पर फ़ॉलो-अप करें। जवाब न मिले तो बैंक के सत्यापित शिकायत चैनल का उपयोग करें।',
          cta: null,
          target: null,
          upNext: null,
        }
      : {
          title: 'Follow the bank’s stated response date',
          desc: 'You sent your branch letter. Keep its acknowledgement and follow up on the response date the bank gives you. If it does not respond, use the bank’s verified grievance channel.',
          cta: null,
          target: null,
          upNext: null,
        };
  }

  if (track === 'court') {
    return hi
      ? {
          title: 'अदालत का विवरण और संदर्भ लें',
          desc: 'बैंक से ठीक अदालत और आदेश / केस संदर्भ लिखित में लें। उसी अदालत के सत्यापित आधिकारिक चैनल से आगे बढ़ें; ज़रूरत हो तो किसी योग्य वकील की मदद लें।',
          cta: 'अदालत के कदम देखें',
          target: 'authority',
          upNext: null,
        }
      : {
          title: 'Get the court details and reference',
          desc: 'Ask the bank in writing for the exact court and order or case reference. Continue through that court’s verified official channel; use a qualified lawyer if needed.',
          cta: 'See court next steps',
          target: 'authority',
          upNext: null,
        };
  }

  if (track === 'tax') {
    return hi
      ? {
          title: 'टैक्स अधिकारी और संदर्भ की पुष्टि करें',
          desc: 'बैंक से संबंधित टैक्स / GST अधिकारी और अटैचमेंट संदर्भ लिखित में लें। उसी अधिकारी के सत्यापित आधिकारिक चैनल से आगे बढ़ें।',
          cta: 'टैक्स के कदम देखें',
          target: 'authority',
          upNext: null,
        }
      : {
          title: 'Confirm the tax authority and reference',
          desc: 'Ask the bank in writing for the tax or GST authority and attachment reference. Continue through that authority’s verified official channel.',
          cta: 'See tax next steps',
          target: 'authority',
          upNext: null,
        };
  }

  // Cyber holds need the exact ordering authority and reference, not a branch-only assumption.
  return hi
    ? {
        title: 'अगला कदम: सही अधिकारी और संदर्भ की पुष्टि करें',
        desc: 'बैंक से लिखित में पूछें कि रोक किस अधिकारी / एजेंसी के निर्देश पर लगी और उसका संदर्भ क्या है। प्रतिनिधित्व उसी अधिकारी के सत्यापित आधिकारिक चैनल से भेजें।',
        cta: 'अधिकारी का विवरण देखें',
        target: 'authority',
        upNext: 'प्राप्तकर्ता की बताई हुई जवाब की तारीख का पालन करें। RBI CMS केवल योग्य बैंक-सेवा शिकायत के लिए है।',
      }
    : {
        title: 'Next: confirm the exact authority and reference',
        desc: 'Ask the bank in writing which authority or agency ordered the hold and for its reference. Send your representation through that authority’s verified official channel.',
        cta: 'See authority details',
        target: 'authority',
        upNext: 'Follow the recipient’s stated response date. RBI CMS is only for an eligible bank-service complaint.',
      };
}

export function computeCaseStages(input: CaseStageInput, locale = 'en'): CaseStageModel {
  const { track, hasFreezeNotice, hasBankStatement, hasPan, l1Drafted, l1Sent } = input;
  const hi = locale === 'hi';
  const titles = hi ? STAGE_TITLES_HI : STAGE_TITLES_EN;
  const coreDocsCount = [hasFreezeNotice, hasBankStatement, hasPan].filter(Boolean).length;
  // Mirrors the letter page's evidence gate: the drafter needs the freeze
  // notice and the bank statement specifically — PAN is optional but helps.
  const letterUnlocked = hasFreezeNotice && hasBankStatement;

  const done = [true, coreDocsCount === 3, l1Drafted, l1Sent, false];
  let current: number;
  if (l1Sent) current = 4;
  else if (l1Drafted) current = 3;
  else if (coreDocsCount === 3) current = 2;
  else current = 1;

  let doNow: DoThisNowModel;
  if (!letterUnlocked) {
    const left = (hasFreezeNotice ? 0 : 1) + (hasBankStatement ? 0 : 1);
    doNow = hi
      ? {
          title: 'अपने दस्तावेज़ जोड़ें',
          desc: `अपने फ्रीज़ SMS और बैंक स्टेटमेंट से शुरू करें। ${left} और बाकी।`,
          cta: 'दस्तावेज़ जोड़ें',
          target: 'papers',
          upNext: 'अपना पत्र पढ़ें, फिर उसे खुद भेजें।',
        }
      : {
          title: 'Add your papers',
          desc: `Start with your freeze SMS and bank statement. ${left} more to go.`,
          cta: 'Add papers',
          target: 'papers',
          upNext: 'read your letter, then send it yourself.',
        };
  } else if (!l1Drafted) {
    doNow = hi
      ? {
          title: 'अपना पत्र पढ़ें',
          desc:
            track === 'cyber'
              ? 'यह पत्र शाखा से रोक लगाने वाले अधिकारी और संदर्भ की जानकारी माँगता है। पढ़ें और विवरण जाँचें।'
              : 'हमने आपके जवाबों से शाखा के लिए पत्र लिखा है। इसे पढ़ें और विवरण जाँचें।',
          cta: 'मेरा पत्र खोलें',
          target: 'letter',
          upNext: 'इसे खुद भेजें और अपना प्रूफ सहेजें।',
        }
      : {
          title: 'Read your letter',
          desc:
            track === 'cyber'
              ? 'This letter asks your branch for the authority and reference behind the hold. Read it and check the details.'
              : 'We wrote your branch letter from your answers. Read it and check the details.',
          cta: 'Open my letter',
          target: 'letter',
          upNext: 'send it yourself and save your proof.',
        };
  } else if (!l1Sent) {
    doNow = hi
      ? {
          title: 'पत्र खुद भेजें + प्रूफ पैक',
          desc: 'ईमेल करें या प्रिंट करके शाखा ले जाएँ। सीलबंद प्रूफ पैक साथ अटैच / साथ रखें। फिर अपना भेजने का प्रूफ सहेजें।',
          cta: 'मेरा पत्र खोलें',
          target: 'letter',
          upNext: 'रसीद संभालकर रखें और प्राप्तकर्ता की बताई हुई जवाब की तारीख का पालन करें।',
        }
      : {
          title: 'Send the letter yourself + proof pack',
          desc: 'Email it or print and take it to your branch. Attach / carry your sealed proof pack. Then save proof that you sent it.',
          cta: 'Open my letter',
          target: 'letter',
          upNext: 'Keep the acknowledgement and follow the recipient’s stated response date.',
        };
  } else {
    doNow = postSendDoNow(track, hi);
  }

  const lockRule = [false, false, !letterUnlocked, !l1Drafted, !l1Sent];
  const stage5Note = (() => {
    if (!l1Sent) {
      return hi ? 'पत्र भेजने के बाद खुलता है' : 'Opens after you send the letter';
    }
    if (track === 'cyber') {
      return hi ? 'सही अधिकारी और संदर्भ की पुष्टि करें' : 'Confirm the exact authority and reference';
    }
    if (track === 'court') {
      return hi ? 'अदालत का रास्ता' : 'Court is the authority';
    }
    if (track === 'tax') {
      return hi ? 'टैक्स अधिकारी का रास्ता' : 'Tax officer is the authority';
    }
    return hi ? 'बैंक की बताई हुई जवाब की तारीख का पालन करें' : 'Follow the bank’s stated response date';
  })();

  const notes = hi
    ? [
        'आपकी कहानी सहेज ली गई',
        coreDocsCount === 3
          ? 'तीनों जोड़ दिए'
          : `3 में से ${coreDocsCount} जोड़े${coreDocsCount === 2 ? ' — आखिरी वैकल्पिक है पर मदद करता है' : ''}`,
        letterUnlocked ? 'पढ़ने को तैयार' : '2 दस्तावेज़ जुड़ने पर खुलता है',
        l1Sent ? 'भेजा गया — प्रूफ सहेजा गया' : 'आप भेजते हैं — हम कभी नहीं',
        stage5Note,
      ]
    : [
        'Your story is saved',
        coreDocsCount === 3
          ? 'All 3 added'
          : `${coreDocsCount} of 3 added${coreDocsCount === 2 ? ' — last one is optional but helps' : ''}`,
        letterUnlocked ? 'Ready to read' : 'Opens when 2 papers are added',
        l1Sent ? 'Sent — proof saved' : 'You send it — never us',
        stage5Note,
      ];

  const stage5Target: StageTarget =
    l1Sent && (track === 'cyber' || track === 'court' || track === 'tax')
      ? 'authority'
      : l1Sent
        ? 'path'
        : null;
  const targets: StageTarget[] = [null, 'papers', 'letter', 'letter', stage5Target];

  const stages: StageRowModel[] = titles.map((title, i) => {
    const isDone = done[i]!;
    const isCurrent = i === current;
    const locked = !isDone && !isCurrent && lockRule[i];
    const state: StageRowModel['state'] = isDone
      ? 'done'
      : isCurrent
        ? 'current'
        : locked
          ? 'locked'
          : 'ready';
    const showGo = (isCurrent || state === 'ready') && !!targets[i] && !(i === 1 && isDone);
    return {
      title,
      note: notes[i]!,
      state,
      target: showGo ? targets[i]! : null,
    };
  });

  return {
    current,
    stageNum: current + 1,
    stageTitle: titles[current]!,
    letterUnlocked,
    stages,
    doNow,
  };
}
