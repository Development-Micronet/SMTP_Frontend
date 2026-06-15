import React, { useState, useEffect } from 'react';
import { 
  Building, Globe, Mail, Link as LinkIcon, ShieldCheck, 
  Info, Plus, Trash2, CheckCircle2, XCircle, 
  RefreshCw, LogOut, ArrowLeft, Key, ChevronRight, AlertTriangle
} from 'lucide-react';
import { request } from '../api/client';

export default function TenantDashboardView({ onBackToWebmail, onLogout }) {
  const [activeTab, setActiveTab] = useState('domains');
  const [org, setOrg] = useState(null);
  const [limits, setLimits] = useState(null);
  
  // Domains State
  const [domains, setDomains] = useState([]);
  const [newDomainName, setNewDomainName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [verifyingDomain, setVerifyingDomain] = useState(null);
  const [dnsDiagnostics, setDnsDiagnostics] = useState(null);

  // Mailboxes State
  const [mailboxes, setMailboxes] = useState([]);
  const [mailboxDomain, setMailboxDomain] = useState('');
  const [mailboxLocalPart, setMailboxLocalPart] = useState('');
  const [mailboxPassword, setMailboxPassword] = useState('');
  const [mailboxQuota, setMailboxQuota] = useState(1024);

  // Aliases State
  const [aliases, setAliases] = useState([]);
  const [aliasDomain, setAliasDomain] = useState('');
  const [aliasSource, setAliasSource] = useState('');
  const [aliasDestination, setAliasDestination] = useState('');

  // Status/Error State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const orgData = await request('/api/tenant/organization/');
      setOrg(orgData.organization);
      setLimits(orgData.limits);

      const domainList = await request('/api/tenant/domains/');
      setDomains(domainList);

      const mailboxList = await request('/api/tenant/mailboxes/');
      setMailboxes(mailboxList);

      const aliasList = await request('/api/tenant/aliases/');
      setAliases(aliasList);

      if (domainList.length > 0) {
        setMailboxDomain(domainList.find(d => d.is_verified)?.id || domainList[0].id);
        setAliasDomain(domainList[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard workspace data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      const res = await request('/api/tenant/domains/', {
        method: 'POST',
        body: JSON.stringify({ name: newDomainName.toLowerCase().trim() }),
      });
      setDomains([res, ...domains]);
      setNewDomainName('');
      setSelectedDomain(res);
      setSuccess(`Domain ${res.name} added! Please configure DNS settings to verify.`);
      
      // Update limits stats
      const orgData = await request('/api/tenant/organization/');
      setOrg(orgData.organization);
    } catch (err) {
      setError(err.message || 'Failed to add custom domain. Reached plan limit?');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDomain = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will delete all associated mailboxes.`)) return;
    setError('');
    setSuccess('');
    try {
      await request(`/api/tenant/domains/${id}/`, { method: 'DELETE' });
      setDomains(domains.filter(d => d.id !== id));
      setMailboxes(mailboxes.filter(m => m.domain !== id));
      setAliases(aliases.filter(a => a.domain !== id));
      if (selectedDomain?.id === id) {
        setSelectedDomain(null);
        setDnsDiagnostics(null);
      }
      setSuccess(`Domain ${name} successfully deleted.`);
      
      // Update limits stats
      const orgData = await request('/api/tenant/organization/');
      setOrg(orgData.organization);
    } catch (err) {
      setError(err.message || 'Failed to delete domain.');
    }
  };

  const handleVerifyDomain = async (id) => {
    setError('');
    setSuccess('');
    setVerifyingDomain(id);
    try {
      const res = await request(`/api/tenant/domains/${id}/verify/`, { method: 'POST' });
      setDnsDiagnostics(res.dns_diagnostics);
      
      // Update domain list with verification state
      const updatedDomains = domains.map(d => {
        if (d.id === id) {
          return { ...d, is_verified: res.is_verified, active: res.active };
        }
        return d;
      });
      setDomains(updatedDomains);

      const matchedDomain = updatedDomains.find(d => d.id === id);
      if (matchedDomain) {
        setSelectedDomain(matchedDomain);
      }

      if (res.is_verified) {
        setSuccess('Domain verified successfully! You can now create mailboxes under it.');
      } else {
        setError('Verification failed. TXT verification record not found or still propagating.');
      }
    } catch (err) {
      setError(err.message || 'DNS checking failed.');
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleCheckDiagnostics = async (id) => {
    try {
      const res = await request(`/api/tenant/domains/${id}/verify/`);
      setDnsDiagnostics(res.dns_diagnostics);
    } catch (err) {
      console.error('Failed to query diagnostics:', err);
    }
  };

  const handleCreateMailbox = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      const res = await request('/api/tenant/mailboxes/', {
        method: 'POST',
        body: JSON.stringify({
          domain: mailboxDomain,
          local_part: mailboxLocalPart.trim(),
          password: mailboxPassword,
          quota_mb: mailboxQuota
        }),
      });
      setMailboxes([res, ...mailboxes]);
      setMailboxLocalPart('');
      setMailboxPassword('');
      setSuccess(`Mailbox ${res.address} is created and live!`);

      // Update limits stats
      const orgData = await request('/api/tenant/organization/');
      setOrg(orgData.organization);
    } catch (err) {
      setError(err.message || 'Failed to create mailbox. Reached plan limits?');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMailbox = async (id, address) => {
    if (!confirm(`Are you sure you want to permanently delete mailbox ${address}? This cannot be undone.`)) return;
    setError('');
    setSuccess('');
    try {
      await request(`/api/tenant/mailboxes/${id}/`, { method: 'DELETE' });
      setMailboxes(mailboxes.filter(m => m.id !== id));
      setSuccess(`Mailbox ${address} has been deleted.`);
      
      // Update limits stats
      const orgData = await request('/api/tenant/organization/');
      setOrg(orgData.organization);
    } catch (err) {
      setError(err.message || 'Failed to delete mailbox.');
    }
  };

  const handleCreateAlias = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      const res = await request('/api/tenant/aliases/', {
        method: 'POST',
        body: JSON.stringify({
          domain: aliasDomain,
          source: aliasSource.trim(),
          destination: aliasDestination.trim()
        }),
      });
      setAliases([res, ...aliases]);
      setAliasSource('');
      setAliasDestination('');
      setSuccess(`Alias created successfully.`);
    } catch (err) {
      setError(err.message || 'Failed to create alias.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAlias = async (id) => {
    if (!confirm('Are you sure you want to delete this alias?')) return;
    setError('');
    setSuccess('');
    try {
      await request(`/api/tenant/aliases/${id}/`, { method: 'DELETE' });
      setAliases(aliases.filter(a => a.id !== id));
      setSuccess('Alias deleted.');
    } catch (err) {
      setError(err.message || 'Failed to delete alias.');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw size={36} className="animate-spin" color="var(--color-primary)" />
        <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Loading Workspace Settings...</p>
      </div>
    );
  }

  const verifiedDomains = domains.filter(d => d.is_verified);

  return (
    <div style={styles.container}>
      {/* Top Navigation */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBackToWebmail} style={styles.backBtn}>
            <ArrowLeft size={18} style={{ marginRight: '8px' }} />
            Back to Webmail
          </button>
          <div style={styles.workspaceBrand}>
            <Building size={20} color="var(--color-primary)" />
            <span style={styles.workspaceName}>{org?.name}</span>
            <span style={{...styles.tierBadge, ...styles.proBadge}}>INTERNAL USE ONLY</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button onClick={onLogout} style={styles.logoutBtn}>
            <LogOut size={16} style={{ marginRight: '6px' }} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div style={styles.layout}>
        {/* Sidebar Nav */}
        <nav style={styles.nav}>
          <button 
            onClick={() => { setActiveTab('domains'); setSuccess(''); setError(''); }}
            style={activeTab === 'domains' ? styles.navActive : styles.navInactive}
          >
            <Globe size={18} />
            <span>Custom Domains</span>
          </button>
          <button 
            onClick={() => { setActiveTab('mailboxes'); setSuccess(''); setError(''); }}
            style={activeTab === 'mailboxes' ? styles.navActive : styles.navInactive}
          >
            <Mail size={18} />
            <span>Email Mailboxes</span>
          </button>
          <button 
            onClick={() => { setActiveTab('aliases'); setSuccess(''); setError(''); }}
            style={activeTab === 'aliases' ? styles.navActive : styles.navInactive}
          >
            <LinkIcon size={18} />
            <span>Email Aliases</span>
          </button>
          <button 
            onClick={() => { setActiveTab('billing'); setSuccess(''); setError(''); }}
            style={activeTab === 'billing' ? styles.navActive : styles.navInactive}
          >
            <Info size={18} />
            <span>Workspace Info</span>
          </button>
        </nav>

        {/* Content Pane */}
        <main style={styles.content}>
          {error && (
            <div style={styles.errorAlert}>
              <XCircle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div style={styles.successAlert}>
              <CheckCircle2 size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {/* TAB: DOMAINS */}
          {activeTab === 'domains' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Custom Domains</h2>
                  <p style={styles.sectionSubtitle}>
                    Add and verify domains to receive or send emails. (Plan usage: {org?.domains_count} of {limits?.domains})
                  </p>
                </div>
                {domains.length < limits?.domains && (
                  <form onSubmit={handleAddDomain} style={styles.inlineForm}>
                    <input
                      type="text"
                      placeholder="e.g. company.com"
                      value={newDomainName}
                      onChange={(e) => setNewDomainName(e.target.value)}
                      style={styles.inlineInput}
                      required
                    />
                    <button type="submit" disabled={actionLoading} style={styles.addButton}>
                      <Plus size={16} />
                      Add Domain
                    </button>
                  </form>
                )}
              </div>

              <div style={styles.splitPane}>
                {/* Domain List */}
                <div style={styles.paneList}>
                  {domains.length === 0 ? (
                    <div style={styles.emptyState}>
                      <Globe size={40} color="var(--text-muted)" />
                      <p style={{ marginTop: '10px' }}>No custom domains added yet.</p>
                    </div>
                  ) : (
                    domains.map(d => (
                      <div 
                        key={d.id} 
                        onClick={() => { setSelectedDomain(d); handleCheckDiagnostics(d.id); }}
                        style={selectedDomain?.id === d.id ? styles.cardActive : styles.card}
                      >
                        <div style={styles.cardHeader}>
                          <span style={styles.domainNameTitle}>{d.name}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteDomain(d.id, d.name); }}
                            style={styles.deleteIconBtn}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div style={styles.cardMeta}>
                          {d.is_verified ? (
                            <span style={styles.statusVerified}>
                              <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> Verified & Active
                            </span>
                          ) : (
                            <span style={styles.statusPending}>
                              <AlertTriangle size={12} style={{ marginRight: '4px' }} /> Unverified
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Domain Detail Configuration Checklist */}
                <div style={styles.paneDetail}>
                  {selectedDomain ? (
                    <div>
                      <div style={styles.detailTitleBar}>
                        <h3>Configure & Verify: {selectedDomain.name}</h3>
                        {!selectedDomain.is_verified && (
                          <button 
                            onClick={() => handleVerifyDomain(selectedDomain.id)}
                            disabled={verifyingDomain === selectedDomain.id}
                            style={styles.verifyBtn}
                          >
                            {verifyingDomain === selectedDomain.id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              'Verify DNS Settings'
                            )}
                          </button>
                        )}
                      </div>

                      {/* DNS Copy-Paste Block */}
                      <div style={styles.dnsBox}>
                        <h4 style={styles.dnsBoxTitle}>1. Ownership Verification (Required)</h4>
                        <p style={styles.dnsBoxText}>Create the following TXT record on your DNS registrar to verify domain ownership:</p>
                        <div style={styles.dnsCodeCard}>
                          <div><strong>Type:</strong> <code style={styles.code}>TXT</code></div>
                          <div><strong>Name / Host:</strong> <code style={styles.code}>@</code> (or blank)</div>
                          <div><strong>TXT Value:</strong> <code style={styles.code}>mailstack-verification={selectedDomain.verification_token}</code></div>
                        </div>

                        <h4 style={{ ...styles.dnsBoxTitle, marginTop: '1.5rem' }}>2. MX Routing Records (Required for Inbound)</h4>
                        <p style={styles.dnsBoxText}>Configure MX records to route incoming emails to our server:</p>
                        <div style={styles.dnsCodeCard}>
                          <div><strong>Type:</strong> <code style={styles.code}>MX</code></div>
                          <div><strong>Name / Host:</strong> <code style={styles.code}>@</code></div>
                          <div><strong>Destination:</strong> <code style={styles.code}>mail.acetechnologys.com</code> (Priority 10)</div>
                        </div>
                      </div>

                      {/* Diagnostic status */}
                      <div style={styles.diagnosticSection}>
                        <h4 style={styles.diagnosticTitle}>DNS Diagnostics Status</h4>
                        <div style={styles.diagnosticGrid}>
                          <div style={styles.diagnosticRow}>
                            <span>MX Mail Server Connection</span>
                            {dnsDiagnostics?.mx_valid ? (
                              <span style={styles.statusVerified}><CheckCircle2 size={16} /> Configured</span>
                            ) : (
                              <span style={styles.statusPending}><XCircle size={16} /> Pending</span>
                            )}
                          </div>
                          <div style={styles.diagnosticRow}>
                            <span>SPF Anti-Spoofing TXT</span>
                            {dnsDiagnostics?.spf_valid ? (
                              <span style={styles.statusVerified}><CheckCircle2 size={16} /> Configured</span>
                            ) : (
                              <span style={styles.statusPending}><XCircle size={16} /> Pending</span>
                            )}
                          </div>
                          <div style={styles.diagnosticRow}>
                            <span>DKIM Integrity TXT</span>
                            {dnsDiagnostics?.dkim_valid ? (
                              <span style={styles.statusVerified}><CheckCircle2 size={16} /> Configured</span>
                            ) : (
                              <span style={styles.statusPending}><XCircle size={16} /> Pending</span>
                            )}
                          </div>
                          <div style={styles.diagnosticRow}>
                            <span>DMARC Safety TXT</span>
                            {dnsDiagnostics?.dmarc_valid ? (
                              <span style={styles.statusVerified}><CheckCircle2 size={16} /> Configured</span>
                            ) : (
                              <span style={styles.statusPending}><XCircle size={16} /> Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.selectPrompt}>
                      <Globe size={48} color="var(--text-muted)" />
                      <p style={{ marginTop: '15px' }}>Select a domain from the list to view its verification settings.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: MAILBOXES */}
          {activeTab === 'mailboxes' && (
            <div style={styles.tabContent}>
              <div style={styles.splitContentLayout}>
                {/* Mailbox Creation Form */}
                <div style={styles.creationCard}>
                  <h3 style={styles.panelTitle}>Create New Mailbox</h3>
                  {verifiedDomains.length === 0 ? (
                    <div style={styles.formWarning}>
                      <AlertTriangle size={18} style={{ marginRight: '8px' }} />
                      You must add and verify a custom domain before creating mailboxes.
                    </div>
                  ) : (
                    <form onSubmit={handleCreateMailbox} style={styles.verticalForm}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <div style={styles.emailInputWrapper}>
                          <input
                            type="text"
                            placeholder="alice"
                            value={mailboxLocalPart}
                            onChange={(e) => setMailboxLocalPart(e.target.value)}
                            style={styles.localPartInput}
                            required
                          />
                          <span style={styles.emailAt}>@</span>
                          <select
                            value={mailboxDomain}
                            onChange={(e) => setMailboxDomain(e.target.value)}
                            style={styles.domainSelect}
                            required
                          >
                            {verifiedDomains.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                          type="password"
                          placeholder="Secure mailbox password"
                          value={mailboxPassword}
                          onChange={(e) => setMailboxPassword(e.target.value)}
                          style={styles.standardInput}
                          required
                          minLength={8}
                        />
                      </div>

                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Storage Quota (Max {limits?.quota_mb} MB)</label>
                        <select
                          value={mailboxQuota}
                          onChange={(e) => setMailboxQuota(parseInt(e.target.value))}
                          style={styles.standardSelect}
                        >
                          <option value={512}>512 MB</option>
                          <option value={1024}>1 GB (1024 MB)</option>
                          <option value={2048}>2 GB (2048 MB)</option>
                          <option value={5120}>5 GB (5120 MB)</option>
                          <option value={10240}>10 GB (10240 MB)</option>
                          <option value={20480}>20 GB (20480 MB)</option>
                        </select>
                      </div>

                      <button type="submit" disabled={actionLoading} style={styles.createBtn}>
                        Create Mailbox
                      </button>
                    </form>
                  )}
                </div>

                {/* Mailboxes List */}
                <div style={styles.tableCard}>
                  <div style={styles.tableHeaderBar}>
                    <h3 style={styles.panelTitle}>Active Mailboxes</h3>
                    <span style={styles.counterText}>({mailboxes.length} of {limits?.mailboxes} created)</span>
                  </div>

                  {mailboxes.length === 0 ? (
                    <div style={styles.emptyState}>
                      <Mail size={40} color="var(--text-muted)" />
                      <p style={{ marginTop: '10px' }}>No mailboxes registered.</p>
                    </div>
                  ) : (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.trHead}>
                            <th style={styles.th}>Address</th>
                            <th style={styles.th}>Quota</th>
                            <th style={styles.th}>Created</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mailboxes.map(mb => (
                            <tr key={mb.id} style={styles.tr}>
                              <td style={styles.td}>
                                <div style={styles.mailboxAddressText}>{mb.address}</div>
                              </td>
                              <td style={styles.td}>
                                <span>{mb.quota_mb >= 1024 ? `${mb.quota_mb / 1024} GB` : `${mb.quota_mb} MB`}</span>
                              </td>
                              <td style={styles.td}>
                                <span>{new Date(mb.created_at).toLocaleDateString()}</span>
                              </td>
                              <td style={{ ...styles.td, textAlign: 'right' }}>
                                <button 
                                  onClick={() => handleDeleteMailbox(mb.id, mb.address)}
                                  style={styles.deleteActionBtn}
                                >
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
              </div>
            </div>
          )}

          {/* TAB: ALIASES */}
          {activeTab === 'aliases' && (
            <div style={styles.tabContent}>
              <div style={styles.splitContentLayout}>
                {/* Alias Creation */}
                <div style={styles.creationCard}>
                  <h3 style={styles.panelTitle}>Create New Alias</h3>
                  {verifiedDomains.length === 0 ? (
                    <div style={styles.formWarning}>
                      <AlertTriangle size={18} style={{ marginRight: '8px' }} />
                      You must add and verify a custom domain before creating aliases.
                    </div>
                  ) : (
                    <form onSubmit={handleCreateAlias} style={styles.verticalForm}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Alias Incoming Address</label>
                        <div style={styles.emailInputWrapper}>
                          <input
                            type="text"
                            placeholder="sales (or * for catch-all)"
                            value={aliasSource}
                            onChange={(e) => setAliasSource(e.target.value)}
                            style={styles.localPartInput}
                          />
                          <span style={styles.emailAt}>@</span>
                          <select
                            value={aliasDomain}
                            onChange={(e) => setAliasDomain(e.target.value)}
                            style={styles.domainSelect}
                            required
                          >
                            {verifiedDomains.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Forward Destination Email</label>
                        <input
                          type="email"
                          placeholder="owner@gmail.com"
                          value={aliasDestination}
                          onChange={(e) => setAliasDestination(e.target.value)}
                          style={styles.standardInput}
                          required
                        />
                      </div>

                      <button type="submit" disabled={actionLoading} style={styles.createBtn}>
                        Create Alias Redirect
                      </button>
                    </form>
                  )}
                </div>

                {/* Aliases List */}
                <div style={styles.tableCard}>
                  <div style={styles.tableHeaderBar}>
                    <h3 style={styles.panelTitle}>Email Forwarding Aliases</h3>
                  </div>

                  {aliases.length === 0 ? (
                    <div style={styles.emptyState}>
                      <LinkIcon size={40} color="var(--text-muted)" />
                      <p style={{ marginTop: '10px' }}>No mail aliases configured.</p>
                    </div>
                  ) : (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.trHead}>
                            <th style={styles.th}>Alias (Source)</th>
                            <th style={styles.th}>Forward Destination</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aliases.map(al => (
                            <tr key={al.id} style={styles.tr}>
                              <td style={styles.td}>
                                <strong>{al.source ? al.source : '*'}@{al.domain_name}</strong>
                              </td>
                              <td style={styles.td}>
                                <span>{al.destination}</span>
                              </td>
                              <td style={{ ...styles.td, textAlign: 'right' }}>
                                <button 
                                  onClick={() => handleDeleteAlias(al.id)}
                                  style={styles.deleteActionBtn}
                                >
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
              </div>
            </div>
          )}

          {/* TAB: WORKSPACE INFO */}
          {activeTab === 'billing' && (
            <div style={styles.tabContent}>
              <div style={styles.billingHeader}>
                <Building size={48} color="var(--color-primary)" />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '10px' }}>Workspace Information</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Details about your self-hosted mail workspace.</p>
              </div>

              <div style={{
                maxWidth: '600px',
                margin: '0 auto',
                width: '100%',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Company Workspace</h3>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{org?.name}</p>
                </div>
                
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Infrastructure Domain</h3>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>mail.acetechnologys.com</p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Workspace Status</h3>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    color: '#10b981',
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    border: '1px solid'
                  }}>
                    INTERNAL USE ONLY
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    backgroundColor: 'var(--glass-bg)',
    borderBottom: '1px solid var(--glass-border)',
    backdropFilter: 'blur(8px)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  workspaceBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  workspaceName: {
    fontWeight: '700',
    fontSize: '1rem',
  },
  tierBadge: {
    fontSize: '0.7rem',
    fontWeight: '800',
    padding: '0.15rem 0.4rem',
    borderRadius: '12px',
    border: '1px solid',
  },
  proBadge: {
    color: '#fbbf24',
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--color-danger)',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  layout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  nav: {
    width: '240px',
    padding: '1.5rem 1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRight: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  navActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--color-primary-soft)',
    color: 'var(--color-primary)',
    border: '1px solid rgba(26, 115, 232, 0.2)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    fontWeight: '600',
    textAlign: 'left',
    cursor: 'pointer',
  },
  navInactive: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    fontWeight: '500',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'color var(--transition-fast)',
  },
  content: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--color-danger-soft)',
    color: 'var(--color-danger)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(244, 63, 94, 0.2)',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--glass-border)',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  inlineForm: {
    display: 'flex',
    gap: '0.75rem',
  },
  inlineInput: {
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    width: '200px',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  splitPane: {
    display: 'flex',
    flex: 1,
    gap: '1.5rem',
    minHeight: '400px',
  },
  paneList: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    overflowY: 'auto',
  },
  paneDetail: {
    flex: 1,
    padding: '1.5rem',
    backgroundColor: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
  },
  card: {
    padding: '1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  cardActive: {
    padding: '1rem',
    backgroundColor: 'rgba(26, 115, 232, 0.05)',
    border: '1px solid var(--color-primary)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  domainNameTitle: {
    fontWeight: '700',
    fontSize: '0.95rem',
  },
  deleteIconBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    opacity: 0.6,
    ':hover': { opacity: 1 },
  },
  cardMeta: {
    marginTop: '0.5rem',
  },
  statusVerified: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#10b981',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  statusPending: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#fbbf24',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: 'var(--text-muted)',
  },
  selectPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-secondary)',
  },
  detailTitleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid var(--glass-border)',
  },
  verifyBtn: {
    padding: '0.4rem 0.75rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dnsBox: {
    backgroundColor: 'var(--bg-secondary)',
    padding: '1.25rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
  },
  dnsBoxTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    marginBottom: '0.4rem',
  },
  dnsBoxText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.75rem',
  },
  dnsCodeCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    backgroundColor: 'var(--bg-primary)',
    padding: '0.75rem 1rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    border: '1px solid var(--glass-border)',
  },
  code: {
    color: 'var(--color-primary)',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '0.1rem 0.3rem',
    borderRadius: '3px',
  },
  diagnosticSection: {
    marginTop: '1.5rem',
  },
  diagnosticTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
  },
  diagnosticGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  diagnosticRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: '4px',
    fontSize: '0.85rem',
  },
  splitContentLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '2rem',
  },
  creationCard: {
    padding: '1.5rem',
    backgroundColor: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
  },
  tableCard: {
    padding: '1.5rem',
    backgroundColor: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
  },
  panelTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '1rem',
  },
  tableHeaderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  counterText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  formWarning: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--color-primary-soft)',
    color: 'var(--color-primary)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    border: '1px solid rgba(26, 115, 232, 0.1)',
  },
  verticalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  emailInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.15rem',
  },
  localPartInput: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    width: '50px',
  },
  emailAt: {
    padding: '0 0.5rem',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  domainSelect: {
    padding: '0.5rem',
    backgroundColor: 'var(--bg-secondary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
  },
  standardInput: {
    padding: '0.6rem 0.75rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
  },
  standardSelect: {
    padding: '0.6rem 0.75rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  createBtn: {
    padding: '0.75rem',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  trHead: {
    borderBottom: '1px solid var(--glass-border)',
  },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  tr: {
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
  },
  td: {
    padding: '1rem',
    color: 'var(--text-primary)',
  },
  mailboxAddressText: {
    fontWeight: '600',
  },
  deleteActionBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    opacity: 0.6,
    transition: 'color var(--transition-fast)',
    ':hover': { color: 'var(--color-danger)', opacity: 1 },
  },
  billingHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
};
