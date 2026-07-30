import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatPage from "./ChatPage";
import AdminPage from "./AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
