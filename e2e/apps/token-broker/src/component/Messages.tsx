import { useEffect, useState } from 'react';
import { fetchClient } from '@/resourceClient';


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
