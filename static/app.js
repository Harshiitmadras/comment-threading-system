const apiBase = '/api';
let currentView = 'tree';
const commentsArea = document.getElementById('commentsArea');
const postBtn = document.getElementById('postBtn');
const contentInput = document.getElementById('contentInput');
const userInput = document.getElementById('userInput');
const treeViewBtn = document.getElementById('treeViewBtn');
const flatViewBtn = document.getElementById('flatViewBtn');

treeViewBtn.onclick = ()=> { currentView='tree'; refresh(); treeViewBtn.classList.add('btn-outline-light'); flatViewBtn.classList.remove('btn-light'); }
flatViewBtn.onclick = ()=> { currentView='flat'; refresh(); flatViewBtn.classList.add('btn-light'); treeViewBtn.classList.remove('btn-outline-light'); }

postBtn.onclick = async ()=>{
  const content = contentInput.value.trim();
  const user = userInput.value.trim() || 'You';
  if(!content) return alert('Type a comment');
  const res = await fetch(apiBase + '/comments', {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({user, content})
  });
  if(res.ok){
    contentInput.value=''; userInput.value='';
    refresh();
  } else {
    const err = await res.json();
    alert(err.error || 'Error');
  }
}

async function refresh(){
  commentsArea.innerHTML = '<div class="text-center py-4">Loading...</div>';
  const res = await fetch(apiBase + '/comments?view=' + currentView);
  const data = await res.json();
  if(currentView==='flat'){
    renderFlat(data.comments || []);
  } else {
    renderTree(data.comments || [], data.auto_collapse_threshold || 10);
  }
}

function renderFlat(list){
  commentsArea.innerHTML = '';
  if(list.length===0) { commentsArea.innerHTML='<p>No comments yet.</p>'; return; }
  list.forEach(c=>{
    const node = document.createElement('div');
    node.className = 'card mb-2 p-2';
    node.innerHTML = `<div class="d-flex justify-content-between"><div><strong>${escapeHtml(c.user)}</strong> <span class="meta">${new Date(c.timestamp).toLocaleString()}</span></div><div class="vote-badge">${c.votes}</div></div><div class="content">${escapeHtml(c.content)}</div>`;
    commentsArea.appendChild(node);
  });
}

function renderTree(tree, collapseThreshold){
  commentsArea.innerHTML = '';
  if(tree.length===0) { commentsArea.innerHTML='<p>No comments yet.</p>'; return; }
  tree.forEach(c=> commentsArea.appendChild(renderCommentNode(c,0, collapseThreshold)) );
}

function renderCommentNode(c, level, collapseThreshold){
  const wrapper = document.createElement('div');
  wrapper.className = 'comment';
  wrapper.style.marginLeft = (level*12) + 'px';
  const inner = document.createElement('div');
  inner.className = 'card p-2';
  inner.innerHTML = `<div class="d-flex justify-content-between align-items-start"><div><strong>${escapeHtml(c.user)}</strong> <div class="meta">${new Date(c.timestamp).toLocaleString()}</div></div><div class="text-end"><span class="vote-badge" id="vote-${c.id}">${c.votes}</span></div></div>
    <div class="content">${escapeHtml(c.content)}</div>
    <div class="mt-2">
      <button class="btn btn-sm btn-link reply-btn" data-id="${c.id}">Reply</button>
      <button class="btn btn-sm btn-link" data-vote="+1" data-id="${c.id}">▲</button>
      <button class="btn btn-sm btn-link" data-vote="-1" data-id="${c.id}">▼</button>
    </div>
    <div class="replies mt-2" id="replies-${c.id}"></div>
  `;
  wrapper.appendChild(inner);

  // Wire reply button
  inner.querySelectorAll('.reply-btn').forEach(b=>{
    b.onclick = ()=>{
      const id = b.getAttribute('data-id');
      showReplyBox(id);
    }
  });
  inner.querySelectorAll('button[data-vote]').forEach(b=>{
    b.onclick = async ()=>{
      const id = b.getAttribute('data-id');
      const delta = parseInt(b.getAttribute('data-vote'));
      await fetch(apiBase + '/vote', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({comment_id:id, delta})});
      await refresh();
    }
  });

  // Auto-collapse if replies exceed threshold
  const repliesDiv = inner.querySelector('#replies-' + c.id);
  if(Array.isArray(c.replies) && c.replies.length>0){
    if(c.replies.length > collapseThreshold){
      const collapsedNote = document.createElement('div');
      collapsedNote.className = 'mb-2';
      collapsedNote.innerHTML = `<small class="text-muted">Thread collapsed (${c.replies.length} replies). <a href="#" data-expand="${c.id}">Expand</a></small>`;
      repliesDiv.appendChild(collapsedNote);
      collapsedNote.querySelector('a').onclick = (ev)=>{
        ev.preventDefault();
        fetch(apiBase + '/comments?view=tree').then(r=>r.json()).then(d=>{
          const node = findNodeById(d.comments, c.id);
          if(node){
            const container = document.getElementById('replies-' + c.id);
            container.innerHTML = '';
            node.replies.forEach(rr=> container.appendChild(renderCommentNode(rr, level+1, collapseThreshold)));
          }
        });
      }
    } else {
      c.replies.forEach(rid=>{
        // replies are already full nodes in API tree
      });
      c.replies.forEach(rr=> repliesDiv.appendChild(renderCommentNode(rr, level+1, collapseThreshold)));
    }
  }

  return wrapper;
}

function findNodeById(list, id){
  for(const item of list){
    if(item.id===id) return item;
    const found = findNodeById(item.replies || [], id);
    if(found) return found;
  }
  return null;
}

function showReplyBox(parentId){
  const parentReplies = document.getElementById('replies-' + parentId);
  const box = document.createElement('div');
  box.className = 'card p-2 mb-2';
  box.innerHTML = `<input class="form-control mb-1 reply-user" placeholder="Your name (optional)"><textarea class="form-control reply-content" rows="2" placeholder="Write a reply..."></textarea><div class="text-end mt-1"><button class="btn btn-sm btn-primary submit-reply">Reply</button> <button class="btn btn-sm btn-secondary cancel-reply">Cancel</button></div>`;
  parentReplies.prepend(box);
  box.querySelector('.cancel-reply').onclick = ()=> box.remove();
  box.querySelector('.submit-reply').onclick = async ()=>{
    const user = box.querySelector('.reply-user').value.trim() || 'You';
    const content = box.querySelector('.reply-content').value.trim();
    if(!content) return alert('Type a reply');
    const res = await fetch(apiBase + '/comments', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({user, content, parent_comment_id: parentId})});
    if(res.ok){ refresh(); } else { const err = await res.json(); alert(err.error || 'Error'); }
  }
}

function escapeHtml(text){
  if(!text) return '';
  return text.replace(/[&<>"]/g, function(tag){ const chars = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}; return chars[tag] || tag; });
}

// initial load
refresh();
