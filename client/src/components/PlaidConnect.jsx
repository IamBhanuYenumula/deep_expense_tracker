// PlaidConnect — "Connect Bank Account" section.
//
// Flow:
//   1. On mount: fetch a link_token from the server + any already-connected accounts.
//   2. User clicks "Connect Bank" → Plaid Link modal opens in the browser.
//   3. User picks their bank and logs in → Plaid calls onSuccess with a public_token.
//   4. We send public_token to our server (/plaid/exchange-token) which stores
//      the access_token permanently and returns a safe account summary.
//   5. Future transactions from this bank arrive automatically via webhooks → SSE.
//
// Props:
//   (none) — this component manages its own data via api.js

import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { createLinkToken, exchangeToken, fetchPlaidAccounts } from '../api';

function PlaidConnect() {
  const [linkToken, setLinkToken]   = useState(null);
  const [accounts,  setAccounts]    = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState(null);
  const [connecting, setConnecting] = useState(false);

  // Fetch existing connected accounts + a fresh link token on mount
  useEffect(() => {
    Promise.all([fetchPlaidAccounts(), createLinkToken()])
      .then(([accountData, tokenData]) => {
        setAccounts(accountData);
        setLinkToken(tokenData.link_token);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Called by Plaid Link after the user successfully connects their bank.
  // publicToken is a one-time code — we immediately send it to our server
  // to exchange for a permanent access_token (which stays server-side only).
  const onSuccess = useCallback(async (publicToken, metadata) => {
    setConnecting(true);
    setError(null);
    try {
      const account = await exchangeToken(publicToken, metadata.institution);
      setAccounts(prev => [...prev, account]);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const onExit = useCallback((err) => {
    if (err) setError(err.display_message || err.error_message || 'Plaid Link exited with an error');
  }, []);

  // usePlaidLink wires up the Plaid Link SDK.
  // `open` launches the modal; `ready` is true once the link_token is loaded.
  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess, onExit });

  return (
    <section className="plaid-section">
      <div className="plaid-header">
        <div>
          <h2>Connected Banks</h2>
          <p className="plaid-subtitle">
            New transactions sync automatically after connecting.
          </p>
        </div>
        <button
          className="plaid-connect-btn"
          onClick={() => open()}
          disabled={!ready || loading || connecting}
        >
          {connecting ? 'Connecting…' : '+ Connect Bank'}
        </button>
      </div>

      {error && (
        <p className="status error" style={{ margin: '0 20px 16px' }}>{error}</p>
      )}

      {loading ? (
        <p className="status">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="status">
          No banks connected. Click "Connect Bank" to link your first account.
        </p>
      ) : (
        <ul className="accounts-list">
          {accounts.map(acc => (
            <li key={acc.id} className="account-item">
              <span className="account-name">{acc.institution_name}</span>
              <span className="account-badge">Connected</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default PlaidConnect;
