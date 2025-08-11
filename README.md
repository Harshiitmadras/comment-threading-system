

# Comment Threading System (In-Memory)
A highly advanced, responsive, and unique Comment Threading System implemented with **Flask**, plain JS, and Bootstrap.  
Data is stored **in-memory** (no persistent DB) and lost on restart as required.

## Features
- Add comments and nested replies (up to depth **5**).
- Two views: **Tree view** (nested) and **Flat view** (all comments).
- Auto-collapse long threads (configurable threshold).
- Upvote / downvote comments.
- Concurrency-safe in-memory store (threading lock).
- API-first design + responsive UI.
- Unit tests (pytest).
- Loom video placeholder: add your Loom link in README before submission.

## Quick start (Linux / macOS / Windows WSL)
1. Install Python 3.10+ and pip.
2. Create a venv:
```bash
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```
3. Run the app:
```bash
export FLASK_APP=app.py
export FLASK_ENV=development
flask run --port 5000
```
Open http://127.0.0.1:5000

## API
- `GET /api/comments?view=tree|flat` — retrieve comments
- `POST /api/comments` — add comment or reply  
  JSON: `{"post_id":"post1","user":"Alice","content":"Hello","parent_comment_id":null}`
- `POST /api/vote` — vote on a comment  
  JSON: `{"comment_id":"...","delta":1}`

## Tests
Run:
```bash
pytest -q
```
# Explanations of Complex Logic / Algorithms

1. Reply Depth Enforcement
Purpose:
To prevent excessively deep nesting of replies which can harm usability and performance, the system enforces a maximum allowed depth of 5.

How it works:
When a new reply is added, the system runs a function called compute_depth. This function starts from the parent comment ID and walks up the chain of parent comments, counting each level until it reaches a top-level comment (which has no parent).

If the resulting depth after adding the new reply would exceed 5, the request is rejected with an error "Max reply depth exceeded".

This ensures all reply threads remain manageable and conform to the assignment rules without requiring complex database queries, as all data is in-memory.

2. In-Memory Comment Storage with Thread Safety
Purpose:
The entire comment and reply data is stored purely in-memory using Python dictionaries, without any persistent database, as per assignment requirements. This allows fast access and easy dynamic data structures.

Data Structures:

posts: Map post IDs to lists of top-level comment IDs.

comments: Map comment IDs to comment dictionaries, each containing fields like user, content, parent_comment_id, replies (list of child comment IDs), timestamp, and votes.

Concurrency Handling:
Since Flask’s default server can handle multiple requests in threaded mode, there could be concurrent access to these shared in-memory dictionaries. To prevent race conditions or corrupted data, a global Python threading.Lock() is used.

All mutation operations (adding comments, updating replies, voting) acquire this lock before modifying the data and release it after.

This guarantees atomicity of operations and consistency of the comment tree even during concurrent user interactions.

3. Auto-Collapse of Long Threads
Purpose:
Long comment threads with many nested replies can be overwhelming. To maintain usability and a clean UI, the system implements an auto-collapse mechanism.

How it works:

The backend sends an AUTO_COLLAPSE_THRESHOLD (default 10) along with the comment tree JSON response.

The frontend uses this value to automatically collapse threads with more replies than that threshold.

This reduces clutter while still allowing users to expand and read long discussions on demand.

4. API-First Design for Flexible Frontend Integration
The backend exposes clean RESTful API endpoints to:

Fetch comments in either tree view (nested) or flat view (linear list).

Add new comments and replies with parent linking handled by IDs.

Register vote changes (upvotes/downvotes) per comment.

The separation of API and frontend logic enables easy integration with any UI framework or client without backend changes.

These design decisions and algorithms carefully balance simplicity, performance, scalability in-memory, and usability as per the assignment's requirements. The use of in-memory dictionaries and threading locks simplifies data handling, while enforcing max reply depth and auto-collapse ensures a user-friendly experience.



Loom Video: **<https://www.loom.com/share/4072d579b9bb465d9e7412a79ac856ad?sid=b709d56e-f014-4695-a751-d1feac586ff4>**
