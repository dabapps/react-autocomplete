import * as Enzyme from 'enzyme';
import * as Adapter from 'enzyme-adapter-react-15';

Enzyme.configure({ adapter: new Adapter() });

const noop = () => void 0;
Object.defineProperty(window, 'scrollTo', { value: noop, writable: true });
