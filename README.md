# ParulBuddy

ParulBuddy is a MERN RAG helpdesk chatbot:

`PDF -> text extraction -> chunks -> Gemini embeddings -> MongoDB Atlas Vector Search -> Groq answer`

## Run locally

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Backend environment

Create `backend/.env` with:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
GROQ_MODEL=...
ADMIN_PASSWORD=...
JWT_SECRET=...
PORT=5000
```

Supabase should provide `chunks`, `feedback`, and `unanswered_questions` tables plus
the `match_chunks(query_embedding, match_threshold, match_count)` RPC function.
Admin APIs require a JWT from `POST /api/admin/login`.
