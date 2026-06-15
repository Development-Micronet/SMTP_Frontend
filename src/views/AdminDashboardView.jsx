import React, { useState, useEffect } from 'react';
import { 
  Globe, PersonStanding, Users, Mail, ArrowLeft, Plus, 
  Trash2, RefreshCw, Key, Shield, UserPlus, ToggleLeft, ToggleRight
} from 'lucide-react';
import { request } from '../api/client';

export default function AdminDashboardView({ onBackToWebmail }) {
  const [activeTab, setActiveTab] = useState('domains');

  // Domains State
  const [domains, setDomains] = useState([]);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainSelector, setNewDomainSelector] = useState('mail');

  // Mailboxes State
  const [mailboxes, setMailboxes] = useState([]);
  const [newMailAddress, setNewMailAddress] = useState('');
  const [newMailPassword, setNewMailPassword] = useState('');
  const [newMailQuota, setNewMailQuota] = useState(2048);
  const [selectedDomainId, setSelectedDomainId] = useState('');

  // Aliases State
  const [aliases, setAliases] = useState([]);
  const [newAliasSource, setNewAliasSource] = useState('');
  const [newAliasDest, setNewAliasDest] = useState('');
  const [selectedAliasDomainId, setSelectedAliasDomainId] = useState('');

  // Delivery Tracking State
  const [trackedEmails, setTrackedEmails] = useState([]);

  // General state
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch data on Tab Change
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'domains') {
        const res = await request('/api/admin/domains/');
        setDomains(res.results || res || []);
      } else if (activeTab === 'mailboxes') {
        const dRes = await request('/api/admin/domains/');
        const mRes = await request('/api/admin/mailboxes/');
        setDomains(dRes.results || dRes || []);
        setMailboxes(mRes.results || mRes || []);
        if (dRes.results && dRes.results.length > 0) {
          setSelectedDomainId(dRes.results[0].id);
        } else if (dRes.length > 0) {
          setSelectedDomainId(dRes[0].id);
        }
      } else if (activeTab === 'aliases') {
        const dRes = await request('/api/admin/domains/');
        const aRes = await request('/api/admin/aliases/');
        setDomains(dRes.results || dRes || []);
        setAliases(aRes.results || aRes || []);
        if (dRes.results && dRes.results.length > 0) {
          setSelectedAliasDomainId(dRes.results[0].id);
        } else if (dRes.length > 0) {
          setSelectedAliasDomainId(dRes[0].id);
        }
      } else if (activeTab === 'emails') {
        const res = await request('/api/admin/emails/');
        setTrackedEmails(res.results || res || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Create Domain
  const handleCreateDomain = async (e) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;
    setActionLoading(true);
    try {
      await request('/api/admin/domains/', {
        method: 'POST',
        body: JSON.stringify({
          name: newDomainName.trim().toLowerCase(),
          dkim_selector: newDomainSelector.trim(),
        }),
      });
      setNewDomainName('');
      fetchData();
    } catch (err) {
      alert('Failed to add domain: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Domain
  const handleDeleteDomain = async (id) => {
    if (!window.confirm('Delete domain? This may fail if there are active mailboxes.')) return;
    try {
      await request(`/api/admin/domains/${id}/`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Create Mailbox
  const handleCreateMailbox = async (e) => {
    e.preventDefault();
    if (!newMailAddress.trim() || !newMailPassword.trim()) {
      alert('Please fill local part and password');
      return;
    }
    setActionLoading(true);
    try {
      await request('/api/admin/mailboxes/', {
        method: 'POST',
        body: JSON.stringify({
          domain: parseInt(selectedDomainId),
          local_part: newMailAddress.trim().toLowerCase(),
          password: newMailPassword,
          quota_mb: parseInt(newMailQuota),
        }),
      });
      setNewMailAddress('');
      setNewMailPassword('');
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Mailbox
  const handleDeleteMailbox = async (id) => {
    if (!window.confirm('Delete mailbox address? This removes authentication.')) return;
    try {
      await request(`/api/admin/mailboxes/${id}/`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  // Create Alias
  const handleCreateAlias = async (e) => {
    e.preventDefault();
    if (!newAliasDest.trim()) return;
    setActionLoading(true);
    try {
      await request('/api/admin/aliases/', {
        method: 'POST',
        body: JSON.stringify({
          domain: parseInt(selectedAliasDomainId),
          source: newAliasSource.trim().toLowerCase(),
          destination: newAliasDest.trim().toLowerCase(),
        }),
      });
      setNewAliasSource('');
      setNewAliasDest('');
      fetchData();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Alias
  const handleDeleteAlias = async (id) => {
    if (!window.confirm('Delete alias mapping?')) return;
    try {
      await request(`/api/admin/aliases/${id}/`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  // Delete Tracked Email Metadata
  const handleDeleteTrackedEmail = async (id) => {
    if (!window.confirm('Delete tracking row from DB? This does NOT delete files from disk.')) return;
    try {
      await request(`/api/admin/emails/${id}/`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  return (
    <div style={styles.dashboardContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button style={styles.backBtn} onClick={onBackToWebmail}>
            <ArrowLeft size={18} />
            <span>Back to Webmail</span>
          </button>
          <h1 style={styles.title}>Admin Panel</h1>
        </div>
        <button style={styles.refreshBtn} onClick={fetchData} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Admin Layout */}
      <div style={styles.layout}>
        {/* Navigation Sidebar */}
        <aside style={styles.navSidebar}>
          <button
            style={{ ...styles.navItem, color: activeTab === 'domains' ? 'var(--color-primary)' : 'var(--text-secondary)' }}
            onClick={() => setActiveTab('domains')}
          >
            <Globe size={18} />
            <span>Domains</span>
          </button>
          <button
            style={{ ...styles.navItem, color: activeTab === 'mailboxes' ? 'var(--color-primary)' : 'var(--text-secondary)' }}
            onClick={() => setActiveTab('mailboxes')}
          >
            <Shield size={18} />
            <span>Email Accounts</span>
          </button>
          <button
            style={{ ...styles.navItem, color: activeTab === 'aliases' ? 'var(--color-primary)' : 'var(--text-secondary)' }}
            onClick={() => setActiveTab('aliases')}
          >
            <Users size={18} />
            <span>Aliases</span>
          </button>
          <button
            style={{ ...styles.navItem, color: activeTab === 'emails' ? 'var(--color-primary)' : 'var(--text-secondary)' }}
            onClick={() => setActiveTab('emails')}
          >
            <Mail size={18} />
            <span>Tracked Emails</span>
          </button>
        </aside>

        {/* Action Panel Content */}
        <main style={styles.mainPane}>
          {loading ? (
            <div style={styles.loadingBox}>
              <RefreshCw size={28} className="animate-spin" color="var(--color-primary)" />
              <p style={{ marginTop: '10px' }}>Loading configuration data...</p>
            </div>
          ) : (
            <div style={{ padding: '2rem' }} className="animate-fade">
              {/* DOMAINS TAB */}
              {activeTab === 'domains' && (
                <div>
                  <h2 style={styles.sectionTitle}>Domains Configuration</h2>
                  
                  {/* Create Domain */}
                  <form onSubmit={handleCreateDomain} style={styles.formInline}>
                    <input
                      type="text"
                      placeholder="example.com"
                      value={newDomainName}
                      onChange={(e) => setNewDomainName(e.target.value)}
                      style={styles.formInput}
                      required
                    />
                    <input
                      type="text"
                      placeholder="dkim selector (default: mail)"
                      value={newDomainSelector}
                      onChange={(e) => setNewDomainSelector(e.target.value)}
                      style={styles.formInput}
                    />
                    <button type="submit" style={styles.submitBtn} disabled={actionLoading}>
                      <Plus size={16} style={{ marginRight: '6px' }} />
                      <span>Add Domain</span>
                    </button>
                  </form>

                  {/* List Domains */}
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Domain Name</th>
                        <th style={styles.th}>DKIM Selector</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {domains.map((dom) => (
                        <tr key={dom.id} style={styles.tr}>
                          <td style={styles.td}>{dom.name}</td>
                          <td style={styles.td}>{dom.dkim_selector}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.badge,
                              color: dom.active ? 'var(--color-success)' : 'var(--color-danger)',
                              backgroundColor: dom.active ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                            }}>
                              {dom.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button style={styles.deleteBtn} onClick={() => handleDeleteDomain(dom.id)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MAILBOXES TAB */}
              {activeTab === 'mailboxes' && (
                <div>
                  <h2 style={styles.sectionTitle}>Manage Email Accounts</h2>

                  {/* Create Mailbox */}
                  <form onSubmit={handleCreateMailbox} style={styles.formInline}>
                    <input
                      type="text"
                      placeholder="local_part (e.g. alice)"
                      value={newMailAddress}
                      onChange={(e) => setNewMailAddress(e.target.value)}
                      style={styles.formInput}
                      required
                    />
                    <select
                      value={selectedDomainId}
                      onChange={(e) => setSelectedDomainId(e.target.value)}
                      style={styles.formSelect}
                    >
                      {domains.map(d => (
                        <option key={d.id} value={d.id}>@{d.name}</option>
                      ))}
                    </select>
                    <input
                      type="password"
                      placeholder="secure password"
                      value={newMailPassword}
                      onChange={(e) => setNewMailPassword(e.target.value)}
                      style={styles.formInput}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Quota (MB)"
                      value={newMailQuota}
                      onChange={(e) => setNewMailQuota(e.target.value)}
                      style={{ ...styles.formInput, width: '100px' }}
                    />
                    <button type="submit" style={styles.submitBtn} disabled={actionLoading}>
                      <UserPlus size={16} style={{ marginRight: '6px' }} />
                      <span>Create</span>
                    </button>
                  </form>

                  {/* List Mailboxes */}
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Address</th>
                        <th style={styles.th}>Quota (MB)</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mailboxes.map((mb) => (
                        <tr key={mb.id} style={styles.tr}>
                          <td style={styles.td}>{mb.address}</td>
                          <td style={styles.td}>{mb.quota_mb} MB</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.badge,
                              color: mb.active ? 'var(--color-success)' : 'var(--color-danger)',
                              backgroundColor: mb.active ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                            }}>
                              {mb.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button style={styles.deleteBtn} onClick={() => handleDeleteMailbox(mb.id)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ALIASES TAB */}
              {activeTab === 'aliases' && (
                <div>
                  <h2 style={styles.sectionTitle}>Catch-all / Email Aliases</h2>

                  {/* Create Alias */}
                  <form onSubmit={handleCreateAlias} style={styles.formInline}>
                    <input
                      type="text"
                      placeholder="source prefix (empty for catch-all)"
                      value={newAliasSource}
                      onChange={(e) => setNewAliasSource(e.target.value)}
                      style={styles.formInput}
                    />
                    <select
                      value={selectedAliasDomainId}
                      onChange={(e) => setSelectedAliasDomainId(e.target.value)}
                      style={styles.formSelect}
                    >
                      {domains.map(d => (
                        <option key={d.id} value={d.id}>@{d.name}</option>
                      ))}
                    </select>
                    <span style={{ color: 'var(--text-secondary)' }}>➔</span>
                    <input
                      type="email"
                      placeholder="destination email address"
                      value={newAliasDest}
                      onChange={(e) => setNewAliasDest(e.target.value)}
                      style={styles.formInput}
                      required
                    />
                    <button type="submit" style={styles.submitBtn} disabled={actionLoading}>
                      <Plus size={16} style={{ marginRight: '6px' }} />
                      <span>Map Alias</span>
                    </button>
                  </form>

                  {/* List Aliases */}
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Alias Source</th>
                        <th style={styles.th}>Destination Email</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aliases.map((al) => (
                        <tr key={al.id} style={styles.tr}>
                          <td style={styles.td}>
                            {al.source ? `${al.source}@${al.domain_name}` : `*@${al.domain_name} (Catch-All)`}
                          </td>
                          <td style={styles.td}>{al.destination}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.badge,
                              color: al.active ? 'var(--color-success)' : 'var(--color-danger)',
                              backgroundColor: al.active ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                            }}>
                              {al.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button style={styles.deleteBtn} onClick={() => handleDeleteAlias(al.id)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TRACKED EMAILS TAB */}
              {activeTab === 'emails' && (
                <div>
                  <h2 style={styles.sectionTitle}>Email Delivery Auditing</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    View metadata representation of incoming/outgoing messages indexed in PostgreSQL database.
                  </p>

                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Folder</th>
                        <th style={styles.th}>Sender</th>
                        <th style={styles.th}>Recipient / Mailbox</th>
                        <th style={styles.th}>Subject</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Seen</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trackedEmails.map((em) => (
                        <tr key={em.id} style={styles.tr}>
                          <td style={styles.td}>{em.folder}</td>
                          <td style={styles.td}>{em.from_addr}</td>
                          <td style={styles.td}>{em.mailbox_address}</td>
                          <td style={styles.td}>{em.subject || '(No Subject)'}</td>
                          <td style={styles.td}>{new Date(em.date).toLocaleString()}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.badge,
                              color: em.seen ? 'var(--color-success)' : 'var(--color-warning)',
                              backgroundColor: em.seen ? 'var(--color-success-soft)' : 'var(--color-warning-soft)',
                            }}>
                              {em.seen ? 'Read' : 'Unread'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button style={styles.deleteBtn} onClick={() => handleDeleteTrackedEmail(em.id)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const styles = {
  dashboardContainer: {
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    height: '64px',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    backgroundColor: 'var(--bg-secondary)',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    ':hover': {
      color: '#ffffff',
      borderColor: '#ffffff',
    },
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: '800',
    fontSize: '1.25rem',
  },
  refreshBtn: {
    padding: '0.5rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-primary)',
  },
  layout: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  navSidebar: {
    width: '240px',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--glass-border)',
    padding: '2rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    textAlign: 'left',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all var(--transition-fast)',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
  },
  mainPane: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    overflowY: 'auto',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6rem 2rem',
    color: 'var(--text-secondary)',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '1rem',
  },
  formInline: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    backgroundColor: 'var(--bg-secondary)',
    padding: '1.25rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    marginBottom: '2rem',
  },
  formInput: {
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
  },
  formSelect: {
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--glass-border)',
  },
  th: {
    padding: '0.85rem 1.25rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  tr: {
    borderBottom: '1px solid var(--glass-border)',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.01)',
    },
  },
  td: {
    padding: '1rem 1.25rem',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
  },
  badge: {
    padding: '0.25rem 0.5rem',
    borderRadius: '100px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  deleteBtn: {
    color: 'var(--text-muted)',
    ':hover': {
      color: 'var(--color-danger)',
    },
  },
};
