import pytest
from app import app, seed, comments, posts, MAX_DEPTH
import json

@pytest.fixture
def client():
    seed()
    with app.test_client() as c:
        yield c

def test_add_comment_and_reply(client):
    res = client.post('/api/comments', json={'user':'T1','content':'Hello'})
    assert res.status_code == 201
    data = res.get_json()
    cid = data['comment']['id']
    res2 = client.post('/api/comments', json={'user':'T2','content':'Reply','parent_comment_id':cid})
    assert res2.status_code == 201
    tree = client.get('/api/comments?view=tree').get_json()
    assert len(tree['comments'])>=1
    assert len(tree['comments'][0]['replies'])>=1

def test_max_reply_depth(client):
    res = client.post('/api/comments', json={'user':'A','content':'Root'})
    assert res.status_code==201
    cid = res.get_json()['comment']['id']
    parent = cid
    # Add up to MAX_DEPTH replies
    for i in range(MAX_DEPTH-1):
        r = client.post('/api/comments', json={'user':f'U{i}','content':'r', 'parent_comment_id':parent})
        assert r.status_code==201
        parent = r.get_json()['comment']['id']
    # Now adding one more should fail
    r = client.post('/api/comments', json={'user':'X','content':'too deep', 'parent_comment_id':parent})
    assert r.status_code == 400

def test_flat_view(client):
    client.post('/api/comments', json={'user':'F1','content':'First'})
    client.post('/api/comments', json={'user':'F2','content':'Second'})
    flat = client.get('/api/comments?view=flat').get_json()
    assert len(flat['comments'])>=2
