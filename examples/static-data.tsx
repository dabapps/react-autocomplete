import * as React from 'react';
// eslint-disable-next-line no-duplicate-imports
import type { ChangeEvent, ReactElement } from 'react';

import { getStates, matchStateToTerm, sortStates } from '../lib/utils';
import Autocomplete from '../lib';

class App extends React.Component {
  state = { value: 'Ma' };
  render(): ReactElement {
    return (
      <section>
        <h2>Basic Example with Static Data</h2>
        <p>
          When using static data, you use the client to sort and filter the
          items, so <code>Autocomplete</code> has methods baked in to help.
        </p>
        <label htmlFor="states-static-data">Choose a state from the US</label>
        <Autocomplete
          value={this.state.value}
          inputProps={{ id: 'states-static-data' }}
          wrapperStyle={{ position: 'relative', display: 'inline-block' }}
          items={getStates()}
          getItemValue={(item) => item.name}
          shouldItemRender={matchStateToTerm}
          sortItems={sortStates}
          onChange={(_event: ChangeEvent<HTMLInputElement>, value) =>
            this.setState({ value })
          }
          onSelect={(value) => this.setState({ value })}
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
