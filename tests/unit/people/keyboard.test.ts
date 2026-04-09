import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initSearchClear, initHelpButton } from '../../../src/lib/people/keyboard';

// ---------------------------------------------------------------------------
// initSearchClear()
// ---------------------------------------------------------------------------
describe('initSearchClear()', () => {
  let input: HTMLInputElement;
  let clearBtn: HTMLButtonElement;

  beforeEach(() => {
    input = document.createElement('input');
    input.type = 'text';
    clearBtn = document.createElement('button');
    clearBtn.style.display = 'none';
    document.body.appendChild(input);
    document.body.appendChild(clearBtn);
    initSearchClear(input, clearBtn);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows clear button when input has value', () => {
    input.value = 'test query';
    input.dispatchEvent(new Event('input'));
    expect(clearBtn.style.display).toBe('flex');
  });

  it('hides clear button when input is empty', () => {
    input.value = 'something';
    input.dispatchEvent(new Event('input'));
    expect(clearBtn.style.display).toBe('flex');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(clearBtn.style.display).toBe('none');
  });

  it('clears input value when clear button is clicked', () => {
    input.value = 'query text';
    input.dispatchEvent(new Event('input'));
    clearBtn.click();
    expect(input.value).toBe('');
  });

  it('hides clear button after click', () => {
    input.value = 'text';
    input.dispatchEvent(new Event('input'));
    clearBtn.click();
    expect(clearBtn.style.display).toBe('none');
  });

  it('dispatches input event on clear button click', () => {
    const inputSpy = vi.fn();
    input.addEventListener('input', inputSpy);
    input.value = 'something';
    clearBtn.click();
    expect(inputSpy).toHaveBeenCalled();
  });

  it('focuses the input after clear button click', () => {
    const focusSpy = vi.spyOn(input, 'focus');
    clearBtn.click();
    expect(focusSpy).toHaveBeenCalled();
  });

  it('clear button stays hidden when input was already empty', () => {
    clearBtn.click();
    expect(clearBtn.style.display).toBe('none');
  });

  it('handles rapid successive inputs', () => {
    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    expect(clearBtn.style.display).toBe('flex');
    input.value = 'ab';
    input.dispatchEvent(new Event('input'));
    expect(clearBtn.style.display).toBe('flex');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(clearBtn.style.display).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// initHelpButton()
// ---------------------------------------------------------------------------
describe('initHelpButton()', () => {
  let helpBtn: HTMLElement;
  let modal: HTMLElement;
  let backdrop: HTMLElement;

  beforeEach(() => {
    helpBtn = document.createElement('button');
    modal = document.createElement('div');
    backdrop = document.createElement('div');
    document.body.appendChild(helpBtn);
    document.body.appendChild(modal);
    document.body.appendChild(backdrop);
    initHelpButton(helpBtn, modal, backdrop);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds "visible" class to modal on help button click', () => {
    helpBtn.click();
    expect(modal.classList.contains('visible')).toBe(true);
  });

  it('adds "visible" class to backdrop on help button click', () => {
    helpBtn.click();
    expect(backdrop.classList.contains('visible')).toBe(true);
  });

  it('can be clicked multiple times without error', () => {
    expect(() => {
      helpBtn.click();
      helpBtn.click();
    }).not.toThrow();
    expect(modal.classList.contains('visible')).toBe(true);
  });

  it('handles null modal gracefully', () => {
    const btn2 = document.createElement('button');
    const bd2 = document.createElement('div');
    document.body.appendChild(btn2);
    document.body.appendChild(bd2);
    initHelpButton(btn2, null, bd2);
    expect(() => btn2.click()).not.toThrow();
    expect(bd2.classList.contains('visible')).toBe(true);
  });

  it('handles null backdrop gracefully', () => {
    const btn3 = document.createElement('button');
    const m3 = document.createElement('div');
    document.body.appendChild(btn3);
    document.body.appendChild(m3);
    initHelpButton(btn3, m3, null);
    expect(() => btn3.click()).not.toThrow();
    expect(m3.classList.contains('visible')).toBe(true);
  });

  it('handles both null modal and backdrop', () => {
    const btn4 = document.createElement('button');
    document.body.appendChild(btn4);
    initHelpButton(btn4, null, null);
    expect(() => btn4.click()).not.toThrow();
  });
});
