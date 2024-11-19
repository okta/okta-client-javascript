import { Landing } from './Landing';

export function Frame () {
  return (
    <>
      <h1 data-e2e="protected">This is a embedded page!</h1>
      <div className='flex'>
        <div className='flex-1'>
          <Landing />
        </div>
        <div className='flex-1'>
          <iframe src="http://localhost:8080/embedded" data-e2e="iframe"></iframe>
        </div>
      </div>
    </>
  );
}
