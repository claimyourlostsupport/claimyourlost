import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, assetUrl } from '../api/client';
import { listingImgClass } from '../constants/images.js';
import { useAuth } from '../context/AuthContext.jsx';
import { publicUserLabel } from '../utils/publicUserLabel.js';

const POLL_MS = 4000;

export function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const bottomRef = useRef(null);

  const [item, setItem] = useState(null);
  const [hasClaim, setHasClaim] = useState(false);
  const [claimStatusLoading, setClaimStatusLoading] = useState(true);
  const [claimMsg, setClaimMsg] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState('');

  const ownerId = item?.userId?._id ?? item?.userId;
  const isOwner = Boolean(item && user && ownerId && String(ownerId) === String(user.id));
  const claimPendingCheck = Boolean(item?.type === 'found' && !isOwner && claimStatusLoading);
  const claimGateActive = Boolean(item?.type === 'found' && !isOwner && !hasClaim && !claimStatusLoading);
  /** Found listings: block compose until claim exists and status has loaded */
  const messagingLocked = Boolean(item?.type === 'found' && !isOwner && (claimStatusLoading || !hasClaim));

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/items/${id}/chat` } } });
    }
  }, [isAuthenticated, navigate, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/items/${id}`);
        if (!cancelled) setItem(data);
      } catch {
        if (!cancelled) setItem(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !id) return undefined;
    let cancelled = false;
    (async () => {
      setClaimStatusLoading(true);
      try {
        const { data } = await api.get(`/claims/status/${id}`);
        if (!cancelled) setHasClaim(Boolean(data?.hasClaim));
      } catch {
        if (!cancelled) setHasClaim(false);
      } finally {
        if (!cancelled) setClaimStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, id]);

  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/messages/${id}`);
      setMessages(data);
      setError('');
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'CLAIM_REQUIRED') {
        setMessages([]);
        setError('');
        setHasClaim(false);
      } else {
        setError(e.response?.data?.error || 'Could not load messages');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !item) return undefined;
    if (claimPendingCheck) return undefined;
    if (item.type === 'found' && !isOwner && !hasClaim) {
      setMessages([]);
      setLoading(false);
      setError('');
      return undefined;
    }
    loadMessages();
    const t = setInterval(loadMessages, POLL_MS);
    return () => clearInterval(t);
  }, [id, isAuthenticated, item, hasClaim, claimPendingCheck, isOwner]);

  useEffect(() => {
    if (!isAuthenticated || !id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await api.post(`/notifications/read-for-item/${id}`);
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

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t || sendLoading || messagingLocked) return;
    setSendLoading(true);
    try {
      await api.post('/messages', { itemId: id, text: t });
      setText('');
      await loadMessages();
      window.dispatchEvent(new CustomEvent('cyl-notifications-refresh'));
    } catch (err) {
      setError(err.response?.data?.error || 'Send failed');
    } finally {
      setSendLoading(false);
    }
  }

  async function submitClaim(e) {
    e.preventDefault();
    const msg = claimMsg.trim();
    if (!msg || claimLoading) return;
    setClaimError('');
    setClaimLoading(true);
    try {
      await api.post('/claims', { itemId: id, message: msg });
      setClaimMsg('');
      setHasClaim(true);
      setLoading(true);
      await loadMessages();
      window.dispatchEvent(new CustomEvent('cyl-notifications-refresh'));
    } catch (err) {
      setClaimError(err.response?.data?.error || 'Could not submit claim');
    } finally {
      setClaimLoading(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-[70vh]">
      <div className="flex items-center gap-3 mb-4">
        <Link to={`/items/${id}`} className="text-brand-blue text-sm font-semibold">
          ← Item
        </Link>
        <h1 className="text-lg font-bold text-slate-900 truncate flex-1">
          {item?.title || 'Chat'}
        </h1>
      </div>

      {item?.image && (
        <div className="flex gap-3 mb-4 p-3 bg-white rounded-xl border border-slate-100">
          <img src={assetUrl(item.image)} alt="" className={listingImgClass} />
          <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 self-center">
            Safety: do not share passwords, OTPs, or full ID numbers. Meet in safe public places when handing over
            items.
          </p>
        </div>
      )}

      {claimGateActive && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
          <p className="text-sm font-semibold text-amber-950">Claim required to chat</p>
          <p className="text-sm text-amber-900 leading-relaxed">
            This item is listed as <strong>Found</strong>. The person who found it only opens chat after you send a
            one-time claim. Describe details only the real owner would know (marks, contents, lock screen, etc.). Your
            claim is stored and sent to them; you cannot submit a second claim for this listing.
          </p>
          <form onSubmit={submitClaim} className="space-y-2">
            <textarea
              required
              value={claimMsg}
              onChange={(e) => setClaimMsg(e.target.value)}
              rows={4}
              placeholder="e.g. Brown leather wallet, ID ends with …, scratch near the clasp"
              className="w-full rounded-xl border border-amber-200/80 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-blue/30"
            />
            {claimError && <p className="text-sm text-red-600">{claimError}</p>}
            <button
              type="submit"
              disabled={claimLoading || !claimMsg.trim()}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {claimLoading ? 'Submitting…' : 'Submit claim & open chat'}
            </button>
          </form>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {claimPendingCheck ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : claimGateActive ? (
          <p className="text-center text-slate-500 text-sm py-6">Messages will appear here after you submit your claim.</p>
        ) : loading && messages.length === 0 ? (
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
                    mine ? 'bg-brand-blue text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {!mine && (
                    <p className="text-[10px] uppercase tracking-wide opacity-70 mb-1">
                      {publicUserLabel(m.senderId)}
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
        onSubmit={send}
        className="sticky bottom-0 pt-2 pb-1 bg-slate-50 -mx-4 px-4 border-t border-slate-200 md:static md:border-0 md:bg-transparent md:px-0"
      >
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              messagingLocked ? 'Wait for access or submit your claim above…' : 'Type a message…'
            }
            maxLength={5000}
            disabled={messagingLocked}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base bg-white focus:ring-2 focus:ring-brand-blue/30 disabled:bg-slate-100 disabled:text-slate-500"
          />
          <button
            type="submit"
            disabled={sendLoading || !text.trim() || messagingLocked}
            className="px-5 rounded-2xl bg-brand-blue text-white font-semibold disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
