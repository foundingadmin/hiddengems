// Facet form helpers.
//
// Option helpers (owner decision, 2026-11-02): a helper that explains one option shows only while that
// option is chosen, so helper text never outlives its context. The helper keeps one line reserved while
// empty, so choosing an option never shifts the form; option helpers stay one line long. Put the explanation on the option; the
// select's aria-describedby points at the helper element, which is filled and shown or hidden to match.
//
//   <select class="fc-select" aria-describedby="days-h">
//     <option data-helper="Game days are Sunday, Monday and Thursday." selected>Game days</option>
//     <option>Every day</option>
//   </select>
//   <p class="fc-helper" id="days-h"></p>
//
//   import { bindOptionHelpers } from '@foundingcreative/facet/js/forms.mjs';
//   bindOptionHelpers();

export function bindOptionHelpers(root = document) {
  root.querySelectorAll('select[aria-describedby]').forEach((select) => {
    if (!select.querySelector('option[data-helper]') || select.dataset.fcHelpersBound) return;
    const helper = select.getAttribute('aria-describedby').split(/\s+/)
      .map((id) => document.getElementById(id)).find((el) => el && el.classList.contains('fc-helper'));
    if (!helper) return;
    select.dataset.fcHelpersBound = '1';
    helper.dataset.optionHelper = '';
    const sync = () => {
      const text = select.selectedOptions[0]?.dataset.helper || '';
      helper.textContent = text;
      helper.toggleAttribute('data-empty', !text); // keeps its line, so the form never shifts
    };
    select.addEventListener('change', sync);
    select.form?.addEventListener('reset', () => setTimeout(sync));
    sync();
  });
}

// Slider fill (components/slider.md): keeps --value, the filled share of a .fc-slider-track, in step with
// its value as it moves. Frameworks that render the style themselves can use sliderShare and skip binding.
//
//   import { bindSliders, sliderShare } from '@foundingcreative/facet/js/forms.mjs';
//   bindSliders();
//   <input type="range" className="fc-slider-track" style={{ '--value': sliderShare(value, min, max) }}>

export function sliderShare(value, min, max) {
  return max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
}

export function bindSliders(root = document) {
  root.querySelectorAll('input[type="range"].fc-slider-track').forEach((input) => {
    if (input.dataset.fcSliderBound) return;
    input.dataset.fcSliderBound = '1';
    const sync = () => input.style.setProperty('--value', String(sliderShare(+input.value, +(input.min || 0), +(input.max || 100))));
    input.addEventListener('input', sync);
    sync();
  });
}
