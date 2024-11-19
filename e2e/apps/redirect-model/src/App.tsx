import { Outlet } from 'react-router';
import './App.css';


export function App () {
  return (
    <div className='App'>
      <header className='App-header' data-e2e="ready">
        Test Harness App
      </header>
      <Outlet />
    </div>
  );
}
