import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export default function AdminDashboard({ token, onLogout }) {
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/documents`, { headers });
      if (res.status === 401 || res.status === 403) return onLogout();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load documents");
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleUpload = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!selectedFile) return setError("Select a PDF file first.");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", selectedFile);
      const res = await fetch(`${API_BASE_URL}/api/admin/upload-pdf`, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload PDF");
      setMessage(`${data.pdfName}: ${data.chunksCreated} chunks created.`);
      setSelectedFile(null);
      document.getElementById("pdf-file-input").value = "";
      await fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    setError("");
    const res = await fetch(`${API_BASE_URL}/api/admin/documents/${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers,
    });
    if (res.status === 401 || res.status === 403) return onLogout();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error || "Failed to delete document");
    }
    fetchDocuments();
  };

  return (
    <div className="admin-page">
      <div className="admin-summary">
        <div><span className="summary-label">Knowledge base</span><strong>{documents.length}</strong><small>Documents available</small></div>
        <div><span className="summary-label">Total chunks</span><strong>{documents.reduce((sum, doc) => sum + doc.chunks, 0)}</strong><small>Searchable content blocks</small></div>
      </div>
      <div className="admin-card upload-card">
        <div>
          <span className="card-kicker">CONTENT LIBRARY</span>
          <h2>Add a knowledge document</h2>
          <p>Upload a PDF to extract, chunk, and index its content.</p>
        </div>
        <form onSubmit={handleUpload} className="upload-form">
          <label className="file-picker" htmlFor="pdf-file-input">
            <span>Choose PDF</span>
            <small>{selectedFile?.name || "PDF files up to 50 MB"}</small>
          </label>
          <input id="pdf-file-input" type="file" accept=".pdf,application/pdf" onChange={(e) => setSelectedFile(e.target.files[0] || null)} />
          <button className="button button-primary" type="submit" disabled={uploading}>{uploading ? "Processing..." : "Upload document"}</button>
        </form>
      </div>
      {message && <p className="notice notice-success">{message}</p>}
      {error && <p className="notice notice-error">{error}</p>}
      <div className="section-heading"><div><span className="card-kicker">INDEXED CONTENT</span><h2>Documents</h2></div><button className="button button-light" onClick={fetchDocuments}>Refresh</button></div>
      <div className="admin-card table-card">
        {loading ? <p className="empty-state">Loading documents...</p> : documents.length === 0 ? <p className="empty-state">No documents uploaded yet.</p> : (
          <div className="table-scroll"><table className="admin-table"><thead><tr><th>Document</th><th>Chunks</th><th>Actions</th></tr></thead><tbody>
            {documents.map((doc) => <tr key={doc.name}><td><span className="file-icon">PDF</span><strong>{doc.name}</strong></td><td>{doc.chunks}</td><td><button className="text-button danger" onClick={() => handleDelete(doc.name)}>Delete</button></td></tr>)}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
