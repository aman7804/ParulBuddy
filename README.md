# Parul Helpdesk Chatbot (RAG-based) — MVP

## What this is
A working end-to-end skeleton of your project: student asks a question →
backend matches it to relevant college info (keyword-based retrieval) →
mock AI generates an answer using that info → shown in a chat UI.

Right now it uses **dummy data** (in `backend/data/dummyData.js`) instead of
MongoDB, and a **mock AI response** (in `backend/utils/aiService.js`) instead
of a real LLM API call — so you can run and demo it immediately, no API key
or DB setup needed.

## How to run

**Backend:**
```
cd backend
npm install
npm start
```
Runs on http://localhost:5000

**Frontend:**
```
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173 — open this in your browser.

## Try asking
- "how much is hostel fee"
- "what documents for hostel registration"
- "when are exams"
- "is placement mandatory"

## What's real vs mock right now
| Part | Status |
|---|---|
| Frontend chat UI | Real, fully working |
| Backend API + routing | Real, fully working |
| Keyword matching (retrieval) | Real, working logic |
| Document storage | Dummy array (not MongoDB yet) |
| AI answer generation | Mocked (stitches matched content together) |

## Next steps (in order)
1. **Swap dummy data → MongoDB.** Same shape, just move the array into a
   `knowledgebase` collection. Update `matcher.js` to query MongoDB instead
   of looping the array.
2. **Swap mock AI → real API call.** The real code is already written and
   commented out inside `backend/utils/aiService.js` — just uncomment, add
   an API key in a `.env` file, and remove the mock return above it.
3. **Add more categories/subcategories** to `dummyData.js` (or MongoDB once
   migrated) — Fees, Attendance, Library, etc.
4. *(Stretch goal, only if time allows)* Replace keyword matching with
   embeddings-based similarity search for smarter retrieval.

## Splitting work with Joel
- **You (frontend + retrieval logic):** `frontend/` folder, `matcher.js`,
  writing the knowledge base content
- **Joel (DB + AI integration):** MongoDB setup/migration, real AI API
  integration, expanding retrieval if you go the embeddings route
