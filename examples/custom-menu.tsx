import * as React from 'react';
// eslint-disable-next-line no-duplicate-imports
import type { ChangeEvent, ReactElement } from 'react';

import Autocomplete from '../lib';
import { fakeCategorizedRequest, USState, Header } from '../lib/utils';

type Props = Record<string, never>;

interface State {
  value: string;
  unitedStates: readonly (USState | Header)[];
  loading: boolean;
}

class App extends React.Component<Props, State> {
  requestTimer: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      value: '',
      unitedStates: [],
      loading: false,
    };
    this.requestTimer = null;
  }

  render(): ReactElement {
    return (
      <section>
        <h2>Custom Menu</h2>
        <p>
          While Autocomplete ships with a decent looking menu, you can control
          the look as well as the rendering of it. In this example we'll group
          the states into the region where they belong.
        </p>
        <label htmlFor="states-custom-menu">Choose a state from the US</label>
        <Autocomplete
          value={this.state.value}
          inputProps={{ id: 'states-custom-menu' }}
          items={this.state.unitedStates}
          getItemValue={(item) => ('header' in item ? '' : item.name)}
          onSelect={(value, state) =>
            this.setState({ value, unitedStates: [state] })
          }
          onChange={(_event: ChangeEvent<HTMLInputElement>, value) => {
            this.setState({ value, loading: true, unitedStates: [] });

            if (typeof this.requestTimer === 'number') {
              window.clearTimeout(this.requestTimer);
            }

            this.requestTimer = fakeCategorizedRequest(value, (items) => {
              this.setState({ unitedStates: items, loading: false });
            });
          }}
          renderItem={(item, isHighlighted) =>
            'header' in item ? (
              <div className="item item-header" key={item.header}>
                {item.header}
              </div>
            ) : (
              <div
                className={`item ${isHighlighted ? 'item-highlighted' : ''}`}
                key={item.abbr}
              >
                {item.name}
              </div>
            )
          }
          renderMenu={(items, value) => (
            <div className="menu">
              {value === '' ? (
                <div className="item">Type of the name of a United State</div>
              ) : this.state.loading ? (
                <div className="item">Loading...</div>
              ) : items.length === 0 ? (
                <div className="item">No matches for {value}</div>
              ) : (
                items
              )}
            </div>
          )}
          isItemSelectable={(item) => !('header' in item)}
        />
      </section>
    );
  }
}

export default App;
