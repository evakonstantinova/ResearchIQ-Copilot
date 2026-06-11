import { useState } from "react";
import { Paperclip, Send, FileText, Sparkles, X } from "lucide-react";
import "./App.css";

function App() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I’m ResearchIQ Copilot. Ask me about research topics, literature reviews, research gaps, or upload documents for analysis.",
    },
  ]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles((prev) => [...prev, ...selectedFiles].slice(0, 10));
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      {
        role: "assistant",
        content:
          "Backend is not connected yet. Next step: we will connect this chat to FastAPI and OpenAI.",
      },
    ]);

    setInput("");
  };

  if (!started) {
    return (
      <div className="home">
        <div className="hero">
          <div className="logo">
            <Sparkles size={24} />
            <span>ResearchIQ Copilot</span>
          </div>

          <h1>Your AI research assistant</h1>

          <p>
            Chat with research documents, generate literature reviews, identify
            research gaps, compare methodologies, and create research-ready
            outputs.
          </p>

          <button onClick={() => setStarted(true)} className="start-button">
            Start Research Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page no-sidebar">
      <main className="chat-main full">
        <div className="top-bar">
          <div className="top-brand">
            <Sparkles size={18} />
            <span>ResearchIQ Copilot</span>
          </div>
        </div>

        <div className="messages">
          {messages.length === 1 && (
            <div className="clean-welcome">
              <h1>What are you researching today?</h1>
              <p>
                Ask a research question or attach up to 10 PDF/DOCX documents.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="bubble">{message.content}</div>
            </div>
          ))}
        </div>

        <div className="composer-wrap">
          {files.length > 0 && (
            <div className="attached-files">
              {files.map((file, index) => (
                <div className="file-chip" key={index}>
                  <FileText size={15} />
                  <span>{file.name}</span>
                  <button onClick={() => removeFile(index)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="chat-input-area">
            <label className="attach-icon">
              <Paperclip size={21} />
              <input
                type="file"
                accept=".pdf,.docx"
                multiple
                onChange={handleFileChange}
              />
            </label>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask ResearchIQ anything..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />

            <button onClick={sendMessage} className="send-button">
              <Send size={19} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;