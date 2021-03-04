declare module 'dom-scroll-into-view' {
  export interface DOMScrollIntoViewConfig {
    onlyScrollIfNeeded?: boolean;
  }

  export default function scrollIntoView(
    source: HTMLElement,
    parent: HTMLElement,
    config?: DOMScrollIntoViewConfig
  ): void;
}
