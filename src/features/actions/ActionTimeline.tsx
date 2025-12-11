'use client';

import { useState, useTransition } from 'react';

import {
  addActionComment,
  deleteActionComment,
  editActionComment,
  type ActionComment,
} from '@/actions/comments';

type Props = {
  actionId: string;
  comments: ActionComment[];
  currentUserId?: string;
};

export function ActionTimeline({ actionId, comments, currentUserId }: Props) {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isPending, startTransition] = useTransition();

  // Format time
  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle submit new comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    startTransition(async () => {
      await addActionComment(actionId, newComment.trim());
      setNewComment('');
    });
  };

  // Handle edit
  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    startTransition(async () => {
      await editActionComment(commentId, editText.trim());
      setEditingId(null);
      setEditText('');
    });
  };

  // Handle delete
  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    startTransition(async () => {
      await deleteActionComment(commentId);
    });
  };

  // Get icon and colors based on comment type
  const getCommentStyle = (type: string) => {
    switch (type) {
      case 'status_change':
        return {
          icon: (
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-400',
        };
      case 'assignment':
        return {
          icon: (
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8l2 2-4 4" />
            </svg>
          ),
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-700 dark:text-purple-400',
        };
      case 'system':
        return {
          icon: (
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          ),
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-700 dark:text-gray-400',
        };
      default:
        return {
          icon: (
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          ),
          bg: 'bg-primary/10',
          text: 'text-primary',
        };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Activity & Comments
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal">
          {comments.length}
        </span>
      </h3>

      {/* Timeline */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
            <p className="text-sm">No comments yet</p>
            <p className="mt-1 text-xs">Be the first to add a comment</p>
          </div>
        ) : (
          comments.map((comment, index) => {
            const style = getCommentStyle(comment.comment_type);
            const isOwn = comment.user_id === currentUserId;
            const isEditing = editingId === comment.id;

            return (
              <div key={comment.id} className="flex gap-3">
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  {/* Avatar or Icon */}
                  {comment.user_avatar_url ? (
                    <img
                      src={comment.user_avatar_url}
                      alt=""
                      className="size-8 rounded-full"
                    />
                  ) : (
                    <div className={`flex size-8 items-center justify-center rounded-full ${style.bg} ${style.text}`}>
                      {style.icon}
                    </div>
                  )}
                  {/* Line */}
                  {index < comments.length - 1 && (
                    <div className="mt-2 h-full w-px bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium">
                        {comment.user_name || 'System'}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatTime(comment.created_at)}
                        {comment.is_edited && ' (edited)'}
                      </span>
                    </div>

                    {/* Actions for own comments */}
                    {isOwn && comment.comment_type === 'comment' && !isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditText(comment.comment);
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          disabled={isPending}
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                          disabled={isPending}
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comment Text */}
                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(comment.id)}
                          disabled={isPending || !editText.trim()}
                          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditText('');
                          }}
                          className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`mt-1 text-sm ${
                      comment.comment_type !== 'comment' ? 'italic text-muted-foreground' : ''
                    }`}>
                      {comment.comment}
                    </p>
                  )}

                  {/* Attachments */}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {comment.attachments.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative size-16 overflow-hidden rounded-lg border border-border"
                        >
                          <img
                            src={url}
                            alt=""
                            className="size-full object-cover transition-transform group-hover:scale-110"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={2}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={isPending || !newComment.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Posting...
                  </>
                ) : (
                  <>
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Post Comment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
