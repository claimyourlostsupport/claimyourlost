import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, assetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';

const SOCIALHUB_CHAT_POLL_MS = 4000;

export function SocialChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const bottomRef = useRef(null);

  const [post, setPost] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/social-hub/${id}/chat` } } });
    }
  }, [isAuthenticated, navigate, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/social-posts/${id}`);
        if (!cancelled) setPost(data);
      } catch {
        if (!cancelled) setPost(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/messages/social/${id}`);
      setMessages(data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    loadMessages();
    const t = setInterval(loadMessages, SOCIALHUB_CHAT_POLL_MS);
    return () => clearInterval(t);
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await api.post(`/notifications/read-for-social/${id}`);
        if (!cancelled) window.dispatchEvent(new CustomEvent('cyl-notifications-refresh'));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendSocialHubMessage(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t || sendLoading) return;
    setSendLoading(true);
    try {
      await api.post('/messages', { socialPostId: id, text: t });
      setText('');
      await loadMessages();
      window.dispatchEvent(new CustomEvent('cyl-notifications-refresh'));
    } catch (err) {
      setError(err.response?.data?.error || 'Send failed');
    } finally {
      setSendLoading(false);
    }
  }

  if (!isAuthenticated) return null;

  const isVideo = post?.mediaType === 'video';

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-[70vh]">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/social-hub" className="text-brand-blue text-sm font-semibold">
          ← SocialHub
        </Link>
        <h1 className="text-lg font-bold text-slate-900 truncate flex-1">SocialHub chat</h1>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950">
        <p className="font-semibold text-amber-900">Safety (SocialHub)</p>
        <p className="mt-1.5 leading-relaxed">
          Do not share passwords, OTPs, or full ID numbers in this chat. Meet in safe public places when meeting in
          person.
        </p>
      </div>

      {post?.mediaUrl && (
        <div className="flex gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
          {isVideo ? (
            <video
              src={assetUrl(post.mediaUrl)}
              className="h-20 w-20 shrink-0 object-cover rounded-lg bg-black"
              muted
              playsInline
            />
          ) : (
            <img
              src={assetUrl(post.mediaUrl)}
              alt=""
              className="h-20 w-20 shrink-0 object-cover rounded-lg bg-white border border-slate-100"
            />
          )}
          <p className="text-xs text-slate-600 self-center">Preview of the post you are discussing.</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8">No messages yet. Say hello.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId?._id === user?.id || m.senderId === user?.id;
            return (
              <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? 'bg-brand-blue text-white rounded-br-md'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {!mine && (
                    <p className="text-[10px] uppercase tracking-wide opacity-70 mb-1">
                      {m.senderId?.phone ? `••••${String(m.senderId.phone).slice(-4)}` : 'User'}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-slate-400'}`}>
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={sendSocialHubMessage}
        className="sticky bottom-0 pt-2 pb-1 bg-slate-50 -mx-4 px-4 border-t border-slate-200 md:static md:border-0 md:bg-transparent md:px-0"
      >
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            maxLength={5000}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base bg-white focus:ring-2 focus:ring-brand-blue/30"
          />
          <button
            type="submit"
            disabled={sendLoading || !text.trim()}
            className="px-5 rounded-2xl bg-brand-blue text-white font-semibold disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
