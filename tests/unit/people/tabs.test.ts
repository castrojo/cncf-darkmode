import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TAB_CATEGORY_MAP, ALPHA_TABS, applyTab } from '../../../src/lib/people/tabs';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ---------------------------------------------------------------------------
// DOM builder helpers
// ---------------------------------------------------------------------------
function buildDOM() {
  document.body.innerHTML = `
    <div id="timeline-feed">
      <div class="day-group">
        <article class="person-card" data-categories="kubestronaut"></article>
        <article class="person-card" data-categories="ambassadors"></article>
      </div>
    </div>
    <div id="memorial-feed" style="display:none"></div>
    <div id="maintainer-feed" style="display:none"></div>
    <div id="maintainer-summary" style="display:none"></div>
    <div class="alpha-feed" data-alpha-tab="staff" style="display:none"></div>
    <div class="alpha-feed" data-alpha-tab="toc" style="display:none"></div>
    <div class="alpha-feed" data-alpha-tab="governing-board" style="display:none"></div>
    <div class="alpha-feed" data-alpha-tab="emeritus" style="display:none"></div>
    <div data-tab-heroes="everyone"></div>
    <div data-tab-heroes="ambassadors"></div>
    <div data-tab-heroes="kubestronauts"></div>
  `;
}

// ---------------------------------------------------------------------------
// TAB_CATEGORY_MAP
// ---------------------------------------------------------------------------
describe('TAB_CATEGORY_MAP', () => {
  it('maps ambassadors tab', () => expect(TAB_CATEGORY_MAP['ambassadors']).toBe('ambassadors'));
  it('maps kubestronauts tab', () => expect(TAB_CATEGORY_MAP['kubestronauts']).toBe('kubestronaut'));
  it('maps toc tab', () => expect(TAB_CATEGORY_MAP['toc']).toBe('technical oversight committee'));
  it('maps tab tab (End User TAB)', () => expect(TAB_CATEGORY_MAP['tab']).toBe('end user tab'));
  it('maps governing-board tab', () => expect(TAB_CATEGORY_MAP['governing-board']).toBe('governing board'));
  it('maps staff tab', () => expect(TAB_CATEGORY_MAP['staff']).toBe('staff'));
});

// ---------------------------------------------------------------------------
// ALPHA_TABS
// ---------------------------------------------------------------------------
describe('ALPHA_TABS', () => {
  it('includes toc', () => expect(ALPHA_TABS.has('toc')).toBe(true));
  it('includes tab (End User TAB)', () => expect(ALPHA_TABS.has('tab')).toBe(true));
  it('includes governing-board', () => expect(ALPHA_TABS.has('governing-board')).toBe(true));
  it('includes staff', () => expect(ALPHA_TABS.has('staff')).toBe(true));
  it('includes maintainers', () => expect(ALPHA_TABS.has('maintainers')).toBe(true));
  it('includes emeritus', () => expect(ALPHA_TABS.has('emeritus')).toBe(true));
  it('does NOT include everyone', () => expect(ALPHA_TABS.has('everyone')).toBe(false));
  it('does NOT include ambassadors', () => expect(ALPHA_TABS.has('ambassadors')).toBe(false));
});

// ---------------------------------------------------------------------------
// applyTab() — DOM manipulation
// ---------------------------------------------------------------------------
describe('applyTab() — timeline (everyone)', () => {
  beforeEach(buildDOM);

  it('shows timeline-feed for everyone tab', () => {
    applyTab('everyone');
    const tf = document.getElementById('timeline-feed')!;
    expect(tf.style.display).not.toBe('none');
  });

  it('hides memorial-feed for everyone tab', () => {
    applyTab('everyone');
    expect(document.getElementById('memorial-feed')!.style.display).toBe('none');
  });

  it('hides maintainer-feed for everyone tab', () => {
    applyTab('everyone');
    expect(document.getElementById('maintainer-feed')!.style.display).toBe('none');
  });

  it('shows all person-cards for everyone tab', () => {
    applyTab('everyone');
    const cards = document.querySelectorAll<HTMLElement>('.person-card');
    cards.forEach(card => expect(card.style.display).not.toBe('none'));
  });

  it('shows hero section matching "everyone" tab', () => {
    applyTab('everyone');
    const everyoneHero = document.querySelector<HTMLElement>('[data-tab-heroes="everyone"]')!;
    expect(everyoneHero.style.display).not.toBe('none');
  });

  it('hides hero sections NOT matching current tab', () => {
    applyTab('everyone');
    const ambassadorHero = document.querySelector<HTMLElement>('[data-tab-heroes="ambassadors"]')!;
    expect(ambassadorHero.style.display).toBe('none');
  });
});

describe('applyTab() — category filtering (ambassadors)', () => {
  beforeEach(buildDOM);

  it('shows timeline-feed for ambassadors tab', () => {
    applyTab('ambassadors');
    expect(document.getElementById('timeline-feed')!.style.display).not.toBe('none');
  });

  it('shows only ambassador cards', () => {
    applyTab('ambassadors');
    const kubeCard = document.querySelector<HTMLElement>('.person-card[data-categories="kubestronaut"]')!;
    const ambassadorCard = document.querySelector<HTMLElement>('.person-card[data-categories="ambassadors"]')!;
    expect(kubeCard.style.display).toBe('none');
    expect(ambassadorCard.style.display).not.toBe('none');
  });

  it('hides day-group when all its cards are hidden', () => {
    // Add a group where all cards are kubestronaut
    document.body.innerHTML += `
      <div class="day-group" id="extra-group">
        <article class="person-card" data-categories="kubestronaut"></article>
      </div>
    `;
    // Re-attach the timeline-feed to include the extra group
    const tf = document.getElementById('timeline-feed')!;
    const extraGroup = document.getElementById('extra-group')!;
    tf.appendChild(extraGroup);
    applyTab('ambassadors');
    expect(extraGroup.style.display).toBe('none');
  });

  it('shows day-group when at least one card is visible', () => {
    applyTab('ambassadors');
    const group = document.querySelector<HTMLElement>('.day-group')!;
    // The group has both a kube card (hidden) and an ambassador card (visible)
    expect(group.style.display).not.toBe('none');
  });
});

describe('applyTab() — alpha tabs (staff)', () => {
  beforeEach(buildDOM);

  it('hides timeline-feed for staff tab', () => {
    applyTab('staff');
    expect(document.getElementById('timeline-feed')!.style.display).toBe('none');
  });

  it('shows staff alpha-feed for staff tab', () => {
    applyTab('staff');
    const staffFeed = document.querySelector<HTMLElement>('.alpha-feed[data-alpha-tab="staff"]')!;
    expect(staffFeed.style.display).not.toBe('none');
  });

  it('hides non-staff alpha feeds when staff tab is active', () => {
    applyTab('staff');
    const tocFeed = document.querySelector<HTMLElement>('.alpha-feed[data-alpha-tab="toc"]')!;
    expect(tocFeed.style.display).toBe('none');
  });

  it('hides maintainer-feed for staff tab', () => {
    applyTab('staff');
    expect(document.getElementById('maintainer-feed')!.style.display).toBe('none');
  });
});

describe('applyTab() — memorial tab', () => {
  beforeEach(buildDOM);

  it('hides timeline-feed for memorial tab', () => {
    applyTab('memorial');
    expect(document.getElementById('timeline-feed')!.style.display).toBe('none');
  });

  it('shows memorial-feed for memorial tab', () => {
    applyTab('memorial');
    expect(document.getElementById('memorial-feed')!.style.display).not.toBe('none');
  });

  it('hides all alpha-feeds for memorial tab', () => {
    applyTab('memorial');
    const alphaFeeds = document.querySelectorAll<HTMLElement>('.alpha-feed');
    alphaFeeds.forEach(f => expect(f.style.display).toBe('none'));
  });
});

describe('applyTab() — maintainers tab', () => {
  beforeEach(buildDOM);

  it('shows maintainer-feed for maintainers tab', () => {
    applyTab('maintainers');
    expect(document.getElementById('maintainer-feed')!.style.display).not.toBe('none');
  });

  it('hides timeline-feed for maintainers tab', () => {
    applyTab('maintainers');
    expect(document.getElementById('timeline-feed')!.style.display).toBe('none');
  });

  it('shows maintainer-summary for maintainers tab', () => {
    applyTab('maintainers');
    expect(document.getElementById('maintainer-summary')!.style.display).not.toBe('none');
  });

  it('hides all alpha-feeds for maintainers tab', () => {
    applyTab('maintainers');
    const alphaFeeds = document.querySelectorAll<HTMLElement>('.alpha-feed');
    alphaFeeds.forEach(f => expect(f.style.display).toBe('none'));
  });
});

describe('applyTab() — toc tab (alpha)', () => {
  beforeEach(buildDOM);

  it('shows toc alpha-feed', () => {
    applyTab('toc');
    const tocFeed = document.querySelector<HTMLElement>('.alpha-feed[data-alpha-tab="toc"]')!;
    expect(tocFeed.style.display).not.toBe('none');
  });

  it('hides staff alpha-feed when toc is active', () => {
    applyTab('toc');
    const staffFeed = document.querySelector<HTMLElement>('.alpha-feed[data-alpha-tab="staff"]')!;
    expect(staffFeed.style.display).toBe('none');
  });
});

describe('applyTab() — kubestronauts category filter', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="timeline-feed">
        <div class="day-group">
          <article class="person-card" data-categories="kubestronaut"></article>
        </div>
      </div>
      <div id="memorial-feed"></div>
      <div id="maintainer-feed"></div>
      <div id="maintainer-summary"></div>
    `;
  });

  it('shows kubestronaut card when kubestronauts tab is active', () => {
    applyTab('kubestronauts');
    const card = document.querySelector<HTMLElement>('.person-card[data-categories="kubestronaut"]')!;
    expect(card.style.display).not.toBe('none');
  });
});

describe('applyTab() — emeritus tab (alpha)', () => {
  beforeEach(buildDOM);

  it('shows emeritus alpha-feed', () => {
    applyTab('emeritus');
    const emeritusFeed = document.querySelector<HTMLElement>('.alpha-feed[data-alpha-tab="emeritus"]')!;
    expect(emeritusFeed.style.display).not.toBe('none');
  });
});

// ---------------------------------------------------------------------------
// initTabs() — event wiring (DOMContentLoaded path)
// ---------------------------------------------------------------------------
import { initTabs } from '../../../src/lib/people/tabs';

describe('initTabs()', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.body.innerHTML = `
      <div id="timeline-feed">
        <div class="day-group">
          <article class="person-card" data-categories="kubestronaut"></article>
        </div>
      </div>
      <div id="memorial-feed"></div>
      <div id="maintainer-feed"></div>
      <div id="maintainer-summary"></div>
      <div class="alpha-feed" data-alpha-tab="staff"></div>
      <div data-tab-heroes="everyone"></div>
      <div data-tab-summary="everyone"></div>
      <div data-tab-summary="kubestronauts"></div>
      <button class="section-link" data-tab="everyone">Everyone</button>
      <button class="section-link" data-tab="kubestronauts">Kubestronauts</button>
      <button class="section-link" data-tab="staff">Staff</button>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorageMock.clear();
  });

  it('does not throw when called', () => {
    expect(() => initTabs()).not.toThrow();
  });

  it('fires DOMContentLoaded and activates saved tab from localStorage', () => {
    localStorageMock.setItem('cncf-people-tab', 'kubestronauts');
    initTabs();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    // The kubestronauts button should be active
    const btn = document.querySelector<HTMLButtonElement>('[data-tab="kubestronauts"]')!;
    expect(btn.classList.contains('active')).toBe(true);
  });

  it('defaults to everyone tab when no saved tab', () => {
    initTabs();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const btn = document.querySelector<HTMLButtonElement>('[data-tab="everyone"]')!;
    expect(btn.classList.contains('active')).toBe(true);
  });

  it('clicking a tab button activates that tab', () => {
    initTabs();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const staffBtn = document.querySelector<HTMLButtonElement>('[data-tab="staff"]')!;
    staffBtn.click();
    expect(staffBtn.classList.contains('active')).toBe(true);
    // everyone should no longer be active
    const everyoneBtn = document.querySelector<HTMLButtonElement>('[data-tab="everyone"]')!;
    expect(everyoneBtn.classList.contains('active')).toBe(false);
  });

  it('clicking a tab saves it to localStorage', () => {
    initTabs();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const kubeBtn = document.querySelector<HTMLButtonElement>('[data-tab="kubestronauts"]')!;
    kubeBtn.click();
    expect(localStorageMock.getItem('cncf-people-tab')).toBe('kubestronauts');
  });

  it('toggles tab-summary visibility on tab click', () => {
    initTabs();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const kubeBtn = document.querySelector<HTMLButtonElement>('[data-tab="kubestronauts"]')!;
    kubeBtn.click();
    const kubeSummary = document.querySelector<HTMLElement>('[data-tab-summary="kubestronauts"]')!;
    const everyoneSummary = document.querySelector<HTMLElement>('[data-tab-summary="everyone"]')!;
    expect(kubeSummary.style.display).not.toBe('none');
    expect(everyoneSummary.style.display).toBe('none');
  });
});
