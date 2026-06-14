import React, { useState, useEffect, useRef } from 'react';
import { 
  Inbox, Send, FileText, ShieldAlert, Bell, Users, Mail,
  Search, RefreshCw, Trash2, Edit, LogOut, ShieldAlert as AdminIcon,
  Paperclip, X, ChevronRight, User, Calendar, Plus, ChevronLeft
} from 'lucide-react';
import { request } from '../api/client';

export default function WebmailView({ user, onLogout, onNavigateToAdmin, onNavigateToTenant }) {
  const [folders, setFolders] = useState(['INBOX', 'Sent', 'Drafts', 'Spam', 'Notifications', 'Social']);
  const [activeFolder, setActiveFolder] = useState('INBOX');
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageDetails, setMessageDetails] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [syncingMailbox, setSyncingMailbox] = useState(false);

  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef(null);

  // Fetch Folders
  useEffect(() => {
    async function loadFolders() {
      try {
        const res = await request('/api/folders/');
        if (res.folders && res.folders.length > 0) {
          // Normalize folders (e.g. capitalize INBOX and merge with defaults)
          const fetched = res.folders.map(f => f === 'INBOX' ? 'INBOX' : f);
          const combined = Array.from(new Set(['INBOX', 'Sent', 'Drafts', 'Spam', ...fetched]));
          setFolders(combined);
        }
      } catch (err) {
        console.error('Error fetching folders:', err);
      }
    }
    loadFolders();
  }, []);

  // Fetch Message List
  const fetchMessages = async (folderName, sync = true) => {
    setLoadingList(true);
    if (sync) setSyncingMailbox(true);
    try {
      const url = `/api/messages/?folder=${encodeURIComponent(folderName)}`;
      const res = await request(url);
      setMessages(res.results || res || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingList(false);
      setSyncingMailbox(false);
    }
  };

  useEffect(() => {
    if (!searchQuery) {
      fetchMessages(activeFolder, true);
    }
  }, [activeFolder, searchQuery]);

  // Handle Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchMessages(activeFolder, false);
      return;
    }
    setIsSearching(true);
    setLoadingList(true);
    try {
      const res = await request(`/api/search/?q=${encodeURIComponent(searchQuery)}`);
      setMessages(res.results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoadingList(false);
      setIsSearching(false);
    }
  };

  // View Message Details
  const handleSelectMessage = async (msg) => {
    setSelectedMessage(msg);
    setLoadingDetails(true);
    setMessageDetails(null);
    try {
      const res = await request(`/api/messages/${encodeURIComponent(msg.folder)}/${msg.uid}/`);
      setMessageDetails(res);
      // Mark as seen locally
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, seen: true } : m));
    } catch (err) {
      console.error('Failed to fetch message details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Delete Message
  const handleDeleteMessage = async (msg) => {
    if (!window.confirm('Are you sure you want to delete this email?')) return;
    try {
      await request(`/api/messages/${encodeURIComponent(msg.folder)}/${msg.uid}/`, {
        method: 'DELETE',
      });
      // Remove from state
      setMessages(prev => prev.filter(m => m.uid !== msg.uid || m.folder !== msg.folder));
      if (selectedMessage && selectedMessage.uid === msg.uid && selectedMessage.folder === msg.folder) {
        setSelectedMessage(null);
        setMessageDetails(null);
      }
    } catch (err) {
      alert('Failed to delete email: ' + err.message);
    }
  };

  // Send Message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!composeTo.trim()) {
      alert('Recipient is required');
      return;
    }
    setSending(true);

    try {
      const formData = new FormData();
      formData.append('to', composeTo);
      if (composeCc.trim()) formData.append('cc', composeCc);
      formData.append('subject', composeSubject);
      formData.append('body', composeBody);
      
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      await request('/api/send/', {
        method: 'POST',
        body: formData,
      });

      alert('Message sent successfully!');
      setShowCompose(false);
      setComposeTo('');
      setComposeCc('');
      setComposeSubject('');
      setComposeBody('');
      setAttachments([]);
      
      // Refresh Sent box if active
      if (activeFolder === 'Sent') {
        fetchMessages('Sent', true);
      }
    } catch (err) {
      alert('Failed to send: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // Handle Logout
  const handleLogoutClick = async () => {
    try {
      await request('/api/auth/logout/', { method: 'POST' });
      onLogout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const getFolderIcon = (name) => {
    switch (name.toLowerCase()) {
      case 'inbox': return <Inbox size={18} />;
      case 'sent': return <Send size={18} />;
      case 'drafts': return <FileText size={18} />;
      case 'spam': return <ShieldAlert size={18} />;
      case 'notifications': return <Bell size={18} />;
      case 'social': return <Users size={18} />;
      default: return <Mail size={18} />;
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={styles.appContainer}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoContainer}>
            <Mail size={22} color="#6366f1" />
          </div>
          <div>
            <div style={styles.logoText}>MailStack</div>
            <div style={styles.activeMailbox}>{user.mailbox || 'No Mailbox'}</div>
          </div>
        </div>

        <button style={styles.composeBtn} onClick={() => setShowCompose(true)}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          <span>Compose</span>
        </button>

        <nav style={styles.nav}>
          <div style={styles.sectionHeader}>Folders</div>
          <ul style={styles.folderList}>
            {folders.map((folder) => (
              <li key={folder}>
                <button
                  style={{
                    ...styles.folderItem,
                    backgroundColor: activeFolder === folder ? 'var(--color-primary-soft)' : 'transparent',
                    color: activeFolder === folder ? 'var(--color-primary)' : 'var(--text-secondary)',
                    fontWeight: activeFolder === folder ? '600' : '400',
                  }}
                  onClick={() => {
                    setActiveFolder(folder);
                    setSelectedMessage(null);
                    setMessageDetails(null);
                    setSearchQuery('');
                  }}
                >
                  <span style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
                    {getFolderIcon(folder)}
                  </span>
                  <span>{folder === 'INBOX' ? 'Inbox' : folder}</span>
                </button>
              </li>
            ))}
          </ul>

          {user.is_staff && (
            <>
              <div style={styles.sectionHeader}>Administration</div>
              <button style={styles.adminLink} onClick={onNavigateToAdmin}>
                <AdminIcon size={18} style={{ marginRight: '10px' }} />
                <span>Admin Control Panel</span>
              </button>
            </>
          )}

          {/* SaaS Workspace Management */}
          <>
            <div style={styles.sectionHeader}>Workspace</div>
            <button style={styles.tenantLink} onClick={onNavigateToTenant}>
              <Users size={18} style={{ marginRight: '10px' }} />
              <span>Manage Workspace</span>
            </button>
          </>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <User size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)' }} />
            <span style={styles.username}>{user.username}</span>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogoutClick} title="Logout">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area: Split List & Detail */}
      <main style={styles.mainContent}>
        {/* Top Header Bar */}
        <header style={styles.topHeader}>
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search in mailbox..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} style={styles.clearSearch}>
                <X size={16} />
              </button>
            )}
          </form>
          
          <button 
            style={styles.refreshBtn} 
            onClick={() => fetchMessages(activeFolder, true)}
            disabled={loadingList || syncingMailbox}
          >
            <RefreshCw size={18} className={syncingMailbox ? 'animate-spin' : ''} />
          </button>
        </header>

        {/* Dynamic Split View */}
        <div style={styles.splitView}>
          {/* Email List Column */}
          <section style={{
            ...styles.listPane,
            width: selectedMessage ? '40%' : '100%',
          }}>
            {loadingList && messages.length === 0 ? (
              <div style={styles.centerBox}>
                <RefreshCw size={24} className="animate-spin" color="var(--color-primary)" />
                <p style={{ marginTop: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Syncing mailbox...
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div style={styles.centerBox}>
                <Mail size={32} color="var(--text-muted)" />
                <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>No messages found.</p>
              </div>
            ) : (
              <div style={styles.messageListScroll}>
                {messages.map((msg) => (
                  <div
                    key={msg.id || `${msg.folder}-${msg.uid}`}
                    style={{
                      ...styles.msgCard,
                      backgroundColor: selectedMessage && selectedMessage.uid === msg.uid && selectedMessage.folder === msg.folder
                        ? 'var(--bg-tertiary)' 
                        : 'transparent',
                      borderLeft: !msg.seen ? '3px solid var(--color-primary)' : '3px solid transparent',
                    }}
                    onClick={() => handleSelectMessage(msg)}
                  >
                    <div style={styles.msgHeader}>
                      <span style={{
                        ...styles.msgFrom,
                        fontWeight: !msg.seen ? '700' : '500',
                      }}>{msg.from_addr}</span>
                      <span style={styles.msgDate}>{formatDate(msg.date)}</span>
                    </div>
                    <div style={{
                      ...styles.msgSubject,
                      fontWeight: !msg.seen ? '700' : '400',
                    }}>{msg.subject || '(No Subject)'}</div>
                    <div style={styles.msgSnippet}>{msg.snippet}</div>
                    <div style={styles.msgActions}>
                      <span style={styles.msgSize}>{formatSize(msg.size)}</span>
                      <button 
                        style={styles.deleteActionBtn} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMessage(msg);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Email Details Column */}
          <section style={{
            ...styles.detailPane,
            display: selectedMessage ? 'flex' : 'none',
          }}>
            {loadingDetails ? (
              <div style={styles.centerBox}>
                <RefreshCw size={24} className="animate-spin" color="var(--color-primary)" />
                <p style={{ marginTop: '10px', fontSize: '0.875rem' }}>Loading message content...</p>
              </div>
            ) : messageDetails ? (
              <div style={styles.detailWrapper}>
                <div style={styles.detailHeader}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h2 style={styles.detailSubject}>{messageDetails.subject || '(No Subject)'}</h2>
                    <div style={styles.detailHeaderActions}>
                      <button style={styles.detailDeleteBtn} onClick={() => handleDeleteMessage(selectedMessage)}>
                        <Trash2 size={16} style={{ marginRight: '6px' }} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                  
                  <div style={styles.metaRow}>
                    <div style={styles.metaLabel}>From:</div>
                    <div style={styles.metaValue}>{messageDetails.from}</div>
                  </div>
                  <div style={styles.metaRow}>
                    <div style={styles.metaLabel}>To:</div>
                    <div style={styles.metaValue}>{messageDetails.to}</div>
                  </div>
                  <div style={styles.metaRow}>
                    <div style={styles.metaLabel}>Date:</div>
                    <div style={{ ...styles.metaValue, display: 'flex', alignItems: 'center' }}>
                      <Calendar size={14} style={{ marginRight: '6px', color: 'var(--text-secondary)' }} />
                      <span>{formatDate(messageDetails.date)}</span>
                    </div>
                  </div>
                </div>

                {messageDetails.attachments && messageDetails.attachments.length > 0 && (
                  <div style={styles.attachmentsContainer}>
                    <div style={styles.attachmentsTitle}>
                      <Paperclip size={14} style={{ marginRight: '6px' }} />
                      <span>Attachments ({messageDetails.attachments.length})</span>
                    </div>
                    <div style={styles.attachmentsList}>
                      {messageDetails.attachments.map((att, idx) => (
                        <div key={idx} style={styles.attachmentItem}>
                          <span style={styles.attachmentName}>{att.filename}</span>
                          <span style={styles.attachmentSize}>({formatSize(att.size)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={styles.messageBody}>
                  {messageDetails.text}
                </div>
              </div>
            ) : (
              <div style={styles.centerBox}>
                <Mail size={36} color="var(--text-muted)" />
                <p style={{ marginTop: '10px' }}>Select an email to view its content.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Compose Email Modal */}
      {showCompose && (
        <div style={styles.modalOverlay}>
          <div style={styles.composeCard} className="animate-fade">
            <div style={styles.composeCardHeader}>
              <h3 style={styles.composeTitle}>New Message</h3>
              <button style={styles.closeCompose} onClick={() => setShowCompose(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSend} style={styles.composeForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>To</label>
                <input
                  type="text"
                  placeholder="recipients@example.com (comma separated)"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Cc</label>
                <input
                  type="text"
                  placeholder="carboncopy@example.com"
                  value={composeCc}
                  onChange={(e) => setComposeCc(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Subject</label>
                <input
                  type="text"
                  placeholder="Enter message subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={{ ...styles.formGroup, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={styles.formLabel}>Message Body</label>
                <textarea
                  placeholder="Write your email details here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  style={styles.formTextarea}
                  required
                />
              </div>

              {attachments.length > 0 && (
                <div style={styles.composeFileList}>
                  {attachments.map((file, index) => (
                    <div key={index} style={styles.composeFileItem}>
                      <Paperclip size={12} style={{ marginRight: '6px' }} />
                      <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                        style={styles.removeFileBtn}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.composeFooter}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    style={styles.attachBtn} 
                    onClick={() => fileInputRef.current.click()}
                  >
                    <Paperclip size={18} style={{ marginRight: '6px' }} />
                    <span>Attach Files</span>
                  </button>
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files) {
                        setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" style={styles.cancelSendBtn} onClick={() => setShowCompose(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.sendBtn} disabled={sending}>
                    {sending ? <RefreshCw size={16} className="animate-spin" /> : 'Send Email'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
  },
  sidebar: {
    width: '260px',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '2rem',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary-soft)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: '800',
    fontSize: '1.25rem',
    color: '#ffffff',
  },
  activeMailbox: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    maxWidth: '180px',
    whiteSpace: 'nowrap',
  },
  composeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    borderRadius: 'var(--radius-md)',
    fontWeight: '600',
    fontSize: '0.95rem',
    boxShadow: 'var(--shadow-primary)',
    marginBottom: '1.5rem',
    transition: 'background-color var(--transition-fast)',
    ':hover': {
      backgroundColor: 'var(--color-primary-hover)',
    },
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sectionHeader: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '1rem 0 0.5rem 0.75rem',
  },
  folderList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  folderItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    transition: 'all var(--transition-fast)',
    textAlign: 'left',
  },
  adminLink: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-warning)',
    backgroundColor: 'var(--color-warning-soft)',
    border: '1px solid rgba(245, 158, 11, 0.1)',
    fontSize: '0.9rem',
    fontWeight: '600',
    textAlign: 'left',
    transition: 'opacity var(--transition-fast)',
    ':hover': {
      opacity: 0.9,
    },
  },
  tenantLink: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    color: '#818cf8',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.1)',
    fontSize: '0.9rem',
    fontWeight: '600',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'opacity var(--transition-fast)',
    marginTop: '8px',
    ':hover': {
      opacity: 0.9,
    },
  },
  sidebarFooter: {
    marginTop: 'auto',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 0.5rem',
  },
  username: {
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.5rem 0.75rem',
    color: 'var(--color-danger)',
    backgroundColor: 'var(--color-danger-soft)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
  },
  topHeader: {
    height: '64px',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    backgroundColor: 'var(--bg-secondary)',
  },
  searchForm: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '450px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-secondary)',
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 2.5rem 0.5rem 40px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: '#ffffff',
    fontSize: '0.9rem',
  },
  clearSearch: {
    position: 'absolute',
    right: '12px',
    color: 'var(--text-secondary)',
  },
  refreshBtn: {
    padding: '0.5rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
    ':hover': {
      color: '#ffffff',
    },
  },
  splitView: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  listPane: {
    borderRight: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    transition: 'width var(--transition-normal)',
  },
  messageListScroll: {
    display: 'flex',
    flexDirection: 'column',
  },
  centerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'var(--text-secondary)',
  },
  msgCard: {
    padding: '1.25rem',
    borderBottom: '1px solid var(--glass-border)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  msgHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
  },
  msgFrom: {
    color: 'var(--text-primary)',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    maxWidth: '75%',
  },
  msgDate: {
    color: 'var(--text-secondary)',
  },
  msgSubject: {
    color: '#ffffff',
    fontSize: '0.9rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  msgSnippet: {
    fontSize: '0.825rem',
    color: 'var(--text-secondary)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    lineHeight: '1.35',
  },
  msgActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.25rem',
  },
  msgSize: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  deleteActionBtn: {
    color: 'var(--text-muted)',
    ':hover': {
      color: 'var(--color-danger)',
    },
  },
  detailPane: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'var(--bg-secondary)',
    overflowY: 'auto',
  },
  detailWrapper: {
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  detailHeader: {
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  detailSubject: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff',
    marginRight: '1rem',
  },
  detailHeaderActions: {
    display: 'flex',
    gap: '10px',
  },
  detailDeleteBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--color-danger-soft)',
    color: 'var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  metaRow: {
    display: 'flex',
    fontSize: '0.875rem',
  },
  metaLabel: {
    width: '60px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  metaValue: {
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  attachmentsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    border: '1px solid var(--glass-border)',
  },
  attachmentsTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '0.75rem',
  },
  attachmentsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  attachmentItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    border: '1px solid var(--glass-border)',
  },
  attachmentName: {
    color: 'var(--text-primary)',
    marginRight: '6px',
    fontWeight: '500',
  },
  attachmentSize: {
    fontSize: '0.75rem',
  },
  messageBody: {
    whiteSpace: 'pre-wrap',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    color: '#d1d5db',
    fontFamily: 'var(--font-sans)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 5, 10, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  composeCard: {
    width: '100%',
    maxWidth: '650px',
    height: '80vh',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  composeCardHeader: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  composeTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
    fontSize: '1.1rem',
  },
  closeCompose: {
    color: 'var(--text-secondary)',
    ':hover': { color: '#ffffff' },
  },
  composeForm: {
    flex: 1,
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  formLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  formInput: {
    padding: '0.6rem 0.75rem',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
  },
  formTextarea: {
    flex: 1,
    minHeight: '200px',
    padding: '0.75rem',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.95rem',
    resize: 'none',
    lineHeight: '1.5',
  },
  composeFileList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '0.5rem',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
  },
  composeFileItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.35rem 0.6rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    maxWidth: '220px',
  },
  removeFileBtn: {
    marginLeft: '6px',
    color: 'var(--text-muted)',
    ':hover': { color: 'var(--color-danger)' },
  },
  composeFooter: {
    marginTop: 'auto',
    paddingTop: '1rem',
    borderTop: '1px solid var(--glass-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 1rem',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    fontWeight: '500',
    ':hover': {
      borderColor: 'var(--color-primary)',
      color: '#ffffff',
    },
  },
  sendBtn: {
    padding: '0.6rem 1.25rem',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: 'var(--shadow-primary)',
  },
  cancelSendBtn: {
    padding: '0.6rem 1rem',
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
};
