import { Outlet } from 'react-router';
import { isModernBrowser } from '@okta/spa-platform';

import './App.css';


export function App () {
  if (!isModernBrowser()) {
    return (
      <div className='App'>
        <h1>This browser is not supported</h1>
      </div>
    );
  }

  return (
    <div className='App'>
      <Outlet />
    </div>
  );
}
