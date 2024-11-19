import { useEffect, useState } from 'react';
import { fetchClient, SAOError } from '@/resourceClient';
import { Credential, Events } from '@okta/spa-platform';

let dataFetched = false;

async function fetchData () {
  // const response = await fetch('/api/messages');
  const response = await fetchClient.fetch('/api/messages');
  return response.json();
};

export function Messages () {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(false);

  const getMessages = async () => {
    try {
      const messages = await fetchData();
      setMessages(messages);
      setError(false);
    }
    catch (err) {
      if (err instanceof SAOError) {
        setError(true);
        return;
      }

      console.log(err);
      throw err;
    }
  };

  useEffect(() => {
    if (dataFetched) {
      return;
    }

    dataFetched = true;
    getMessages();
  }, []);

  useEffect(() => {
    Credential.on(Events.DEFAULT_CHANGED, () => {
      getMessages();
    });
  }, []);

  return (
    <main>
      <hr />
      <h3>Messages</h3>
      <div>
        <button onClick={getMessages}>Refresh Messages</button>
      </div>
      { error && (<p>Please login</p>) }
      { !error && messages.length < 1 && (<div>Loading...</div>) }
      { !error && messages.length >= 1 && (
        <div className='message-container'>
          { messages.map(msg => (
            <div className='message' key={msg}>{msg}</div>
          ))}
        </div>
      )}
    </main>
  );
}
