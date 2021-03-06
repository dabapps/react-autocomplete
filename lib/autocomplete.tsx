import * as React from 'react';
// eslint-disable-next-line no-duplicate-imports
import type {
  CSSProperties,
  FocusEvent,
  ChangeEvent,
  KeyboardEvent,
  ReactElement,
} from 'react';
import { findDOMNode } from 'react-dom';
import scrollIntoView from 'dom-scroll-into-view';

import type {
  DefaultProps,
  InputProps,
  Props,
  ReturnsSpecificPredicate,
} from './types';

function getScrollOffset(): ScrollOffset {
  return {
    x:
      window.pageXOffset !== undefined
        ? window.pageXOffset
        : (
            document.documentElement ||
            document.body.parentNode ||
            document.body
          ).scrollLeft,
    y:
      window.pageYOffset !== undefined
        ? window.pageYOffset
        : (
            document.documentElement ||
            document.body.parentNode ||
            document.body
          ).scrollTop,
  };
}

export interface State {
  isOpen: boolean;
  highlightedIndex: number | null;
  menuLeft?: number;
  menuTop?: number;
  menuWidth?: number;
}

interface ScrollOffset {
  x: number;
  y: number;
}

class Autocomplete<
  T,
  F1 extends (item: T, value: string) => boolean,
  F2 extends (
    item: F1 extends ReturnsSpecificPredicate<infer R> ? R : T
  ) => boolean
> extends React.Component<Props<T, F1, F2>, State> {
  static defaultProps: DefaultProps = {
    value: '',
    wrapperProps: {},
    wrapperStyle: {
      display: 'inline-block',
    } as const,
    inputProps: {},
    renderInput(props: InputProps) {
      return <input {...props} />;
    },
    onChange() {},
    onSelect() {},
    isItemSelectable(): boolean {
      return true;
    },
    renderMenu(
      items: readonly ReactElement[],
      _value: string,
      style: Partial<CSSProperties>
    ) {
      return <div style={{ ...style, ...this.menuStyle }} children={items} />;
    },
    menuStyle: {
      borderRadius: '3px',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
      background: 'rgba(255, 255, 255, 0.9)',
      padding: '2px 0',
      fontSize: '90%',
      position: 'fixed',
      overflow: 'auto',
      maxHeight: '50%', // TODO: don't cheat, let it flow to the bottom
    } as const,
    autoHighlight: true,
    selectOnBlur: false,
    onMenuVisibilityChange() {},
  };

  public state: State = {
    isOpen: false,
    highlightedIndex: null,
  };
  private _debugStates: { id: number; state: State }[] = [];
  private _scrollTimer: number | undefined | null = null;
  private _ignoreBlur = false;
  private _ignoreFocus = false;
  private _scrollOffset: ScrollOffset | null = null;
  private myRefs: Record<string, HTMLElement | null> = {};

  public blur = (
    ...args: Parameters<HTMLInputElement['blur']>
  ): ReturnType<HTMLInputElement['blur']> => {
    const { input } = this.myRefs;
    if (input instanceof HTMLInputElement) {
      input.blur(...args);
    }
  };
  public checkValidity = (
    ...args: Parameters<HTMLInputElement['checkValidity']>
  ): ReturnType<HTMLInputElement['checkValidity']> | null => {
    const { input } = this.myRefs;
    if (input instanceof HTMLInputElement) {
      return input.checkValidity(...args);
    }

    return null;
  };
  public click = (
    ...args: Parameters<HTMLInputElement['click']>
  ): ReturnType<HTMLInputElement['click']> => {
    const { input } = this.myRefs;
    if (input instanceof HTMLInputElement) {
      input.click(...args);
    }
  };
  public focus = (
    ...args: Parameters<HTMLInputElement['focus']>
  ): ReturnType<HTMLInputElement['focus']> => {
    const { input } = this.myRefs;
    if (input instanceof HTMLInputElement) {
      input.focus(...args);
    }
  };
  public select = (
    ...args: Parameters<HTMLInputElement['select']>
  ): ReturnType<HTMLInputElement['select']> => {
    const { input } = this.myRefs;
    if (input instanceof HTMLInputElement) {
      input.select(...args);
    }
  };
  public setCustomValidity = (
    ...args: Parameters<HTMLInputElement['setCustomValidity']>
  ): ReturnType<HTMLInputElement['setCustomValidity']> => {
    const { input } = this.myRefs;
    if (input instanceof HTMLInputElement) {
      input.setCustomValidity(...args);
    }
  };
  public setSelectionRange = (
    ...args: Parameters<HTMLInputElement['setSelectionRange']>
  ): ReturnType<HTMLInputElement['setSelectionRange']> => {
    const { input } = this.myRefs;
    if (input instanceof HTMLInputElement) {
      input.setSelectionRange(...args);
    }
  };
  public setRangeText = (
    ...args: Parameters<HTMLInputElement['setRangeText']>
  ): ReturnType<HTMLInputElement['setRangeText']> => {
    const { input } = this.myRefs;
    if (input instanceof HTMLInputElement) {
      input.setRangeText(...args);
    }
  };

  componentDidMount(): void {
    if (this.isOpen()) {
      this.setMenuPositions();
    }
  }

  componentWillReceiveProps(nextProps: Props<T, F1, F2>): void {
    if (
      this.state.highlightedIndex !== null &&
      this.state.highlightedIndex >= this.getFilteredItems(this.props).length
    ) {
      return this.setState({ highlightedIndex: null });
    }

    if (
      nextProps.autoHighlight &&
      (this.props.value !== nextProps.value ||
        this.state.highlightedIndex === null)
    ) {
      this.setState(this.maybeAutoCompleteText);
    }
  }

  componentDidUpdate(prevProps: Props<T, F1, F2>, prevState: State): void {
    if (
      (this.state.isOpen && !prevState.isOpen) ||
      ('open' in this.props && this.props.open && !prevProps.open)
    ) {
      this.setMenuPositions();
    }

    this.maybeScrollItemIntoView();
    if (prevState.isOpen !== this.state.isOpen) {
      this.props.onMenuVisibilityChange?.(this.state.isOpen);
    }
  }

  componentWillUnmount(): void {
    if (typeof this._scrollTimer === 'number') {
      window.clearTimeout(this._scrollTimer);
    }
    this._scrollTimer = null;
  }

  storeInput = (el: HTMLInputElement | null): void => {
    this.myRefs.input = el;
  };

  maybeScrollItemIntoView(): void {
    if (this.isOpen() && this.state.highlightedIndex !== null) {
      const itemNode = this.myRefs[`item-${this.state.highlightedIndex}`];
      const menuNode = this.myRefs.menu;
      scrollIntoView(findDOMNode(itemNode), findDOMNode(menuNode), {
        onlyScrollIfNeeded: true,
      });
    }
  }

  isKnownKeyHandler = (
    key: string
  ): key is keyof typeof Autocomplete.keyDownHandlers =>
    key in Autocomplete.keyDownHandlers;

  handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    const { key } = event;

    if (this.isKnownKeyHandler(key)) {
      Autocomplete.keyDownHandlers[key].call<
        Autocomplete<T, F1, F2>,
        [KeyboardEvent<HTMLInputElement>],
        void
      >(this, event);
    } else if (!this.isOpen()) {
      this.setState({
        isOpen: true,
      });
    }
  };

  handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this.props.onChange?.(event, event.target.value);
  };

  static keyDownHandlers = {
    ArrowDown<
      T2,
      F12 extends (item: T2, value: string) => boolean,
      F22 extends (
        item: F12 extends ReturnsSpecificPredicate<infer R> ? R : T2
      ) => boolean
    >(
      this: Autocomplete<T2, F12, F22>,
      event: KeyboardEvent<HTMLInputElement>
    ): void {
      event.preventDefault();
      const items = this.getFilteredItems(this.props);

      if (!items.length) {
        return;
      }

      const { highlightedIndex } = this.state;
      let index = highlightedIndex === null ? -1 : highlightedIndex;
      for (let i = 0; i < items.length; i++) {
        const p = (index + i + 1) % items.length;
        const item = items[p];
        if (
          item &&
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.props.isItemSelectable!(
            item as F12 extends ReturnsSpecificPredicate<infer R> ? R : T2
          )
        ) {
          index = p;
          break;
        }
      }
      if (index > -1 && index !== highlightedIndex) {
        this.setState({
          highlightedIndex: index,
          isOpen: true,
        });
      }
    },

    ArrowUp<
      T2,
      F12 extends (item: T2, value: string) => boolean,
      F22 extends (
        item: F12 extends ReturnsSpecificPredicate<infer R> ? R : T2
      ) => boolean
    >(
      this: Autocomplete<T2, F12, F22>,
      event: KeyboardEvent<HTMLInputElement>
    ): void {
      event.preventDefault();
      const items = this.getFilteredItems(this.props);
      if (!items.length) return;
      const { highlightedIndex } = this.state;
      let index = highlightedIndex === null ? items.length : highlightedIndex;
      for (let i = 0; i < items.length; i++) {
        const p = (index - (1 + i) + items.length) % items.length;
        const item = items[p];
        if (
          item &&
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.props.isItemSelectable!(
            item as F12 extends ReturnsSpecificPredicate<infer R> ? R : T2
          )
        ) {
          index = p;
          break;
        }
      }
      if (index !== items.length) {
        this.setState({
          highlightedIndex: index,
          isOpen: true,
        });
      }
    },

    Enter<
      T2,
      F12 extends (item: T2, value: string) => boolean,
      F22 extends (
        item: F12 extends ReturnsSpecificPredicate<infer R> ? R : T2
      ) => boolean
    >(
      this: Autocomplete<T2, F12, F22>,
      event: KeyboardEvent<HTMLInputElement>
    ): void {
      // Key code 229 is used for selecting items from character selectors (Pinyin, Kana, etc)
      if (event.keyCode !== 13) return;
      // In case the user is currently hovering over the menu
      this.setIgnoreBlur(false);
      if (!this.isOpen()) {
        // menu is closed so there is no selection to accept -> do nothing
        return;
      } else if (this.state.highlightedIndex === null) {
        // input has focus but no menu item is selected + enter is hit -> close the menu, highlight whatever's in input
        this.setState(
          {
            isOpen: false,
          },
          () => {
            const { input } = this.myRefs;

            if (input instanceof HTMLInputElement) {
              input.select();
            }
          }
        );
      } else {
        // text entered + menu item has been highlighted + enter is hit -> update value to that of selected menu item, close the menu
        event.preventDefault();
        const item = this.getFilteredItems(this.props)[
          this.state.highlightedIndex
        ];

        if (item) {
          const value = this.props.getItemValue(
            item as F22 extends ReturnsSpecificPredicate<infer R> ? R : T2
          );
          this.setState(
            {
              isOpen: false,
              highlightedIndex: null,
            },
            () => {
              //this.myRefs.input.focus() // TODO: file issue
              const { input } = this.myRefs;

              if (input instanceof HTMLInputElement) {
                input.setSelectionRange(value.length, value.length);
              }

              this.props.onSelect?.(value, item);
            }
          );
        }
      }
    },

    Escape<
      T2,
      F12 extends (item: T2, value: string) => boolean,
      F22 extends (
        item: F12 extends ReturnsSpecificPredicate<infer R> ? R : T2
      ) => boolean
    >(this: Autocomplete<T2, F12, F22>): void {
      // In case the user is currently hovering over the menu
      this.setIgnoreBlur(false);
      this.setState({
        highlightedIndex: null,
        isOpen: false,
      });
    },

    Tab<
      T2,
      F12 extends (item: T2, value: string) => boolean,
      F22 extends (
        item: F12 extends ReturnsSpecificPredicate<infer R> ? R : T2
      ) => boolean
    >(this: Autocomplete<T2, F12, F22>): void {
      // In case the user is currently hovering over the menu
      this.setIgnoreBlur(false);
    },
  };

  getFilteredItems(
    props: Props<T, F1, F2>
  ): F1 extends ReturnsSpecificPredicate<infer R> ? readonly R[] : readonly T[];
  getFilteredItems(props: Props<T, F1, F2>): readonly T[] {
    const { shouldItemRender, sortItems } = props;
    let { items } = props;

    if (shouldItemRender) {
      items = items.filter((item) => shouldItemRender(item, props.value ?? ''));
    }

    if (sortItems) {
      return [...items].sort((a, b) => sortItems(a, b, props.value ?? ''));
    }

    return items;
  }

  maybeAutoCompleteText = (
    state: State,
    props: Props<T, F1, F2>
  ): Pick<State, 'highlightedIndex'> => {
    const { highlightedIndex } = state;
    const { value, getItemValue } = props;
    let index = highlightedIndex === null ? 0 : highlightedIndex;
    const items = this.getFilteredItems(props);

    for (let i = 0; i < items.length; i++) {
      const item = items[index];
      if (
        item &&
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        props.isItemSelectable!(
          item as F1 extends ReturnsSpecificPredicate<infer R> ? R : T
        )
      ) {
        break;
      }

      index = (index + 1) % items.length;
    }
    const item = items[index];
    const matchedItem =
      item &&
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      props.isItemSelectable!(
        item as F1 extends ReturnsSpecificPredicate<infer R> ? R : T
      )
        ? item
        : null;

    if (value !== '' && matchedItem) {
      const itemValue = getItemValue(
        matchedItem as F2 extends ReturnsSpecificPredicate<infer R> ? R : T
      );
      const itemValueDoesMatch =
        itemValue.toLowerCase().indexOf((value ?? '').toLowerCase()) === 0;
      if (itemValueDoesMatch) {
        return { highlightedIndex: index };
      }
    }
    return { highlightedIndex: null };
  };

  setMenuPositions(): void {
    const { input } = this.myRefs;
    if (input) {
      const rect = input.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(input);
      const marginBottom = parseInt(computedStyle.marginBottom, 10) || 0;
      const marginLeft = parseInt(computedStyle.marginLeft, 10) || 0;
      const marginRight = parseInt(computedStyle.marginRight, 10) || 0;
      this.setState({
        menuTop: rect.bottom + marginBottom,
        menuLeft: rect.left + marginLeft,
        menuWidth: rect.width + marginLeft + marginRight,
      });
    }
  }

  highlightItemFromMouse(index: number): void {
    this.setState({ highlightedIndex: index });
  }

  selectItemFromMouse(
    item: F2 extends ReturnsSpecificPredicate<infer R> ? R : T
  ): void {
    const value = this.props.getItemValue(item);
    // The menu will de-render before a mouseLeave event
    // happens. Clear the flag to release control over focus
    this.setIgnoreBlur(false);
    this.setState(
      {
        isOpen: false,
        highlightedIndex: null,
      },
      () => {
        this.props.onSelect?.(value, item);
      }
    );
  }

  setIgnoreBlur(ignore: boolean): void {
    this._ignoreBlur = ignore;
  }

  renderMenu(): ReactElement {
    const items = this.getFilteredItems(this.props).map((item, index) => {
      const element = this.props.renderItem(
        item as F1 extends ReturnsSpecificPredicate<infer R> ? R : T,
        this.state.highlightedIndex === index,
        { cursor: 'default' }
      );
      return React.cloneElement(element, {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        onMouseEnter: this.props.isItemSelectable!(
          item as F1 extends ReturnsSpecificPredicate<infer R> ? R : T
        )
          ? () => this.highlightItemFromMouse(index)
          : null,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        onClick: this.props.isItemSelectable!(
          item as F1 extends ReturnsSpecificPredicate<infer R> ? R : T
        )
          ? () =>
              this.selectItemFromMouse(
                item as F2 extends ReturnsSpecificPredicate<infer R> ? R : T
              )
          : null,
        ref: (e: HTMLElement | null) => (this.myRefs[`item-${index}`] = e),
      });
    });
    const style = {
      left: this.state.menuLeft,
      top: this.state.menuTop,
      minWidth: this.state.menuWidth,
    };
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const menu = this.props.renderMenu!(items, this.props.value ?? '', style);
    return React.cloneElement(menu, {
      ref: (e: HTMLElement | null) => (this.myRefs.menu = e),
      // Ignore blur to prevent menu from de-rendering before we can process click
      onTouchStart: () => this.setIgnoreBlur(true),
      onMouseEnter: () => this.setIgnoreBlur(true),
      onMouseLeave: () => this.setIgnoreBlur(false),
    });
  }

  handleInputBlur = (event: FocusEvent<HTMLInputElement>): void => {
    if (this._ignoreBlur) {
      this._ignoreFocus = true;
      this._scrollOffset = getScrollOffset();
      const { input } = this.myRefs;
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
      return;
    }
    let setStateCallback;
    const { highlightedIndex } = this.state;
    if (this.props.selectOnBlur && highlightedIndex !== null) {
      const items = this.getFilteredItems(this.props);
      const item = items[highlightedIndex];
      if (
        item &&
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.props.isItemSelectable!(
          item as F1 extends ReturnsSpecificPredicate<infer R> ? R : T
        )
      ) {
        const value = this.props.getItemValue(
          item as F2 extends ReturnsSpecificPredicate<infer R> ? R : T
        );
        setStateCallback = () => this.props.onSelect?.(value, item);
      }
    }
    this.setState(
      {
        isOpen: false,
        highlightedIndex: null,
      },
      setStateCallback
    );
    const { onBlur } = this.props.inputProps ?? {};
    if (onBlur) {
      onBlur(event);
    }
  };

  handleInputFocus = (event: FocusEvent<HTMLInputElement>): void => {
    if (this._ignoreFocus && this._scrollOffset) {
      this._ignoreFocus = false;
      const { x, y } = this._scrollOffset;
      this._scrollOffset = null;
      // Focus will cause the browser to scroll the <input> into view.
      // This can cause the mouse coords to change, which in turn
      // could cause a new highlight to happen, cancelling the click
      // event (when selecting with the mouse)
      window.scrollTo(x, y);
      // Some browsers wait until all focus event handlers have been
      // processed before scrolling the <input> into view, so let's
      // scroll again on the next tick to ensure we're back to where
      // the user was before focus was lost. We could do the deferred
      // scroll only, but that causes a jarring split second jump in
      // some browsers that scroll before the focus event handlers
      // are triggered.
      if (typeof this._scrollTimer === 'number') {
        window.clearTimeout(this._scrollTimer);
      }
      this._scrollTimer = window.setTimeout(() => {
        this._scrollTimer = null;
        window.scrollTo(x, y);
      }, 0);
      return;
    }
    this.setState({ isOpen: true });
    const { onFocus } = this.props.inputProps ?? {};
    if (onFocus) {
      onFocus(event);
    }
  };

  isInputFocused(): boolean {
    const el = this.myRefs.input;
    return Boolean(
      el && el.ownerDocument && el === el.ownerDocument.activeElement
    );
  }

  handleInputClick = (): void => {
    // Input will not be focused if it's disabled
    if (this.isInputFocused() && !this.isOpen()) {
      this.setState({ isOpen: true });
    }
  };

  composeEventHandlers<E>(
    internal: (e: E) => void,
    external: undefined | ((e: E) => void)
  ): (e: E) => void {
    return external
      ? (e: E) => {
          internal(e);
          external(e);
        }
      : internal;
  }

  isOpen(): boolean {
    return Boolean('open' in this.props ? this.props.open : this.state.isOpen);
  }

  render(): ReactElement {
    if (this.props.debug) {
      // you don't like it, you love it
      this._debugStates.push({
        id: this._debugStates.length,
        state: this.state,
      });
    }

    const { inputProps } = this.props;
    const open = this.isOpen();
    return (
      <div style={{ ...this.props.wrapperStyle }} {...this.props.wrapperProps}>
        {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
        {this.props.renderInput!({
          ...inputProps,
          role: 'combobox',
          'aria-autocomplete': 'list',
          'aria-expanded': open,
          autoComplete: 'off',
          ref: this.storeInput,
          onFocus: this.handleInputFocus,
          onBlur: this.handleInputBlur,
          onChange: this.handleChange,
          onKeyDown: this.composeEventHandlers(
            this.handleKeyDown,
            inputProps?.onKeyDown
          ),
          onClick: this.composeEventHandlers(
            this.handleInputClick,
            inputProps?.onClick
          ),
          value: this.props.value,
        })}
        {open && this.renderMenu()}
        {this.props.debug && (
          <pre style={{ marginLeft: 300 }}>
            {JSON.stringify(
              this._debugStates.slice(
                Math.max(0, this._debugStates.length - 5),
                this._debugStates.length
              ),
              null,
              2
            )}
          </pre>
        )}
      </div>
    );
  }
}

export default Autocomplete;
