import { useEffect, useState } from 'react';
import { Credential, type FetchClient } from '@okta/spa-platform';

// NOTE: This HOC-like pattern is just to make the test app less complex
// The recommended way to do this in a real app is instantinating a singleton
// instance of `FetchClient` and importing it into a `Messages.tsx` file
export function createMessageComponent (fetchClient: FetchClient) {
  let dataFetched = false;
  
  async function fetchData () {
    // const response = await fetch('/api/messages');
    const response = await fetchClient.fetch('/api/messages');
    return response.json();
  };
  
  return function Messages () {
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(false);
  
    const getMessages = async () => {
      setMessages([]);
      try {
        const messages = await fetchData();
        setMessages(messages);
        setError(false);
      }
      catch (err) {
        console.log(err);
        if (err instanceof Error) {
          setError(true);
          return;
        }
      }
    };

    const handleClearCreds = async () => {
      Credential.clear();
    };
  
    useEffect(() => {
      if (dataFetched) {
        return;
      }
  
      dataFetched = true;
      getMessages();
    }, []);
  
    return (
      <div className='messages'>
        <h3>Messages</h3>
        <div>
          <button onClick={getMessages} data-e2e="refreshMsgsBtn">Refresh Messages</button>
          <button onClick={handleClearCreds} data-e2e="clearCredentials">Clear Credentials</button>
        </div>
        { error && (<p>Please login</p>) }
        { !error && messages.length < 1 && (<div data-e2e="msg-loader">Loading...</div>) }
        { !error && messages.length >= 1 && (
          <div className='message-container' data-e2e="msg-container">
            { messages.map(msg => (
              <div className='message' key={msg}>{msg}</div>
            ))}
          </div>
        )}
      </div>
    );
  };
}
