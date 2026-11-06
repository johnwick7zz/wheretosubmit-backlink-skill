# Form tricks

Most retries on a submission form come from four kinds of controls that do not
react to a plain click or a plain `value = ...`. Recognise the kind first, then
use the matching move. Try the move once; if it does not take, the site is a
candidate for the per-site budget in SKILL.md, not for a fifth attempt.

Every snippet below runs in the page (your browser tool's "evaluate" or
"run script" action). Replace the selector; keep the rest. None of them
submits anything.

## 1. Text field that ignores typing (React, Vue, Svelte)

Symptom: the field shows your text, but validation says it is empty, or the
text vanishes on blur. The framework keeps its own state and never saw an
input event.

First choice: use the browser tool's own typing action on the focused field
(real key events), not a value assignment. If that still fails:

```js
(() => {
  const el = document.querySelector('SELECTOR');
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, 'TEXT');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
})();
```

Check: the field's character counter (if any) updates and the submit button
enables. If the counter stays, the site listens to `keydown`; fall back to the
tool's typing action.

## 2. Custom dropdown (Radix, Headless UI, react-select, Ant, MUI)

Symptom: a `<button role="combobox">` or `<div class="select__control">`
instead of a `<select>`; clicking the option does nothing, or the list closes.

Rules:

- Never set the hidden `<select>`'s value directly; the visible control will
  not follow and the form sends the old value.
- Open with the keyboard, not a click: focus the trigger, press `Enter` or
  `ArrowDown`. Then type the first letters of the option and press `Enter`.
  Radix, Headless UI and react-select all support this.
- If the tool only clicks: click the trigger, wait for `[role="listbox"]` or
  `[role="option"]` to exist, then click the option by its text.
- Multi-select chips: pick one option at a time, press `Enter` after each,
  confirm the chip appears before the next.

Check: read the trigger's visible text, not the DOM value.

## 3. Button or field outside the viewport

Symptom: the click lands on nothing, a sticky header, or a cookie banner.

```js
document.querySelector('SELECTOR').scrollIntoView({ block: 'center' });
```

Then take a screenshot and click again. If a banner or modal still covers it,
close the banner (its own close button) rather than removing it from the DOM.
If the control is `disabled`, do not force it; something above is unfilled.

## 4. Rich text editor (TipTap, Quill, Draft.js, contenteditable)

Symptom: a `div[contenteditable="true"]` with a toolbar; `value` does not
exist; paste puts text nowhere or into one line.

```js
(() => {
  const el = document.querySelector('SELECTOR[contenteditable="true"]');
  el.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, 'TEXT');
})();
```

`insertText` fires real input events, which these editors listen to. Give it
plain text; use `\n\n` for a paragraph break. Do not inject HTML.

If the editor is Markdown-based (a toolbar with `**B**` or a preview tab), type
Markdown in the textarea it wraps.

## 5. File upload

- `<input type="file">`, possibly hidden: use the tool's upload action on
  that input, not on the dashed drop zone.
- Only a drop zone with no input: look for the input the zone opens
  (`document.querySelectorAll('input[type=file]')`); it is usually there with
  `display: none`. The upload action works on hidden inputs.
- Size or dimension errors: pick the next smaller asset; never resize by hand
  unless the user asked.

## 6. After any trick

1. Screenshot and re-read the field. Does it show the value?
2. If the site shows a live preview or counter, does it match?
3. Only then move to the next field. A trick that "worked" on one field often
   failed silently on the next.

## What not to do

- Do not remove `disabled`, `required` or `maxlength` attributes.
- Do not submit the form with `form.submit()` or `requestSubmit()`; click the
  real button so the site's own handlers run.
- Do not fill hidden fields (honeypots).
- Do not click anything inside a captcha frame.
