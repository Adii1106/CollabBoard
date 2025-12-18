import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import { FiPlus, FiLogIn, FiLogOut, FiZap, FiCpu, FiShield, FiShare2, FiEdit3, FiLayout } from "react-icons/fi"

export default function Landing() {
  const nav = useNavigate()
  const [joinId, setJoinId] = useState("")
  const [loading, setLoading] = useState(false)
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    nav("/login")
  }

  const createSession = async () => {
    setLoading(true)
    try {
      const res = await api.post("/api/session/create", {
        name: "My Whiteboard",
      })
      nav(`/session/${res.data.id}`)
    } catch (err) {
      console.error(err)
      alert("Failed to create session")
    } finally {
      setLoading(false)
    }
  }

  const joinSession = async () => {
    if (!joinId) {
      return alert("Please enter session ID")
    }
    setLoading(true)
    try {
      await api.post(`/api/session/join/${joinId}`)
      nav(`/session/${joinId}`)
    } catch (err) {
      console.error(err)
      alert("Failed to join session")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-white overflow-hidden">
      <nav className="navbar navbar-expand-lg fixed-top glass-panel border-0 m-3 rounded-pill shadow-sm animate-fade-in" style={{ zIndex: 100 }}>
        <div className="container px-4">
          <a className="navbar-brand fw-bold d-flex align-items-center gap-2" href="#">
            <div className="bg-primary text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
              <FiZap size={20} />
            </div>
            <span className="text-dark">CollabBoard</span>
          </a>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small d-none d-md-block">
              Hello, <strong className="text-primary">{user.username || "Guest"}</strong>
            </span>
            <button
              className="btn btn-light rounded-pill px-4 btn-sm d-flex align-items-center gap-2 border"
              onClick={handleLogout}
            >
              <FiLogOut /> <span className="d-none d-sm-inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <section className="position-relative min-vh-100 d-flex align-items-center pt-5">
        <div className="position-absolute top-0 start-0 w-100 h-100 mesh-gradient opacity-10" style={{ zIndex: -1 }}></div>

        <div className="container pt-5">
          <div className="row align-items-center gy-5">
            <div className="col-lg-6 animate-fade-in">

              <h1 className="display-3 fw-bold mb-4 text-dark lh-sm">
                Unleash Creativity with <br />
                <span className="text-gradient">Real-time Magic</span>
              </h1>
              <p className="lead text-muted mb-5" style={{ maxWidth: "500px" }}>
                The ultimate whiteboard for teams. Brainstorm, sketch, and collaborate instantly with built-in AI tools and zero latency.
              </p>

              <div className="d-flex flex-column flex-sm-row gap-3">
                <button
                  className="btn btn-primary btn-lg px-5 py-3 rounded-pill shadow-lg animate-pulse-glow border-0"
                  onClick={createSession}
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Start Collaborating"}
                </button>

                <div className="input-group input-group-lg shadow-sm rounded-pill overflow-hidden border-0" style={{ maxWidth: "350px" }}>
                  <input
                    className="form-control border-0 bg-white ps-4"
                    placeholder="Enter Session ID"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                    style={{ fontSize: "1rem" }}
                  />
                  <button
                    className="btn btn-white border-0 text-primary pe-4"
                    onClick={joinSession}
                    disabled={loading}
                  >
                    <FiLogIn size={20} />
                  </button>
                </div>
              </div>

              <div className="mt-5 d-flex align-items-center gap-4 text-muted small">

                <div className="d-flex align-items-center gap-2">
                  <FiShield className="text-primary" /> Secure
                </div>
                <div className="d-flex align-items-center gap-2">
                  <FiZap className="text-primary" /> Fast
                </div>
              </div>
            </div>

            <div className="col-lg-6 d-none d-lg-block">
              <div className="position-relative animate-float">
                <div className="position-absolute top-0 end-0 bg-primary rounded-circle opacity-10" style={{ width: 300, height: 300, filter: "blur(50px)" }}></div>
                <div className="position-absolute bottom-0 start-0 bg-info rounded-circle opacity-10" style={{ width: 200, height: 200, filter: "blur(40px)" }}></div>

                <div className="glass-panel p-2 rounded-4 shadow-lg position-relative bg-white bg-opacity-50" style={{ transform: "rotate(-2deg)" }}>
                  <div className="bg-white rounded-3 overflow-hidden border" style={{ height: "400px" }}>
                    <div className="p-3 border-bottom d-flex align-items-center gap-2 bg-light">
                      <div className="d-flex gap-1">
                        <div className="rounded-circle bg-danger" style={{ width: 10, height: 10 }}></div>
                        <div className="rounded-circle bg-warning" style={{ width: 10, height: 10 }}></div>
                        <div className="rounded-circle bg-success" style={{ width: 10, height: 10 }}></div>
                      </div>
                      <div className="mx-auto bg-white px-3 py-1 rounded-pill small text-muted border">Project Alpha</div>
                    </div>
                    <div className="p-4 position-relative h-100">
                      <div className="position-absolute top-50 start-50 translate-middle text-center opacity-25">
                        <FiLayout size={64} className="mb-3" />
                        <h5>Infinite Canvas</h5>
                      </div>
                      <div className="position-absolute top-25 start-25 animate-float" style={{ animationDelay: "1s" }}>
                        <div className="badge bg-primary rounded-pill shadow-sm">Alice</div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#6366f1" style={{ transform: "rotate(-15deg) translate(-5px, -5px)" }}>
                          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" stroke="white" strokeWidth="2" />
                        </svg>
                      </div>
                      <div className="position-absolute bottom-25 end-25 animate-float" style={{ animationDelay: "2s" }}>
                        <div className="badge bg-success rounded-pill shadow-sm">Bob</div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e" style={{ transform: "rotate(-15deg) translate(-5px, -5px)" }}>
                          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" stroke="white" strokeWidth="2" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5 bg-light position-relative">
        <div className="container py-5">
          <div className="text-center mb-5">
            <h2 className="fw-bold display-6">How It Works</h2>
            <p className="text-muted">Start collaborating in seconds, not minutes.</p>
          </div>

          <div className="row g-4 text-center">
            <div className="col-md-4">
              <div className="p-4 h-100">
                <div className="bg-white shadow-sm rounded-circle d-inline-flex p-4 mb-4 text-primary position-relative">
                  <FiPlus size={32} />
                  <span className="position-absolute top-0 end-0 translate-middle badge rounded-pill bg-dark">1</span>
                </div>
                <h4 className="fw-bold">Create Session</h4>
                <p className="text-muted">One click to start a new whiteboard. No complex setup required.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-4 h-100">
                <div className="bg-white shadow-sm rounded-circle d-inline-flex p-4 mb-4 text-info position-relative">
                  <FiShare2 size={32} />
                  <span className="position-absolute top-0 end-0 translate-middle badge rounded-pill bg-dark">2</span>
                </div>
                <h4 className="fw-bold">Share Link</h4>
                <p className="text-muted">Copy the session ID and share it with your team to join instantly.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-4 h-100">
                <div className="bg-white shadow-sm rounded-circle d-inline-flex p-4 mb-4 text-success position-relative">
                  <FiEdit3 size={32} />
                  <span className="position-absolute top-0 end-0 translate-middle badge rounded-pill bg-dark">3</span>
                </div>
                <h4 className="fw-bold">Collaborate</h4>
                <p className="text-muted">Draw, chat, and use AI tools together in real-time.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5 bg-white">
        <div className="container py-5">
          <div className="text-center mb-5">
            <h2 className="fw-bold display-6">Everything You Need</h2>
            <p className="text-muted">Powerful features to boost your productivity.</p>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="p-4 rounded-4 bg-light h-100 border border-light shadow-sm transition-hover">
                <div className="bg-primary text-white rounded-3 d-inline-flex p-3 mb-3">
                  <FiZap size={24} />
                </div>
                <h4 className="fw-bold mb-2">Real-time Sync</h4>
                <p className="text-muted">
                  Instant synchronization of strokes, cursors, and actions across all connected users.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-4 rounded-4 bg-light h-100 border border-light shadow-sm transition-hover">
                <div className="bg-secondary text-white rounded-3 d-inline-flex p-3 mb-3">
                  <FiCpu size={24} />
                </div>
                <h4 className="fw-bold mb-2">AI Powered</h4>
                <p className="text-muted">
                  Built-in AI tools to classify images and enhance your workflow instantly.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-4 rounded-4 bg-light h-100 border border-light shadow-sm transition-hover">
                <div className="bg-success text-white rounded-3 d-inline-flex p-3 mb-3">
                  <FiShield size={24} />
                </div>
                <h4 className="fw-bold mb-2">Secure & Private</h4>
                <p className="text-muted">
                  Enterprise-grade security with Keycloak authentication and private sessions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-4 bg-light text-center text-muted border-top">
        <div className="container">
          <div className="d-flex justify-content-center gap-4 mb-3">
            <a href="#" className="text-decoration-none text-muted">Privacy</a>
            <a href="#" className="text-decoration-none text-muted">Terms</a>
            <a href="#" className="text-decoration-none text-muted">Contact</a>
          </div>
          <small>&copy; {new Date().getFullYear()} CollabBoard. All rights reserved.</small>
        </div>
      </footer>
    </div>
  )
}
