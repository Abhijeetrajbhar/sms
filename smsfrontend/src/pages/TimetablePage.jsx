import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useApp } from '../context/AppContext.jsx';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const { data, currentRole, addPeriod, removePeriod } = useApp();
  const canManage = currentRole === 'ADMIN';
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ day: 'Monday', startTime: '', endTime: '', subject: '', teacher: '', room: '' });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await addPeriod({
        ...form,
        time: `${form.startTime}-${form.endTime}`,
        dayOfWeek: days.indexOf(form.day) + 1,
      });
      setForm({ day: 'Monday', startTime: '', endTime: '', subject: '', teacher: '', room: '' });
      setModalOpen(false);
    } catch (submitError) {
      setError(submitError.message || 'Unable to add period.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Schedule planning"
        title={currentRole === 'TEACHER' ? 'My Timetable' : currentRole === 'PARENT' ? 'Child Timetable' : currentRole === 'STUDENT' ? 'My Class Timetable' : 'Smart Timetable'}
        description={currentRole === 'TEACHER' ? 'Your assigned teaching periods only, with class, section, subject, time, and room.' : currentRole === 'PARENT' ? 'Weekly class schedule for the selected linked child.' : currentRole === 'STUDENT' ? 'Your assigned class schedule with teachers, subjects, rooms, and period timings.' : 'Weekly class schedule with rooms, teachers, subjects, and period timings.'}
        actionLabel={canManage ? 'Add Period' : undefined}
        actionIcon={Plus}
        onAction={canManage ? () => setModalOpen(true) : undefined}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(data.timetable).map(([day, periods]) => (
          <Card key={day} hover className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-on-surface">{day}</h3>
              <CalendarDays className="h-5 w-5 text-oryx-500" />
            </div>
            <div className="space-y-3">
              {periods.map((period) => (
                <div key={period.id || `${day}-${period.time}-${period.subject}`} className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge tone="blue">{period.time}</Badge>
                    {canManage ? (
                      <button className="grid min-h-10 min-w-10 place-items-center rounded-lg p-1.5 text-error hover:bg-error-container dark:hover:bg-red-950/40" onClick={() => removePeriod(day, period)} aria-label="Remove period">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-3 font-semibold text-on-surface dark:text-white">{period.subject}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">{period.teacher}</p>
                  <p className="mt-2 text-xs font-semibold text-on-surface-variant dark:text-slate-300">{period.room}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {!Object.keys(data.timetable).length ? <Card><p className="text-sm font-semibold text-on-surface-variant">{currentRole === 'STUDENT' ? 'No active timetable is available for your class.' : 'No active timetable is available for the selected child.'}</p></Card> : null}
      <Modal open={modalOpen} title="Add Period" description="Add a period to the weekly timetable." onClose={() => setModalOpen(false)}>
        <form className="grid gap-4" onSubmit={submit}>
          <select
            className="focus-ring h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface dark:border-white/10 dark:bg-white/10 dark:text-white"
            value={form.day}
            onChange={(event) => setForm((value) => ({ ...value, day: event.target.value }))}
          >
            {days.map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="time" value={form.startTime} onChange={(event) => setForm((value) => ({ ...value, startTime: event.target.value }))} required />
            <Input type="time" value={form.endTime} onChange={(event) => setForm((value) => ({ ...value, endTime: event.target.value }))} required />
          </div>
          <Input placeholder="Subject" value={form.subject} onChange={(event) => setForm((value) => ({ ...value, subject: event.target.value }))} required />
          <Input placeholder="Teacher" value={form.teacher} onChange={(event) => setForm((value) => ({ ...value, teacher: event.target.value }))} required />
          <Input placeholder="Room" value={form.room} onChange={(event) => setForm((value) => ({ ...value, room: event.target.value }))} />
          {error ? <p className="rounded-lg bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container dark:bg-red-950/50 dark:text-red-200">{error}</p> : null}
          <Button type="submit" variant="aurora" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Period'}</Button>
        </form>
      </Modal>
    </div>
  );
}
