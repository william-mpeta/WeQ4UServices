import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

type QuoteAction = 'accept' | 'changes' | 'decline' | 'status';
type QuoteStatus = 'awaiting-decision' | 'accepted' | 'declined' | 'expired' | 'updated';
type QuoteActionDetails = {
  quoteNumber: string;
  requestRef: string;
  action: QuoteAction;
  status: QuoteStatus;
  actionable: boolean;
  totalCents: number | null;
  currency: string;
  validUntil: string | null;
};

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const declineReasons = [
  { value: 'too-expensive', label: 'The price is outside my budget' },
  { value: 'not-ready', label: 'I am not ready to proceed' },
  { value: 'chose-another-provider', label: 'I chose another provider' },
  { value: 'incorrect-details', label: 'Some quote details are incorrect' },
  { value: 'other', label: 'Another reason' },
];

function quoteStatusLabel(status: QuoteStatus) {
  if (status === 'accepted') return 'Accepted';
  if (status === 'declined') return 'Declined';
  if (status === 'expired') return 'Expired';
  if (status === 'updated') return 'No longer current';
  return 'Awaiting your decision';
}

function actionTitle(action: QuoteAction) {
  if (action === 'status') return 'Quote status';
  if (action === 'accept') return 'Accept this quote';
  if (action === 'decline') return 'Decline this quote';
  return 'Request a quote change';
}

function currentStatusMessage(status: QuoteStatus) {
  if (status === 'accepted') return 'Your acceptance has already been recorded. No further action is needed on this link.';
  if (status === 'declined') return 'This quote has already been declined. No work will start under this quote.';
  if (status === 'expired') return 'This quote has expired. Contact WeQ4U if you would like us to review it.';
  if (status === 'updated') return 'This quote has changed or is no longer available for a decision. Please contact WeQ4U for the current details.';
  return 'Review the quote details, then confirm your choice below. Opening this page has not recorded a decision.';
}

export function QuoteDecisionPage() {
  const { quoteNumber = '', action: routeAction = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t') || '';
  const action = routeAction as QuoteAction;
  const validAction = ['accept', 'changes', 'decline', 'status'].includes(routeAction);
  const [details, setDetails] = useState<QuoteActionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [declineDetails, setDeclineDetails] = useState('');
  const [changeRequest, setChangeRequest] = useState('');
  const [completedAction, setCompletedAction] = useState<QuoteAction | null>(null);

  useEffect(() => {
    document.title = `Quote decision | WeQ4UServices`;
    if (!validAction || !token || !quoteNumber) {
      setLoading(false);
      setError('This quote link is incomplete or invalid. Open the link from your quotation or contact WeQ4U.');
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`${apiBase}/quote-decisions/${encodeURIComponent(quoteNumber)}/${action}?t=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'This quote link is unavailable.');
        return data as QuoteActionDetails;
      })
      .then(setDetails)
      .catch((fetchError: unknown) => {
        if (!controller.signal.aborted) setError(fetchError instanceof Error ? fetchError.message : 'The quote link could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [action, quoteNumber, token, validAction]);

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details?.actionable || !validAction || action === 'status') return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/quote-decisions/${encodeURIComponent(quoteNumber)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...(action === 'changes' ? { message: changeRequest } : {}),
          ...(action === 'decline' ? { declineReason, declineDetails } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.status && details) {
          setDetails({ ...details, status: result.status as QuoteStatus, actionable: false });
        }
        throw new Error(result.error || 'Your decision could not be recorded.');
      }
      setDetails({ ...details, status: result.status as QuoteStatus, actionable: false });
      setCompletedAction(action);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Your decision could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  }

  const amount = details?.totalCents === null || details?.totalCents === undefined
    ? 'Not available'
    : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: details.currency || 'ZAR' }).format(details.totalCents / 100);
  const pdfUrl = details && token
    ? `${apiBase}/quote-decisions/${encodeURIComponent(quoteNumber)}/${action}.pdf?t=${encodeURIComponent(token)}`
    : '';

  return <main className="quote-decision-page">
    <div className="quote-decision-shell">
      <p className="eyebrow eyebrow-dark">Secure quote response</p>
      <h1>{loading ? 'Checking your quote…' : actionTitle(action)}</h1>
      {loading && <p role="status">Checking the current quote status. Nothing is recorded by opening this link.</p>}
      {error && <p className="quote-decision-message error" role="alert">{error}</p>}
      {!loading && details && <>
        <div className="quote-decision-summary">
          <div><span>Quote number</span><strong>{details.quoteNumber}</strong></div>
          <div><span>Request reference</span><strong>{details.requestRef}</strong></div>
          <div><span>Quote total</span><strong>{amount}</strong></div>
          {details.validUntil && <div><span>Valid until</span><strong>{new Date(`${details.validUntil}T00:00:00`).toLocaleDateString('en-ZA')}</strong></div>}
          <div><span>Current status</span><strong>{quoteStatusLabel(details.status)}</strong></div>
        </div>
        <p className="quote-decision-explanation">{action === 'status' && details.status === 'awaiting-decision'
          ? 'This is a read-only status link. To make a decision, open Accept, Request changes or Decline in your quotation.'
          : currentStatusMessage(details.status)}</p>
        {completedAction && <p className="quote-decision-message success" role="status">
          {completedAction === 'accept'
            ? 'Your acceptance is recorded. We will contact you about the next step. Payment has not been taken.'
            : completedAction === 'decline'
              ? 'Your decision is recorded. No work will start under this quote.'
              : 'Your change request has been sent to WeQ4U. The previous quote is no longer available for a decision.'}
        </p>}
        {pdfUrl && <div className="quote-decision-download-actions">
          <a className="button button-quiet" href={pdfUrl}>Download quotation PDF</a>
          <button type="button" className="button button-quiet" onClick={() => window.print()}>Print this page</button>
        </div>}
        {details.actionable && action !== 'status' && <form className="quote-decision-form" onSubmit={submitDecision}>
          {action === 'changes' && <label>What would you like changed?
            <textarea required maxLength={500} rows={4} value={changeRequest} onChange={(event) => setChangeRequest(event.target.value)} />
          </label>}
          {action === 'decline' && <>
            <label>Reason for declining
              <select required value={declineReason} onChange={(event) => setDeclineReason(event.target.value)}>
                <option value="">Choose a reason</option>
                {declineReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
              </select>
            </label>
            {declineReason === 'other' && <label>Tell us a little more
              <textarea required maxLength={500} rows={3} value={declineDetails} onChange={(event) => setDeclineDetails(event.target.value)} />
            </label>}
          </>}
          <div className="quote-decision-actions">
            <button type="submit" className={`button ${action === 'accept' ? 'button-amber' : 'button-forest'}`} disabled={submitting}>
              {submitting ? 'Recording…' : action === 'accept' ? 'Confirm acceptance' : action === 'decline' ? 'Confirm decline' : 'Send change request'}
            </button>
            <Link className="button button-quiet" to="/track-request">Cancel</Link>
          </div>
        </form>}
      </>}
      {!loading && !error && !details && <p className="quote-decision-message error">This quote link could not be loaded. Contact WeQ4U for help.</p>}
      <p className="quote-decision-help">Need help? <a href="tel:+27837652453">Call 083 765 2453</a> or <a href="mailto:william.mpeta@gmail.com">email WeQ4U</a>.</p>
      <Link className="quote-decision-home" to="/">Return to WeQ4UServices</Link>
    </div>
  </main>;
}

export function QuoteShortLinkPage() {
  const { quoteNumber = '' } = useParams();
  return <main className="quote-decision-page">
    <div className="quote-decision-shell">
      <p className="eyebrow eyebrow-dark">Quotation reference</p>
      <h1>Open your secure quote link</h1>
      <p>This short address identifies quote <strong>{quoteNumber}</strong>, but it does not contain the private confirmation token. Open the secure action link in your quotation or track your request.</p>
      <Link className="button button-forest" to="/track-request">Go to Track Request</Link>
      <p className="quote-decision-help">Need help? <a href="tel:+27837652453">Call 083 765 2453</a> or <a href="mailto:william.mpeta@gmail.com">email WeQ4U</a>.</p>
    </div>
  </main>;
}
