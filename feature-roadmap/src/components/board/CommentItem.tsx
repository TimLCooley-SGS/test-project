import React from 'react';
import { BoardComment } from '../../api';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

interface CommentItemProps {
  comment: BoardComment;
}

export default function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className="board-comment-item">
      <div className="board-comment-avatar">
        {comment.user.avatarUrl ? (
          <img src={comment.user.avatarUrl} alt={comment.user.name} />
        ) : (
          <span>{getInitials(comment.user.name)}</span>
        )}
      </div>
      <div className="board-comment-body">
        <div className="board-comment-meta">
          <span className="board-comment-name">{comment.user.name}</span>
          <span className="board-comment-time">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="board-comment-content">{comment.content}</p>
      </div>
    </div>
  );
}
