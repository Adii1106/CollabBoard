import { Routes, Route } from "react-router-dom"
import Landing from "./routes/Landing"
import Whiteboard from "./routes/Whiteboard"
import LoginPage from "./components/LoginPage"
import RequireAuth from "./components/RequireAuth"

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Landing />} />

      <Route element={<RequireAuth />}>
        <Route path="/session/:id" element={<Whiteboard />} />
      </Route>
    </Routes>
  )
}
