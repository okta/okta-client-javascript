import { useMemo, useEffect } from 'react';
import { Credential } from '@okta/spa-platform';
import { Landing } from './Landing';
// import { Messages } from './Messages';

const envId = 'foo';
console.log(envId)
// const channel = new BroadcastChannel('SubAppOrchestrator');
// channel.onmessage = (event) => {
//   const { eventName, requestId, envId, data } = event.data;

//   console.log('hello', envId, data);
//   const responseChannel = new BroadcastChannel(requestId);
//   responseChannel.postMessage(Credential.default?.token.toJSON());
//   responseChannel.close();
// };

function onmessage (event) {
  const { eventName, requestId, envId, data } = event.data;

  console.log('hello', envId, data);
  const responseChannel = new BroadcastChannel(requestId);
  responseChannel.postMessage(Credential.default?.token.toJSON());
  responseChannel.close();
}

export function Frame2 () {
  // const channel = useMemo(() => new BroadcastChannel('SubAppOrchestrator'), []);

  // useEffect(() => {
  //   // const channel = new BroadcastChannel('SubAppOrchestrator');

  //   channel.addEventListener('message', onmessage);

  //   return () => {
  //     channel.removeEventListener('message', onmessage);
  //   }
  // }, [channel]);

  return (
    <>
      <h1 data-e2e="protected">This is a embedded page!</h1>
      <div className='flex'>
        <div className='flex-1'>
          <Landing />
        </div>
        <div className='flex-1'>
          <iframe src="http://localhost:8080/messages" data-e2e="iframe"></iframe>
        </div>
      </div>
    </>
  );
}
