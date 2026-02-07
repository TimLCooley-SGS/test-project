import React, { useState, useCallback } from 'react';
import { useBoardAuth } from '../../context/BoardAuthContext';
import { fetchBoardComments, postBoardComment, BoardComment } from '../../api';
import CommentItem from './CommentItem';
import CommenterAuthForm from './CommenterAuthForm';

interface CommentSectionProps {
  slug: string;
  suggestionId: string;
  commentCount: number;
}

export default function CommentSection({ slug, suggestionId, commentCount }: CommentSectionProps) {
  const { commenter, loading: authLoading } = useBoardAuth();
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [displayCount, setDisplayCount] = useState(commentCount);

  const toggleExpand = useCallback(async () => {
    if (!expanded && !loaded) {
      setLoadingComments(true);
      try {
        const data = await fetchBoardComments(slug, suggestionId);
        setComments(data);
        setDisplayCount(data.length);
        setLoaded(true);
      } catch {
        // silently fail
      } finally {
        setLoadingComments(false);
      }
    }
    setExpanded(prev => !prev);
  }, [expanded, loaded, slug, suggestionId]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || posting) return;
    setPosting(true);
    try {
      const comment = await postBoardComment(slug, suggestionId, newComment.trim());
      setComments(prev => [...prev, comment]);
      setDisplayCount(prev => prev + 1);
      setNewComment('');
    } catch {
      // silently fail
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="board-comments-section">
      <button className="board-comments-toggle" onClick={toggleExpand}>
        Comments ({displayCount}){' '}
        <span className={`board-comments-chevron ${expanded ? 'expanded' : ''}`}>&#9660;</span>
      </button>

      {expanded && (
        <div className="board-comments-body">
          {loadingComments ? (
            <p className="board-comments-loading">Loading comments...</p>
          ) : (
            <>
              {comments.length === 0 && (
                <p className="board-comments-empty">No comments yet. Be the first!</p>
              )}
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))}

              {authLoading ? null : commenter ? (
                <form className="board-comment-form" onSubmit={handlePost}>
                  <textarea
                    className="board-comment-input"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    maxLength={2000}
                    rows={2}
                  />
                  <button
                    type="submit"
                    className="board-comment-post"
                    disabled={posting || !newComment.trim()}
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </form>
              ) : (
                <CommenterAuthForm />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
