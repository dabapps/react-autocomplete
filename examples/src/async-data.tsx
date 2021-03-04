import * as React from 'react';
// eslint-disable-next-line no-duplicate-imports
import type { ChangeEvent, ReactElement } from 'react';

import Autocomplete from '../../lib';
import { getStates, fakeRequest } from '../../lib/utils';

class App extends React.Component {
  state = {
    value: '',
    unitedStates: getStates(),
  };

  requestTimer: null | number = null;

  render(): ReactElement {
    return (
      <section>
        <h2>Async Data</h2>
        <p>
          Autocomplete works great with async data by allowing you to pass in
          items. The <code>onChange</code> event provides you the value to make
          a server request with, then change state and pass in new items, it
          will attempt to autocomplete the first one.
        </p>
        <label htmlFor="states-async-data">Choose a state from the US</label>
        <Autocomplete
          inputProps={{ id: 'states-async-data' }}
          wrapperStyle={{ position: 'relative', display: 'inline-block' }}
          value={this.state.value}
          items={this.state.unitedStates}
          getItemValue={(item) => item.name}
          onSelect={(value, item) => {
            // set the menu to only the selected item
            this.setState({ value, unitedStates: [item] });
            // or you could reset it to a default list again
            // this.setState({ unitedStates: getStates() })
          }}
          onChange={(_event: ChangeEvent<HTMLInputElement>, value) => {
            this.setState({ value });

            if (typeof this.requestTimer === 'number') {
              window.clearTimeout(this.requestTimer);
            }

            this.requestTimer = fakeRequest(value, (items) => {
              this.setState({ unitedStates: items });
            });
          }}
          renderMenu={(children) => <div className="menu">{children}</div>}
          renderItem={(item, isHighlighted) => (
            <div
              className={`item ${isHighlighted ? 'item-highlighted' : ''}`}
              key={item.abbr}
            >
              {item.name}
            </div>
          )}
        />
      </section>
    );
  }
}

export default App;
