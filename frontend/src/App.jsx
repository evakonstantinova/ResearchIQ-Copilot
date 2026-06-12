import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, FileText, Sparkles, X } from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

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
  const [paperId, setPaperId] = useState(localStorage.getItem("paper_id"));
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const uploadPaper = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/upload-paper`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to upload paper.");
    }

    const data = await response.json();

    localStorage.setItem("paper_id", data.paper_id);
    setPaperId(data.paper_id);

    return data;
  };

  const handleFileChange = async (event) => {
    const selectedFiles = Array.from(event.target.files);

    const pdfFile = selectedFiles.find((file) =>
      file.name.toLowerCase().endsWith(".pdf")
    );

    if (!pdfFile) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please upload a PDF file first. DOCX support can be added later.",
        },
      ]);
      event.target.value = "";
      return;
    }

    setFiles([pdfFile]);
    setLoading(true);

    try {
      const data = await uploadPaper(pdfFile);

      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: `📄 ${data.filename}`,
        },
        {
          role: "assistant",
          content: "File uploaded. You can now ask me anything about this paper.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error.message,
        },
      ]);
    } finally {
      setLoading(false);
      setFiles([]);
      event.target.value = "";
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const askPaper = async (question) => {
    const currentPaperId = paperId || localStorage.getItem("paper_id");

    const endpoint = currentPaperId ? "/ask-paper" : "/chat";

    const body = currentPaperId
      ? {
          paper_id: currentPaperId,
          question,
        }
      : {
          message: question,
        };

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      localStorage.removeItem("paper_id");
      setPaperId(null);
      throw new Error("Failed to get answer.");
    }

    const data = await response.json();
    return data.answer;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input;

    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setInput("");
    setLoading(true);

    try {
      const answer = await askPaper(userText);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong while contacting the backend. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
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
                Ask a research question or attach a PDF research paper for analysis.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="bubble">{message.content}</div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="bubble typing-dots">...</div>
            </div>
          )}

          <div ref={messagesEndRef} />
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
                accept=".pdf"
                multiple
                onChange={handleFileChange}
              />
            </label>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask ResearchIQ anything..."
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />

            <button onClick={sendMessage} className="send-button" disabled={loading}>
              <Send size={19} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;