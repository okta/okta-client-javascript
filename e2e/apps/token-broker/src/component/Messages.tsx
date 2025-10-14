import { useEffect, useState } from 'react';
import { fetchClient } from '@/resourceClient';


let dataFetched = false;

async function fetchData () {
  const useAcr = (new URL(window.location.href).searchParams.get('acr') === "1");
  useAcr && console.log('Making fetch with acr value');
  const url = new URL('/api/messages', window.location.origin);
  if (useAcr) {
    // prompts mock resource server to return "insufficient_user_authentication" error
    // to test the `FetchClient`'s www-auth retry
    url.searchParams.append('acr', '1');
  }
  const response = await fetchClient.fetch(url);
  return response.json();
};

export function Messages () {
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
}
