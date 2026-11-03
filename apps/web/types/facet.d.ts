declare module '@foundingcreative/facet/js/tips.mjs' {
  export function mountTips(root?: ParentNode): { destroy(): void };
}
declare module '@foundingcreative/facet/js/forms.mjs' {
  export function bindOptionHelpers(root?: ParentNode): void;
  export function bindSliders(root?: ParentNode): void;
  /** The filled share (0 to 100) of a .fc-slider-track at this value. */
  export function sliderShare(value: number, min: number, max: number): number;
}
