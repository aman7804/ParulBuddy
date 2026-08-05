import { useEffect, useState } from "react";

const RAW_TEMPLATE_PLACEHOLDER = `paste raw text here...`;

export default function AdminDashboard({ token }) {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    category: "",
    subcategory: "",
    content: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  // ---- Bulk raw dump state ----
  const [rawText, setRawText] = useState("");
  const [rawCategory, setRawCategory] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState("");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchEntries = async () => {
    const res = await fetch("http://localhost:5000/api/admin/entries", {
      headers: authHeaders,
    });
    if (res.status === 401 || res.status === 403) {
      return;
    }
    const data = await res.json();
    setEntries(data);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const resetForm = () => {
    setForm({ category: "", subcategory: "", content: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const url = editingId
      ? `http://localhost:5000/api/admin/entries/${editingId}`
      : "http://localhost:5000/api/admin/entries";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: authHeaders,
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      return;
    }

    resetForm();
    fetchEntries();
  };

  const handleEdit = (entry) => {
    setForm({
      category: entry.category,
      subcategory: entry.subcategory,
      content: entry.content,
    });
    setEditingId(entry._id);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this entry?")) return;
    await fetch(`http://localhost:5000/api/admin/entries/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    fetchEntries();
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setBulkError("");
    setBulkResult(null);

    if (!rawCategory.trim()) {
      setBulkError("Category is required.");
      return;
    }
    if (!rawText.trim()) {
      setBulkError("Paste some data first.");
      return;
    }

    setBulkLoading(true);
    try {
      const res = await fetch(
        "http://localhost:5000/api/admin/entries/bulk-raw",
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            rawText,
            category: rawCategory.trim().toLocaleLowerCase(),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setBulkError(data.error || "Failed to process raw data");
        return;
      }

      setBulkResult(data);
      setRawText("");
      setRawCategory("");
      fetchEntries();
    } catch (err) {
      setBulkError(err.message || "Something went wrong");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Knowledge Base Admin</h2>
      </div>

      {/* ---- Bulk structured data import ---- */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 6,
          padding: 16,
          marginBottom: 30,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Bulk Import from Structured Data</h3>
        <p style={{ fontSize: 13, color: "#555" }}>
          One category per import. Below, each item's first line is its name,
          the rest is its content. Separate items with a line containing only{" "}
          <code>---</code>. No AI processing happens here - it's parsed
          directly, so check the format matches before submitting.
        </p>
        <form onSubmit={handleBulkSubmit}>
          <input
            placeholder="Category (e.g. Hostel)"
            value={rawCategory}
            onChange={(e) => setRawCategory(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginBottom: 8,
              padding: 6,
            }}
          />
          <textarea
            placeholder={RAW_TEMPLATE_PLACEHOLDER}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={14}
            style={{
              display: "block",
              width: "100%",
              marginBottom: 8,
              padding: 6,
              fontFamily: "monospace",
              fontSize: 12,
            }}
          />
          <button type="submit" disabled={bulkLoading}>
            {bulkLoading ? "Processing..." : "Process & Insert"}
          </button>

          {bulkError && (
            <p style={{ color: "red", whiteSpace: "pre-wrap" }}>{bulkError}</p>
          )}

          {bulkResult && (
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
                Parsed {bulkResult.totalExtracted} entries — saved{" "}
                {bulkResult.saved}, failed {bulkResult.failed}.
              </p>
              {bulkResult.failedDetails?.length > 0 && (
                <ul>
                  {bulkResult.failedDetails.map((f, i) => (
                    <li key={i} style={{ color: "red" }}>
                      {f.subcategory}: {f.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>
      </div>

      {/* ---- Single entry form (quick add/edit) ---- */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 30 }}>
        <h3>{editingId ? "Edit Entry" : "Add Single Entry"}</h3>
        <input
          placeholder="Category (e.g. Hostel)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          style={{
            display: "block",
            width: "100%",
            marginBottom: 8,
            padding: 6,
          }}
        />
        <input
          placeholder="Subcategory (e.g. Hostel Fee)"
          value={form.subcategory}
          onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
          style={{
            display: "block",
            width: "100%",
            marginBottom: 8,
            padding: 6,
          }}
        />
        <textarea
          placeholder="Content (the actual answer text)"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={7}
          style={{
            display: "block",
            width: "100%",
            marginBottom: 8,
            padding: 6,
          }}
        />
        <button type="submit">
          {editingId ? "Update Entry" : "Add Entry"}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} style={{ marginLeft: 8 }}>
            Cancel
          </button>
        )}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>

      <table
        width="100%"
        border="1"
        cellPadding="6"
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry._id}>
              <td>{entry.category}</td>
              <td>{entry.subcategory}</td>
              <td>
                <button onClick={() => handleEdit(entry)}>Edit</button>
                <button onClick={() => handleDelete(entry._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
