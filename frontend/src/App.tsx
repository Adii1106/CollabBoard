
import { Routes, Route } from "react-router-dom";
import Landing from "./routes/Landing";
import Whiteboard from "./routes/Whiteboard";
import AuthRedirect from "./routes/AuthRedirect";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/session/:id" element={<Whiteboard />} />
      <Route path="/auth-redirect" element={<AuthRedirect />} />
    </Routes>
  );
}
