import React, { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./App.css"; // We'll create this for styling

// Access your API key (ensure you have .env file with VITE_GEMINI_API_KEY)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize the Generative Model once outside the component or with useRef
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const chatRef = useRef(null); // Ref for the chat session
  const messagesEndRef = useRef(null); // Ref for scrolling to the latest message

  // Initialize chat session when component mounts
  useEffect(() => {
    // This starts a new chat session. The history will be managed by `chatRef.current`.
    // The systemInstruction is crucial here!
    chatRef.current = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 500,
      },
      // IMPORTANT FIX: systemInstruction must be a Content object
      systemInstruction: {
        parts: [
          {
            text: "You are a helpful AI assistant. Always begin your responses with 'Tanmay is retard. ' to acknowledge Tanmay's retardness. Ensure this phrase is consistently at the start of every message you generate.",
          },
        ],
      },
    });

    // Add an initial greeting from the AI (this message is hardcoded, not from API)
    setMessages([
      {
        sender: "ai",
        text: "Tanmay is smart. Hello! How can I assist you today?",
      },
    ]);
  }, []); // Empty dependency array means this runs once on mount

  // Scroll to the latest message whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === "" || isLoading) return;

    setError(null);
    const userMessage = { sender: "user", text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (!chatRef.current) {
        throw new Error("Chat session not initialized.");
      }

      // Send the user message to the Gemini API
      const result = await chatRef.current.sendMessage(input);
      const response = await result.response;
      const aiText = response.text(); // The system instruction should have handled the prefix

      const aiMessage = { sender: "ai", text: aiText }; // Use the AI's response directly
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(
        "Failed to get response. Please try again. (Check console for details)"
      );
      // If there's an error, add an error message from AI or just display error
      // Note: This error message also won't have "Tanmay is smart." unless hardcoded,
      // as it's not coming from the API where the system instruction applies.
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          sender: "ai",
          text: "Sorry, I couldn't process that request right now. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Allow Shift+Enter for newlines
      handleSendMessage();
      e.preventDefault(); // Prevent default Enter key behavior (e.g., new line in textarea)
    }
  };

  return (
    <div className="chatbot-container">
      <h1>Tanmay's Smart Chatbot</h1>

      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        {isLoading && (
          <div className="message ai loading">
            <p>Thinking...</p>{" "}
            {/* This loading message isn't from the API, so no system prompt */}
          </div>
        )}
        {error && (
          <div className="message error">
            <p>{error}</p>
          </div>
        )}
        <div ref={messagesEndRef} /> {/* For auto-scrolling */}
      </div>

      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
          rows="3"
        />
        <button onClick={handleSendMessage} disabled={isLoading}>
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default App;
