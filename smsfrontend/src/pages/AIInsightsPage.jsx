import { BrainCircuit, RefreshCw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { riskTone } from '../utils/statusStyles.js';

function buildRecordInsights(students) {
  return students
    .filter((student) => student.risk !== 'low' || student.attendance < 85 || student.fees === 'overdue')
    .map((student) => {
      const risk = student.risk || (student.attendance < 70 ? 'high' : 'medium');
      const score = risk === 'high' ? 86 : risk === 'medium' ? 68 : 42;
      return {
        student: student.name,
        risk,
        confidence: score,
        source: 'Record analysis',
        summary: `${student.name} currently has ${student.attendance}% attendance, grade ${student.grade}, fee status ${student.fees}, and risk level ${risk}.`,
        recommendations: [
          ...(student.attendance < 85 ? ['Attendance follow-up'] : []),
          ...(risk === 'high' ? ['Mentor intervention'] : []),
          ...(student.fees === 'overdue' ? ['Fee support review'] : []),
          'Review progress weekly',
        ],
      };
    });
}

export default function AIInsightsPage() {
  const { data, currentRole, generateAIInsights } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const recordInsights = useMemo(() => buildRecordInsights(data.students), [data.students]);
  const insights = data.generatedInsights?.length ? data.generatedInsights : recordInsights;

  const generate = async () => {
    setError('');
    setIsGenerating(true);
    try {
      await generateAIInsights();
    } catch (generateError) {
      setError(generateError.message || 'Unable to generate AI insights.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Predictive layer"
        title="AI Academic Insights"
        description="Generate interventions from current student records and backend AI explanations when the AI provider is configured."
        actionLabel={['ADMIN', 'TEACHER'].includes(currentRole) ? 'Generate Insights' : undefined}
        actionIcon={Sparkles}
        onAction={['ADMIN', 'TEACHER'].includes(currentRole) ? generate : undefined}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={data.generatedInsights?.some((item) => item.source === 'AI provider') ? 'emerald' : 'amber'}>
          {data.generatedInsights?.some((item) => item.source === 'AI provider') ? 'AI provider active' : 'Record analysis'}
        </Badge>
        {isGenerating ? <Badge tone="blue">Generating</Badge> : null}
      </div>
      {error ? <p className="rounded-lg bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container dark:bg-red-950/50 dark:text-red-200">{error}</p> : null}
      {!insights.length ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BrainCircuit className="h-10 w-10 text-primary" />
            <h3 className="mt-4 text-lg font-bold text-on-surface dark:text-white">No risk indicators found</h3>
            <p className="mt-2 max-w-md text-sm text-on-surface-variant dark:text-slate-300">Current student records do not show low attendance, overdue fees, or elevated risk markers.</p>
            {['ADMIN', 'TEACHER'].includes(currentRole) ? <Button className="mt-5" variant="aurora" icon={RefreshCw} onClick={generate} disabled={isGenerating}>Refresh Insights</Button> : null}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {insights.map((item) => (
            <Card key={item.student} hover>
              <div className="flex flex-col gap-4 min-[375px]:flex-row min-[375px]:items-start">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-on-surface dark:text-white">{item.student}</h3>
                    <Badge className={riskTone[item.risk] || riskTone.medium}>{item.risk} risk</Badge>
                    <Badge tone={item.source === 'AI provider' ? 'emerald' : 'amber'}>{item.source}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant dark:text-slate-300">{item.summary}</p>
                </div>
              </div>
              <div className="mt-6 rounded-xl bg-surface-container-low p-4 ring-1 ring-outline-variant/40 dark:bg-white/5 dark:ring-white/10">
                <div className="mb-2 flex justify-between text-sm font-semibold text-on-surface-variant dark:text-slate-300"><span>Risk Score</span><span>{item.confidence ?? 'N/A'}{item.confidence ? '%' : ''}</span></div>
                <ProgressBar value={item.confidence || 0} tone={item.risk === 'high' ? 'rose' : 'violet'} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.recommendations.map((recommendation) => <Badge key={recommendation} tone="blue">{recommendation}</Badge>)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
