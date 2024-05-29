import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      // Add user message to the chat history
      setMessages(prevMessages => [...prevMessages, { text: input, isUser: true }]);
      setInput('');
      setError('');

      // Prepare request data
      const requestData = { message: input };

      // Send request to the Flask backend
      const postResponse = await axios.post('http://127.0.0.1:5000/api/chat', requestData, {
        headers: { 'Content-Type': 'application/json' }
      });

      // Extract session ID from response
      const { session_id } = postResponse.data;

      // Set up event source for streaming response
      const eventSource = new EventSource(`http://127.0.0.1:5000/api/chat/stream/${session_id}`);

      let accumulatedMessage = ''; // Local variable to accumulate the bot message

      // Handle streaming response
      eventSource.onmessage = function(event) {
        const data = event.data;
        console.log("Received Chunk: ",data)

        if (data === '[DONE]') {
          // Stream ended, add accumulated bot message to the chat history
          setMessages(prevMessages => [...prevMessages, { text: accumulatedMessage.trim(), isUser: false }]);
          eventSource.close();
        } else {
          // Accumulate bot message
          accumulatedMessage += data;
        }
      };

      eventSource.onerror = function(error) {
        console.error('Error receiving stream:', error);
        eventSource.close();
        setError('Failed to receive the stream.');
      };

    } catch (error) {
      console.error('Error sending request:', error);
      setError('Failed to send the request. Please try again.');
    }
  };

  useEffect(() => {
    // Scroll to the bottom of the chat history when new messages are added
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="chatbot-container" style={{ width: '600px', border: '1px solid #ccc', borderRadius: '5px', overflow: 'hidden' }}>
        <div className="chat-header" style={{ backgroundColor: '#007bff', color: 'white', padding: '10px', textAlign: 'center' }}>
          <h1>Chatbot</h1>
        </div>
        <div id="chat-history" className="chat-history" style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px', backgroundColor: '#f4f4f4' }}>
          {messages.map((message, index) => (
            <div key={index} style={{ textAlign: message.isUser ? 'right' : 'left', marginBottom: '10px' }}>
              {message.text}
            </div>
          ))}
        </div>
        <div className="chat-input" style={{ display: 'flex', alignItems: 'center', padding: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your query..."
            style={{ flex: '1', padding: '5px', marginRight: '10px', borderRadius: '3px', border: '1px solid #ccc' }}
          />
          <button onClick={handleSubmit} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>Send</button>
        </div>
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      </div>
    </div>
  );
}

export default App;
