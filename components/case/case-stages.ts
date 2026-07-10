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
          title: 'बैंक का इंतज़ार करें — 7 दिन में देखें',
          desc: 'आपने शाखा-पत्र भेज दिया। नियमानुसार बैंक को लगभग 7 दिन में देखना चाहिए। अगर कुछ न हो, तो अगला पत्र (वरिष्ठ अधिकारी) खुल जाता है।',
          cta: null,
          target: null,
          upNext: null,
        }
      : {
          title: 'Wait for the bank — check in 7 days',
          desc: 'You sent your branch letter. By rule, the bank should look at it within about 7 days. If nothing happens, the next letter (senior officer) unlocks.',
          cta: null,
          target: null,
          upNext: null,
        };
  }

  if (track === 'court') {
    return hi
      ? {
          title: 'अदालत का रास्ता — शाखा नहीं हटा सकती',
          desc: 'शाखा-पत्र से आपको आदेश का विवरण मिलना चाहिए। असली रिहाई उसी अदालत से होती है जिसने कुर्की लगाई — अक्सर वकील के ज़रिए।',
          cta: 'अदालत के कदम देखें',
          target: 'authority',
          upNext: null,
        }
      : {
          title: 'Court path — your branch cannot release this',
          desc: 'Your branch letter should get you the order details. Only the court that attached the account can release it — usually with a lawyer.',
          cta: 'See court next steps',
          target: 'authority',
          upNext: null,
        };
  }

  if (track === 'tax') {
    return hi
      ? {
          title: 'टैक्स अधिकारी से संपर्क — शाखा नहीं हटा सकती',
          desc: 'शाखा-पत्र से अटैचमेंट का विवरण माँगें। रोक हटाने का अधिकार टैक्स / GST अधिकारी के पास है।',
          cta: 'टैक्स के कदम देखें',
          target: 'authority',
          upNext: null,
        }
      : {
          title: 'Contact the tax officer — branch cannot release',
          desc: 'Your branch letter asks for attachment details. The tax / GST officer who attached the account is who can release it.',
          cta: 'See tax next steps',
          target: 'authority',
          upNext: null,
        };
  }

  // cyber (default) — real unlock is IO NOC + GRM, not another bank letter alone
  return hi
    ? {
        title: 'अगला कदम: IO को NOC पत्र + GRM',
        desc: 'शाखा ने सिर्फ़ आदेश पर रोक लगाई है। नीचे “अधिकार-पत्र” में जाँच अधिकारी (IO) के लिए NOC पत्र और सरकारी GRM पोर्टल तैयार हैं — वही असली अनफ्रीज़ की तरफ़ ले जाते हैं।',
        cta: 'IO पत्र और GRM खोलें',
        target: 'authority',
        upNext: '7 दिन में बैंक से अपडेट; 15 दिन में IO निर्णय की उम्मीद।',
      }
    : {
        title: 'Next: IO NOC letter + GRM',
        desc: 'Your branch only froze on instruction. Open Authority actions below for the Investigating Officer NOC letter and the official GRM portal — that is what actually moves a cyber freeze.',
        cta: 'Open IO letter & GRM',
        target: 'authority',
        upNext: 'ask the bank for an update in 7 days; the IO is meant to decide in about 15.',
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
          desc: `अपने फ्रीज़ SMS और बैंक स्टेटमेंट से शुरू करें। ${left} और बाकी — लगभग 5 मिनट।`,
          cta: 'दस्तावेज़ जोड़ें',
          target: 'papers',
          upNext: 'अपना पत्र पढ़ें, फिर उसे खुद भेजें।',
        }
      : {
          title: 'Add your papers',
          desc: `Start with your freeze SMS and bank statement. ${left} more to go — about 5 minutes.`,
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
              ? 'यह पत्र शाखा से पूछता है कि रोक किसने लगवाई — असली अनफ्रीज़ बाद में साइबर सेल से होगा। पढ़ें और विवरण जाँचें।'
              : 'हमने आपके जवाबों से शाखा के लिए पत्र लिखा है। इसे पढ़ें और विवरण जाँचें।',
          cta: 'मेरा पत्र खोलें',
          target: 'letter',
          upNext: 'इसे खुद भेजें और अपना प्रूफ सहेजें।',
        }
      : {
          title: 'Read your letter',
          desc:
            track === 'cyber'
              ? 'This letter asks your branch who ordered the freeze — the real unfreeze later needs the cyber cell. Read it and check the details.'
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
          upNext: 'हम जवाब की घड़ी ट्रैक करते हैं।',
        }
      : {
          title: 'Send the letter yourself + proof pack',
          desc: 'Email it or print and take it to your branch. Attach / carry your sealed proof pack. Then save proof that you sent it.',
          cta: 'Open my letter',
          target: 'letter',
          upNext: 'we track the reply clock for you.',
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
      return hi ? 'साइबर सेल / IO / GRM — शाखा अकेले नहीं' : 'Cyber cell / IO / GRM — not branch alone';
    }
    if (track === 'court') {
      return hi ? 'अदालत का रास्ता' : 'Court is the authority';
    }
    if (track === 'tax') {
      return hi ? 'टैक्स अधिकारी का रास्ता' : 'Tax officer is the authority';
    }
    return hi ? '7 शांत दिनों बाद अगला पत्र' : 'Next bank letter after 7 quiet days';
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
