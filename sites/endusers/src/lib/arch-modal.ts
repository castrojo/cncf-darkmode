import { renderArchModalContent } from './architecture-renderer';
import type { SafeArchitecture } from './architecture-renderer';

// Parse arch data embedded by EndusersLayout at build time.
function getArchData(): Record<string, SafeArchitecture> {
  const el = document.getElementById('arch-data');
  if (!el?.textContent) return {};
  try {
    return JSON.parse(el.textContent) as Record<string, SafeArchitecture>;
  } catch {
    return {};
  }
}

let archDataCache: Record<string, SafeArchitecture> | null = null;

function archData(): Record<string, SafeArchitecture> {
  if (!archDataCache) archDataCache = getArchData();
  return archDataCache;
}

export function openArchModal(slug: string): void {
  const dialog = document.getElementById('arch-modal') as HTMLDialogElement | null;
  const content = document.getElementById('arch-modal-content');
  const extLink = document.getElementById('arch-modal-ext-link') as HTMLAnchorElement | null;
  if (!dialog || !content) return;

  const arch = archData()[slug];
  if (!arch) return;

  content.innerHTML = renderArchModalContent(arch);

  if (extLink) {
    extLink.href = arch.archUrl;
    extLink.textContent = `View ${arch.orgName} Architecture →`;
  }

  dialog.showModal();

  // Scroll inner content to top on open.
  const inner = dialog.querySelector('.arch-modal-dialog') as HTMLElement | null;
  if (inner) inner.scrollTop = 0;
}

export function closeArchModal(): void {
  const dialog = document.getElementById('arch-modal') as HTMLDialogElement | null;
  dialog?.close();
}

export function initArchModal(): void {
  const dialog = document.getElementById('arch-modal') as HTMLDialogElement | null;
  if (!dialog) return;

  // Close button.
  document.getElementById('arch-modal-close')?.addEventListener('click', closeArchModal);

  // Backdrop click — the <dialog> element fills the viewport; a click directly on it
  // (not on the inner .arch-modal-dialog) means the user clicked the backdrop.
  dialog.addEventListener('click', (e: MouseEvent) => {
    if (e.target === dialog) closeArchModal();
  });

  // Escape is handled natively by <dialog> — no extra listener needed.
}
