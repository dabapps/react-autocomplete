import * as React from 'react';
import * as ReactDOM from 'react-dom';

import StaticData from './static-data';
import AsyncData from './async-data';
import CustomMenu from './custom-menu';
import ManagedMenuVisibility from './managed-menu-visibility';

ReactDOM.render(<StaticData />, document.getElementById('static-data'));
ReactDOM.render(<AsyncData />, document.getElementById('async-data'));
ReactDOM.render(<CustomMenu />, document.getElementById('custom-menu'));
ReactDOM.render(
  <ManagedMenuVisibility />,
  document.getElementById('managed-menu-visibility')
);
