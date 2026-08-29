import { useEffect, useState } from "react";

export default function AdminDashboard({ token }) {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const fetchDocuments = async () => {
    const res = await fetch("http://localhost:5000/api/admin/documents", {
      headers: authHeaders,
    });
    if (res.status === 401 || res.status === 403) return;
    const data = await res.json();
    setDocuments(data);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError("");
    setUploadResult(null);

    if (!selectedFile) {
      setUploadError("Select a PDF file first.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      const res = await fetch("http://localhost:5000/api/admin/upload-pdf", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Failed to upload PDF");
        return;
      }

      setUploadResult(data);
      setSelectedFile(null);

      // Clear file input
      const fileInput = document.getElementById("pdf-file-input");
      if (fileInput) fileInput.value = "";

      fetchDocuments();
    } catch (err) {
      setUploadError(err.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name) => {
    if (!confirm(`Delete "${name}" and all its chunks?`)) return;
    await fetch(
      `http://localhost:5000/api/admin/documents/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
        headers: authHeaders,
      },
    );
    fetchDocuments();
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto" }}>
      <h2>Document Management</h2>

      {/* ---- PDF Upload ---- */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 6,
          padding: 16,
          marginBottom: 30,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Upload PDF</h3>
        <p style={{ fontSize: 13, color: "#555" }}>
          Upload a PDF document. Its text will be extracted, chunked, and
          embedded for retrieval. Re-uploading a file with the same name
          replaces the previous version.
        </p>
        <form onSubmit={handleUpload}>
          <input
            id="pdf-file-input"
            type="file"
            accept=".pdf"
            onChange={(e) => setSelectedFile(e.target.files[0] || null)}
            style={{ display: "block", marginBottom: 8 }}
          />
          <button type="submit" disabled={uploading}>
            {uploading ? "Processing..." : "Upload & Process"}
          </button>

          {uploadError && (
            <p style={{ color: "red", whiteSpace: "pre-wrap" }}>
              {uploadError}
            </p>
          )}

          {uploadResult && (
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                background: "#f5f5f5",
                padding: 10,
                borderRadius: 4,
              }}
            >
              <p>
                <strong>{uploadResult.pdfName}</strong> — {uploadResult.chunksCreated} chunks
                created
                {uploadResult.previousChunksDeleted > 0 &&
                  ` (replaced ${uploadResult.previousChunksDeleted} previous chunks)`}
                {uploadResult.errors > 0 &&
                  `, ${uploadResult.errors} failed`}
              </p>
            </div>
          )}
        </form>
      </div>

      {/* ---- Uploaded Documents ---- */}
      <h3>Uploaded Documents</h3>
      {documents.length === 0 ? (
        <p style={{ color: "#888" }}>No documents uploaded yet.</p>
      ) : (
        <table
          width="100%"
          border="1"
          cellPadding="6"
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              <th>Document</th>
              <th>Chunks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.name}>
                <td>{doc.name}</td>
                <td>{doc.chunks}</td>
                <td>
                  <button onClick={() => handleDelete(doc.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
