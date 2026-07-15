import { useEffect, useState, useRef } from 'react';
import { Video, PlusCircle, RefreshCw, ExternalLink, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

const loadJitsiScript = (callback) => {
  if (window.JitsiMeetExternalAPI) {
    callback(true);
    return;
  }
  const existing = document.getElementById('jitsi-external-api');
  if (existing) {
    existing.addEventListener('load', () => callback(true));
    existing.addEventListener('error', () => callback(false));
    return;
  }

  const script = document.createElement('script');
  script.id = 'jitsi-external-api';
  script.src = 'https://meet.jit.si/external_api.js';
  script.async = true;
  script.onload = () => callback(true);
  script.onerror = () => callback(false);
  document.body.appendChild(script);
};

export default function AdminVideoCalls() {
  const [meetings, setMeetings] = useState([]);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [jitsiReady, setJitsiReady] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const jitsiRef = useRef(null);
  const apiRef = useRef(null);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/erp/communications/meetings');
      setMeetings(res.data.meetings.filter((item) => item.mode === 'video'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    loadJitsiScript(setJitsiReady);
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!activeMeeting || !jitsiReady || !window.JitsiMeetExternalAPI) return;
    if (!jitsiRef.current) return;
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }

    try {
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: activeMeeting.room_name,
        parentNode: jitsiRef.current,
        width: '100%',
        height: 520,
        configOverwrite: {
          startWithVideoMuted: false,
          startWithAudioMuted: false,
          prejoinPageEnabled: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat', 'participants-pane', 'tile-view'],
        },
        userInfo: {
          displayName: activeMeeting.title,
        },
      });
      setJoinError(null);
    } catch (err) {
      console.error('Jitsi init failed:', err);
      setJoinError('Could not start the meeting. Please open the room in a new tab.');
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [activeMeeting, jitsiReady]);

  const createMeeting = async () => {
    if (!title.trim()) return toast.error('Enter a meeting title');
    setCreating(true);
    try {
      const res = await api.post('/erp/communications/meetings', { title: title.trim(), mode: 'video', is_audio_only: false });
      setMeetings((prev) => [res.data.meeting, ...prev]);
      setTitle('');
      setActiveMeeting(res.data.meeting);
      toast.success('Video call created. Join below.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const joinMeeting = (meeting) => {
    setActiveMeeting(meeting);
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' }}>Video Calls</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>Create and join internal video meetings quickly using the embedded meeting room. Participants can join via the shared room link.</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
          <Video size={18} color='#3b82f6' />
          <span style={{ fontSize: 13, color: '#111827', fontWeight: 700 }}>Ready now</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gap: 10, background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              style={{ flex: 1, borderRadius: 14, border: '1px solid #cbd5e1', padding: '12px 14px', fontSize: 14 }}
            />
            <button
              type="button"
              onClick={createMeeting}
              disabled={creating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 18px', cursor: 'pointer', fontWeight: 700 }}
            >
              {creating ? 'Creating...' : 'Create Video Call'}
              <PlusCircle size={16} />
            </button>
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>A meeting room will be created and stored for your business. Share the room link with colleagues to join.</div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>Past video meetings</div>
            <button type="button" onClick={fetchMeetings} style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#0f172a', padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}><RefreshCw size={16} /> Refresh</button>
          </div>
          {loading ? (
            <div style={{ color: '#64748b' }}>Loading meetings...</div>
          ) : meetings.length === 0 ? (
            <div style={{ color: '#64748b' }}>No video rooms created yet. Create one above.</div>
          ) : (
            meetings.map((meeting) => (
              <div key={meeting.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{meeting.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(meeting.created_at).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => joinMeeting(meeting)} style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#0f172a', padding: '10px 16px', borderRadius: 12, cursor: 'pointer' }}>Join</button>
                  <a href={`https://meet.jit.si/${meeting.room_name}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#3b82f6', fontWeight: 700 }}><ExternalLink size={16} /> Open in tab</a>
                </div>
              </div>
            ))
          )}
        </div>

        {activeMeeting && (
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Meeting: {activeMeeting.title}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Room: {activeMeeting.room_name}</div>
              </div>
              <button type="button" onClick={() => setActiveMeeting(null)} style={{ border: 'none', background: '#f8fafc', color: '#ef4444', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><X size={16} /> Close</button>
            </div>
            {!jitsiReady ? (
              <div style={{ color: '#64748b', fontSize: 13 }}>Loading meeting room... If the embedded room does not load, use the button below.</div>
            ) : joinError ? (
              <div style={{ color: '#b91c1c', fontSize: 13 }}>{joinError}</div>
            ) : null}
            <div ref={jitsiRef} style={{ minHeight: 520, borderRadius: 18, overflow: 'hidden', background: '#000' }} />
          </div>
        )}
      </div>
    </div>
  );
}

