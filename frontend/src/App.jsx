import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, FileText, Sparkles, X } from "lucide-react";
import "./App.css";
import ReactMarkdown from "react-markdown";

const API_URL = "http://127.0.0.1:8000";
const MAX_FILES = 10;

async function sendChatMessage({ message, files, history }) {
  const formData = new FormData();
  formData.append("message", message);
  formData.append("history", JSON.stringify(history || []));
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }

  return res.json();
}

function fileSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageText({ content }) {
  return (
    <div className="message-text">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function AttachmentList({ files }) {
  if (!files?.length) return null;

  return (
    <div className="message-files">
      {files.map((file, index) => (
        <div className="message-file" key={`${file.name}-${index}`}>
          <FileText size={15} />
          <div>
            <span>{file.name}</span>
            <small>{fileSize(file.size)}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I’m ResearchIQ Copilot. Attach papers or ask me anything about research, methodology, literature, gaps, citations, or similar studies.",
      files: [],
    },
  ]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const addFiles = (incomingFiles) => {
    const accepted = Array.from(incomingFiles || []).filter((file) => {
      const name = file.name.toLowerCase();
      return name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt");
    });

    if (!accepted.length) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please attach PDF, DOCX, or TXT files only.",
          files: [],
        },
      ]);
      return;
    }

    setSelectedFiles((prev) => {
      const merged = [...prev, ...accepted];
      const unique = merged.filter(
        (file, index, arr) =>
          arr.findIndex(
            (x) => x.name === file.name && x.size === file.size && x.lastModified === file.lastModified
          ) === index
      );
      return unique.slice(0, MAX_FILES);
    });
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    const text = input.trim();

    const filesToSend = selectedFiles;

    if ((!text && !filesToSend.length) || loading) return;

    const wantsDoc =
  /doc file|word file|document file|put.*in.*doc|create.*doc/i.test(text);

if (wantsDoc) {
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  setMessages((prev) => [
    ...prev,
    {
      role: "user",
      content: text,
      files: [],
    },
  ]);

  setInput("");
  setLoading(true);

  try {
    if (!lastAssistantMessage) {
      throw new Error("No assistant message found.");
    }

    const res = await fetch(`${API_URL}/create-doc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: lastAssistantMessage.content,
        history: [],
      }),
    });

    if (!res.ok) {
      throw new Error("Document creation failed.");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "researchiq_document.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    pushMessage("assistant", "Done — I created the Word document for you.");
  } catch (err) {
    pushMessage("assistant", "Sorry, I couldn't create the Word document.");
  } finally {
    setLoading(false);
  }

  return;
}

    const userText = text || "Please analyse the attached document.";
    const userMessage = {
      role: "user",
      content: userText,
      files: filesToSend.map((file) => ({ name: file.name, size: file.size })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedFiles([]);
    setLoading(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const data = await sendChatMessage({
        message: userText,
        files: filesToSend,
        history,
      });

      const assistantMessage = {
        role: "assistant",
        content: data.answer,
        files: [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setHistory((prev) => [
        ...prev,
        {
          role: "user",
          content:
            filesToSend.length > 0
              ? `${userText}\n\nAttached files: ${filesToSend.map((f) => f.name).join(", ")}`
              : userText,
        },
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Something went wrong: ${err.message}\n\nMake sure your backend is running with:\ncd backend\nuvicorn main:app --reload`,
          files: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "New chat started. Attach papers or ask me to search literature directly in the conversation.",
        files: [],
      },
    ]);
    setHistory([]);
    setInput("");
    setSelectedFiles([]);
  };

  if (!started) {
    return (
      <div className="home">
        <div className="hero-card">
          <div className="brand-pill">
            <Sparkles size={20} />
            <span>ResearchIQ Copilot</span>
          </div>
          <h1>Your AI research assistant</h1>
          <p>
            Chat with papers, compare documents, find similar literature, search real studies,
            and generate research summaries in one clean dialogue.
          </p>
          <button className="primary-button" onClick={() => setStarted(true)}>
            Start Research Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`chat-shell ${dragging ? "is-dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <header className="top-bar">
        <button className="brand-button" onClick={() => setStarted(false)}>
          <Sparkles size={17} />
          <span>ResearchIQ</span>
        </button>
        <button className="ghost-button" onClick={resetChat}>
          New chat
        </button>
      </header>

      <main className="chat-main">
        <div className="messages">
          {messages.length === 1 && (
            <div className="welcome-inline">
              <h2>What are you researching today?</h2>
              <p>
                Try: “Find similar papers to this PDF”, “summarise this article”, or
                “search recent literature on quantum neural networks”.
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div className={`message-row ${msg.role}`} key={index}>
              <div className="message-inner">
                <AttachmentList files={msg.files} />
                <MessageText content={msg.content} />
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant">
              <div className="message-inner typing-inner">
                <div className="typing-dots" aria-label="ResearchIQ is thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="composer-wrap">
        <div className="composer">
          {selectedFiles.length > 0 && (
            <div className="selected-files">
              {selectedFiles.map((file, index) => (
                <div className="selected-file" key={`${file.name}-${index}`}>
                  <FileText size={15} />
                  <span>{file.name}</span>
                  <small>{fileSize(file.size)}</small>
                  <button onClick={() => removeSelectedFile(index)} title="Remove file">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-row">
            <label className="attach-button" title="Attach PDF, DOCX, or TXT">
              <Paperclip size={21} />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
                disabled={loading}
              />
            </label>

            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              placeholder="Message ResearchIQ…"
              disabled={loading}
              onChange={(e) => {
                setInput(e.target.value);
                resizeTextarea();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />

            <button
              className="send-button"
              onClick={sendMessage}
              disabled={loading || (!input.trim() && selectedFiles.length === 0)}
              title="Send"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        <p className="footer-note">
          ResearchIQ can search live literature through Semantic Scholar when you ask for papers,
          citations, related work, or similar studies.
        </p>
      </footer>
    </div>
  );
}