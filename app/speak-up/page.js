import { ActionForm } from '@/components/actions';
import { Callout, Card, CardHeader, PageHeader } from '@/components/ui';
import { REPORT_THEMES } from '@/lib/format';
import { requireUser } from '@/lib/session';

export default async function SpeakUpPage() {
  await requireUser(['EMPLOYEE', 'TEAM_LEAD']);
  return (
    <div className="space-y-6">
      <PageHeader level="manager" eyebrow="Protected Speak-Up Link" title="Report pressure, anonymously" description="Report sales pressure at your branch to the audit committee anonymously, without your manager seeing it." />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader icon="megaphone" title="Your report" />
          <ActionForm
            url="/api/speak-up"
            submitLabel="Send report"
            fields={[
              { name: 'theme', label: 'What is it about?', type: 'select', options: Object.entries(REPORT_THEMES).map(([value, label]) => ({ value, label })) },
              { name: 'message', label: 'What is happening?', type: 'textarea', rows: 5, required: true, hint: 'Avoid details that would identify you.' },
            ]}
          />
        </Card>
        <div className="space-y-4">
          <Callout tone="green" icon="lock" title="What is stored">
            Your report text, its theme, your branch and a one-way seal. Your name and login are not stored with the report.
          </Callout>
          <Callout tone="blue" icon="shield" title="How the seal protects you">
            If you are later flagged or dismissed, the seal lets the system alert the audit committee to check for retaliation, without showing your report next to your name.
          </Callout>
        </div>
      </div>
    </div>
  );
}
