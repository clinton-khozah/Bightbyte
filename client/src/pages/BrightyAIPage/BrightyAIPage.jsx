import React, { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import NavIcon from "../../components/NavIcon/NavIcon";
import "./BrightyAIPage.css";

const renderInline = (value, keyPrefix) => String(value).split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, index) => {
  const key = `${keyPrefix}-${index}`;
  if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
  if (part.startsWith("*") && part.endsWith("*")) return <em key={key}>{part.slice(1, -1)}</em>;
  if (part.startsWith("`") && part.endsWith("`")) return <code key={key}>{part.slice(1, -1)}</code>;
  return part;
});

const tableCells = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

const renderBrightyAnswer = (content) => {
  const lines = String(content || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].trim()) { index += 1; continue; }
    const key = `answer-${index}`;
    if (lines[index].startsWith("```") ) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      index += 1;
      blocks.push(<pre key={key}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = lines[index].match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = heading[1].length === 1 ? "h3" : heading[1].length === 2 ? "h4" : "h5";
      blocks.push(<Tag key={key}>{renderInline(heading[2], key)}</Tag>);
      index += 1;
      continue;
    }
    if (lines[index].includes("|") && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) {
      const headers = tableCells(lines[index]);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|")) rows.push(tableCells(lines[index++]));
      blocks.push(<div className="brighty-table-wrap" key={key}><table><thead><tr>{headers.map((cell, cellIndex) => <th key={`${key}-h${cellIndex}`}>{renderInline(cell, `${key}-h${cellIndex}`)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${key}-r${rowIndex}`}>{headers.map((_, cellIndex) => <td key={`${key}-r${rowIndex}-c${cellIndex}`}>{renderInline(row[cellIndex] || "", `${key}-r${rowIndex}-c${cellIndex}`)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^\s*[-*]\s+/.test(lines[index]) || /^\s*\d+[.)]\s+/.test(lines[index])) {
      const ordered = /^\s*\d+[.)]\s+/.test(lines[index]);
      const items = [];
      while (index < lines.length && (ordered ? /^\s*\d+[.)]\s+/.test(lines[index]) : /^\s*[-*]\s+/.test(lines[index]))) {
        items.push(lines[index].replace(/^\s*(?:[-*]|\d+[.)])\s+/, ""));
        index += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={key}>{items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>)}</List>);
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s+/.test(lines[index]) && !/^\s*[-*]\s+/.test(lines[index]) && !/^\s*\d+[.)]\s+/.test(lines[index])) paragraph.push(lines[index++]);
    blocks.push(<p key={key}>{paragraph.map((line, lineIndex) => <React.Fragment key={`${key}-${lineIndex}`}>{lineIndex ? <br /> : null}{renderInline(line, `${key}-${lineIndex}`)}</React.Fragment>)}</p>);
  }
  return blocks;
};

const BrightyAIPage = () => {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [connection, setConnection] = useState({ loading: true, available: false, connected: false, account: "", message: "" });
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const bottom = useRef(null);

  const refreshConnection = async () => {
    try {
      const status = await api("/api/brighty/chatgpt/status");
      setConnection({ loading: false, ...status });
    } catch (error) {
      setConnection({ loading: false, available: false, connected: false, account: "", message: error.message });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("chatgpt") === "error") setNotice(params.get("message") || "ChatGPT connection did not complete.");
    if (params.has("chatgpt")) window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    refreshConnection();
    setConversationLoading(true);
    api("/api/brighty/conversation")
      .then((conversation) => setMessages(Array.isArray(conversation.messages) ? conversation.messages : []))
      .catch((error) => {
        if (error.status !== 404) setNotice(error.message || "Could not load your saved conversation.");
      })
      .finally(() => setConversationLoading(false));
  }, [user?.id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const ask = async (value) => {
    const prompt = String(value || question).trim();
    if (!prompt || busy || !connection.connected) return;
    setQuestion("");
    setMessages((current) => [...current, { role: "user", content: prompt, createdAt: new Date().toISOString() }]);
    setBusy(true);
    try {
      const result = await api("/api/brighty/ask", {
        method: "POST",
        body: JSON.stringify({ question: prompt }),
      });
      setMessages((current) => [...current, { role: "assistant", content: result.answer, createdAt: new Date().toISOString() }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error.message || "Brighty couldn’t answer just now. Please try again.", error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const clearConversation = async () => {
    if (busy || conversationLoading || !messages.length) return;
    try {
      await api("/api/brighty/conversation", { method: "DELETE" });
      setMessages([]);
      setNotice("Conversation cleared. Start a fresh chat anytime.");
    } catch (error) {
      setNotice(error.message || "Could not clear your conversation.");
    }
  };

  const connectChatGpt = async (newAccount = false) => {
    setNotice("");
    setConnectionBusy(true);
    try {
      const result = await api("/api/brighty/chatgpt/connect", {
        method: "POST",
        body: JSON.stringify(newAccount ? { new_account: true } : {}),
      });
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setNotice(error.message || "Could not start ChatGPT connection.");
      setConnectionBusy(false);
    }
  };

  const switchChatGptAccount = async () => {
    setNotice("");
    setConnectionBusy(true);
    try {
      await api("/api/brighty/chatgpt/disconnect", { method: "POST", body: JSON.stringify({}) });
      setMessages([]);
      await connectChatGpt(true);
    } catch (error) {
      setNotice(error.message || "Could not switch ChatGPT accounts.");
      setConnectionBusy(false);
    }
  };

  const disconnectChatGpt = async () => {
    setConnectionBusy(true);
    try {
      await api("/api/brighty/chatgpt/disconnect", { method: "POST", body: JSON.stringify({}) });
      setConnection({ ...connection, connected: false, account: "" });
      setMessages([]);
      setNotice("ChatGPT plan disconnected from Brighty.");
    } catch (error) {
      setNotice(error.message || "Could not disconnect ChatGPT.");
    } finally {
      setConnectionBusy(false);
    }
  };

  const suggestions = [
    "Summarise the health of our fleet",
    "What are our biggest operating costs?",
    "Which vehicles need attention?",
    "How has the business changed recently?",
  ];

  return (
    <main className="brighty-page">
      <header className="brighty-header">
        <div className="brighty-mark"><NavIcon name="brighty" /></div>
        <div className="brighty-header__copy">
          <p className="brighty-eyebrow">YOUR FLEET BUSINESS ASSISTANT</p>
          <h1>Brighty AI</h1>
          <p>Ask about your fleet, finances, and what may be coming next.</p>
        </div>
        {connection.connected ? <div className="brighty-account"><span className="brighty-account__email" title={connection.account}>{connection.account}</span><button type="button" onClick={switchChatGptAccount} disabled={connectionBusy}>{connectionBusy ? "Switching…" : "Switch account"}</button><span className="brighty-account__divider" /><button type="button" onClick={disconnectChatGpt} disabled={connectionBusy}>Disconnect</button></div> : <button className="brighty-connect-shortcut" type="button" onClick={connectChatGpt} disabled={!connection.available || connection.loading || connectionBusy}>Connect ChatGPT</button>}
      </header>

      <section className="brighty-chat" aria-label="Brighty AI chat">
        <div className="brighty-chat-toolbar">
          <span>{messages.length ? "Your conversation" : "New conversation"}</span>
          <button className="brighty-clear" type="button" onClick={clearConversation} disabled={!messages.length || busy || conversationLoading} aria-label="Start a new conversation and clear the current chat" title="New conversation">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>
          </button>
        </div>
        <div className="brighty-messages" aria-live="polite">
          {conversationLoading ? <div className="brighty-loading">Loading your conversation…</div> : !messages.length ? (
            <div className="brighty-welcome">
              <div className="brighty-welcome__art" aria-hidden="true">
                <svg viewBox="0 0 440 180" role="presentation">
                  <path className="welcome-road" d="M0 147h440" />
                  <path className="welcome-road-mark" d="M18 147h56m35 0h55m35 0h55m35 0h55m35 0h56" />
                  <path className="welcome-hill" d="M0 120c63-27 92-18 145-5s83 18 139-6 94-28 156-9v47H0z" />
                  <g className="welcome-van">
                    <path d="M104 102h146l27 23v23H94v-34c0-7 4-12 10-12z" />
                    <path d="M251 108v18h24l-21-18z" />
                    <path className="welcome-window" d="M260 117h-9v-10z" />
                    <circle cx="128" cy="148" r="15" /><circle cx="128" cy="148" r="6" />
                    <circle cx="239" cy="148" r="15" /><circle cx="239" cy="148" r="6" />
                    <path className="welcome-van-mark" d="M164 119c0-8 6-14 14-14s14 6 14 14m-24 0h20v15h-20z" />
                  </g>
                  <path className="welcome-spark" d="M330 43v29m-14-14h29m52 22v19m-9-9h19" />
                  <circle className="welcome-dot" cx="68" cy="78" r="3" /><circle className="welcome-dot" cx="370" cy="120" r="2.5" />
                </svg>
              </div>
              <h2>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}.</h2>
              <p>Ask a question in your own words. Brighty can use the fleet records your account is allowed to view.</p>
              {!connection.connected ? <div className="brighty-connect-card"><strong>Use your ChatGPT plan</strong><span>Connect your account to power Brighty’s AI replies.</span><button type="button" onClick={() => connectChatGpt()} disabled={!connection.available || connection.loading || connectionBusy}>{connectionBusy ? "Connecting…" : "Continue with ChatGPT"}</button>{connection.message ? <small>{connection.message}</small> : <small>Your plan’s eligible usage limits apply.</small>}{connection.hasRegistration ? <><button className="brighty-account-switch" type="button" onClick={switchChatGptAccount} disabled={!connection.available || connectionBusy}>Use a different ChatGPT account</button><small>If ChatGPT selects the wrong account automatically, sign out of ChatGPT in this browser first.</small></> : null}</div> : <div className="brighty-suggestions">
                {suggestions.map((item) => <button key={item} type="button" disabled={busy} onClick={() => ask(item)}>{item}<span>↗</span></button>)}
              </div>}
            </div>
          ) : null}

          {messages.map((message, index) => (
            <article key={`${index}-${message.role}`} className={`brighty-message brighty-message--${message.role}`}>
              <div className={`brighty-message__avatar${message.role === "assistant" ? " brighty-message__avatar--assistant" : ""}`}>
                {message.role === "assistant" ? <NavIcon name="brighty" /> : (user?.full_name || "Y").slice(0, 1).toUpperCase()}
              </div>
              <div className="brighty-message__body">
                <p className="brighty-message__name">{message.role === "assistant" ? "Brighty" : "You"}</p>
                <div className={`brighty-message__text${message.error ? " is-error" : ""}`}>{renderBrightyAnswer(message.content)}</div>
              </div>
            </article>
          ))}
          {busy ? <div className="brighty-thinking"><span /><span /><span /> Brighty is thinking…</div> : null}
          <div ref={bottom} />
        </div>

        {notice ? <div className="brighty-notice" role="status"><span>{notice}</span></div> : null}
        <div className="brighty-composer-wrap">
          <form className="brighty-composer" onSubmit={(event) => { event.preventDefault(); ask(); }}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); } }}
              placeholder="Ask Brighty about your business…"
              aria-label="Ask Brighty AI"
              rows={2}
              disabled={busy || !connection.connected || conversationLoading}
            />
            <button type="submit" disabled={!question.trim() || busy || !connection.connected || conversationLoading} aria-label="Send question"><span>↑</span></button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default BrightyAIPage;
