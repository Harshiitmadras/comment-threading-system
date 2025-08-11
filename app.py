from flask import Flask, request, jsonify, render_template, send_from_directory
from datetime import datetime
import threading, uuid

app = Flask(__name__, static_folder='static', template_folder='templates')
lock = threading.Lock()

# In-memory stores
posts = {}  # post_id -> list of top-level comment ids
comments = {}  # comment_id -> comment dict

MAX_DEPTH = 5
AUTO_COLLAPSE_THRESHOLD = 10

def make_comment(user, content, parent_comment_id=None, post_id='post1'):
    # Build comment object
    return {
        "id": str(uuid.uuid4()),
        "user": user,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "content": content,
        "parent_comment_id": parent_comment_id,
        "replies": [],
        "votes": 0
    }

def compute_depth(comment_id):
    depth = 1
    cur = comments.get(comment_id)
    while cur and cur['parent_comment_id']:
        depth += 1
        cur = comments.get(cur['parent_comment_id'])
    return depth

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/comments', methods=['GET'])
def get_comments():
    view_type = request.args.get('view', 'tree')
    post_id = request.args.get('post_id','post1')
    with lock:
        if view_type == 'flat':
            flat = list(comments.values())
            # sort by timestamp ascending
            flat_sorted = sorted(flat, key=lambda c: c['timestamp'])
            return jsonify({"comments": flat_sorted})
        else:
            # build tree from top-level ids
            top_ids = posts.get(post_id, [])
            def node_dict(cid):
                c = comments[cid]
                # shallow copy, but include replies recursively
                return {
                    "id": c['id'],
                    "user": c['user'],
                    "timestamp": c['timestamp'],
                    "content": c['content'],
                    "parent_comment_id": c['parent_comment_id'],
                    "replies": [node_dict(rid) for rid in c['replies']],
                    "votes": c['votes']
                }
            tree = [node_dict(cid) for cid in top_ids]
            return jsonify({"comments": tree, "auto_collapse_threshold": AUTO_COLLAPSE_THRESHOLD})

@app.route('/api/comments', methods=['POST'])
def add_comment():
    data = request.get_json()
    user = data.get('user') or 'Anonymous'
    content = data.get('content','').strip()
    parent_id = data.get('parent_comment_id')
    post_id = data.get('post_id','post1')
    if not content:
        return jsonify({"error":"Empty content"}), 400
    with lock:
        if parent_id:
            if parent_id not in comments:
                return jsonify({"error":"Parent not found"}), 400
            depth = compute_depth(parent_id) + 1
            if depth > MAX_DEPTH:
                return jsonify({"error":"Max reply depth exceeded"}), 400
        comment = make_comment(user, content, parent_id, post_id)
        comments[comment['id']] = comment
        if parent_id:
            comments[parent_id]['replies'].append(comment['id'])
        else:
            posts.setdefault(post_id, []).append(comment['id'])
    return jsonify({"comment": comment}), 201

@app.route('/api/vote', methods=['POST'])
def vote():
    data = request.get_json()
    cid = data.get('comment_id')
    delta = int(data.get('delta',0))
    with lock:
        if cid not in comments:
            return jsonify({"error":"Comment not found"}), 404
        comments[cid]['votes'] += delta
        return jsonify({"votes": comments[cid]['votes']})

# Seed with sample data
def seed():
    with lock:
        posts.clear(); comments.clear()
        p='post1'
        posts[p]=[]
        c1 = make_comment('Alice','This is a great post!')
        comments[c1['id']] = c1
        posts[p].append(c1['id'])
        r1 = make_comment('Bob','I agree with Alice', parent_comment_id=c1['id'])
        comments[r1['id']] = r1
        comments[c1['id']]['replies'].append(r1['id'])
        # add nested up to depth 3
        r2 = make_comment('Carol','Replying to Bob', parent_comment_id=r1['id'])
        comments[r2['id']] = r2
        comments[r1['id']]['replies'].append(r2['id'])
seed()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
