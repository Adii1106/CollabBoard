import React, { useEffect, useState, useRef } from "react"
import { Socket } from "socket.io-client"
import { FiX, FiSend, FiMessageSquare } from "react-icons/fi"

type Props = {
  show: boolean
  onClose: () => void
  socket: Socket
  sessionId: string
  username: string
}

export type ChatMessage = {
  user: string
  text: string
  time: string
  isMe?: boolean
}

export default function ChatModal({
  show,
  onClose,
  socket,
  sessionId,
  username,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, show])

  useEffect(() => {
    const handler = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, { ...msg, isMe: false }])
    }

    socket.on("chat-message", handler)

    return () => {
      socket.off("chat-message", handler)
    }
  }, [socket])

  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) {
      return
    }

    const msg: ChatMessage = {
      user: username,
      text: input,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    socket.emit("chat-message", {
      sessionId,
      msg,
    })

    setMessages((prev) => [...prev, { ...msg, isMe: true }])
    setInput("")
  }

  if (!show) {
    return null
  }

  return (
    <div
      className="glass-panel d-flex flex-column animate-fade-in"
      style={{
        position: "fixed",
        right: 20,
        bottom: 100,
        width: 350,
        height: 500,
        borderRadius: "1rem",
        zIndex: 1000,
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
      }}
    >
      <div className="p-3 border-bottom bg-white bg-opacity-50 d-flex justify-content-between align-items-center backdrop-blur-sm">
        <div className="d-flex align-items-center gap-2 text-primary">
          <FiMessageSquare />
          <h6 className="m-0 fw-bold">Team Chat</h6>
        </div>
        <button className="btn btn-sm btn-light rounded-circle p-1" onClick={onClose}>
          <FiX size={16} />
        </button>
      </div>

      <div className="flex-grow-1 p-3 overflow-auto d-flex flex-column gap-3 bg-white bg-opacity-25">
        {messages.length === 0 && (
          <div className="text-center text-muted mt-5 opacity-50">
            <FiMessageSquare size={32} className="mb-2" />
            <p className="small">No messages yet.<br />Start the conversation!</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`d-flex flex-column ${m.isMe ? "align-items-end" : "align-items-start"}`}
          >
            <div className="d-flex align-items-baseline gap-2 mb-1">
              <span className="small fw-bold text-dark">{m.isMe ? "You" : m.user}</span>
              <span className="small text-muted" style={{ fontSize: "0.7rem" }}>{m.time}</span>
            </div>
            <div
              className={`p-2 px-3 rounded-3 shadow-sm ${m.isMe ? "bg-primary text-white" : "bg-white text-dark"}`}
              style={{ maxWidth: "85%", wordBreak: "break-word" }}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-top bg-white bg-opacity-50 backdrop-blur-sm">
        <div className="input-group">
          <input
            className="form-control border-0 shadow-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{ borderRadius: "0.5rem 0 0 0.5rem" }}
          />
          <button
            type="submit"
            className="btn btn-primary shadow-sm px-3"
            style={{ borderRadius: "0 0.5rem 0.5rem 0" }}
          >
            <FiSend size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
