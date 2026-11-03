// Rating lab: five rating formulas on the Week 9 opening props (docs/prd.md section 8). The lab is a
// standalone page in apps/web/public; this section frames it as a Facet setting card.
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Rating lab' };

const OUT = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg>
);

export default function RatingLabPage() {
  return (
    <div className="fc-settings-main">
      <section className="fc-fieldset" aria-labelledby="lab-t">
        <div className="fc-fieldset-content">
          <div className="fc-fieldset-header">
            <div>
              <h1 className="fc-fieldset-title" id="lab-t">Rating lab</h1>
              <p className="fc-fieldset-subtitle">Five rating formulas on the 126 Week 9 opening props. Edge times clarity is the approved rating, gate then safest the board order.</p>
            </div>
            <a className="fc-button" data-variant="secondary" data-size="small" href="/rating-lab.html" target="_blank" rel="noopener">Open in a new tab{OUT}</a>
          </div>
          <iframe className="hg-lab-frame" src="/rating-lab.html" title="Rating lab" loading="lazy" />
        </div>
      </section>
    </div>
  );
}
