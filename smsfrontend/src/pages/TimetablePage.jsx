import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../services/api.js';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const emptySlot = { day: 'Monday', startTime: '', endTime: '', assignmentId: '', room: '' };
const emptyTimetable = { name: '', classId: '', academicYear: '' };

function groupSlots(slots = []) {
  return slots.reduce((schedule, slot) => {
    const day = days[slot.dayOfWeek] || 'Monday';
    const period = {
      id: slot.id,
      timetableId: slot.timetableId,
      dayOfWeek: slot.dayOfWeek,
      time: `${slot.startTime}-${slot.endTime}`,
      subject: slot.subject?.name || 'Subject',
      teacher: slot.teacher?.user ? `${slot.teacher.user.firstName} ${slot.teacher.user.lastName}`.trim() : 'Teacher',
      room: slot.room || 'Room TBD',
    };
    return { ...schedule, [day]: [...(schedule[day] || []), period] };
  }, {});
}

export default function TimetablePage() {
  const { data, currentRole } = useApp();
  const canManage = currentRole === 'ADMIN';
  const [timelines, setTimelines] = useState([]);
  const [options, setOptions] = useState({ classes: [], assignments: [] });
  const [selectedId, setSelectedId] = useState('');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [timetableOpen, setTimetableOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(canManage);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptySlot);
  const [timetableForm, setTimetableForm] = useState(emptyTimetable);

  const loadAdminData = useCallback(async () => {
    if (!canManage) return;
    setIsLoading(true);
    setError('');
    try {
      const [timetableResponse, optionsResponse] = await Promise.all([
        api.get('/timetable'),
        api.get('/timetable/management-options'),
      ]);
      const rawTimelines = timetableResponse.data?.data || timetableResponse.data;
      const nextTimelines = Array.isArray(rawTimelines) ? rawTimelines : [];
      setTimelines(nextTimelines);
      setOptions(optionsResponse.data?.data || optionsResponse.data || { classes: [], assignments: [] });
      setSelectedId((current) => nextTimelines.some((item) => item.id === current) ? current : nextTimelines[0]?.id || '');
    } catch (loadError) {
      setError(loadError.message || 'Timetable management data could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const selectedTimetable = timelines.find((item) => item.id === selectedId);
  const schedule = canManage ? groupSlots(selectedTimetable?.slots) : data.timetable;
  const assignmentOptions = useMemo(() => options.assignments.filter((item) => item.classId === selectedTimetable?.classId), [options.assignments, selectedTimetable?.classId]);

  const submitPeriod = async (event) => {
    event.preventDefault();
    const assignment = assignmentOptions.find((item) => item.id === form.assignmentId);
    if (!selectedTimetable || !assignment) return setError('Select an active timetable and assigned teacher-subject combination.');
    setError('');
    setIsSaving(true);
    try {
      await api.post(`/timetable/${selectedTimetable.id}/slots`, {
        classId: selectedTimetable.classId,
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        dayOfWeek: days.indexOf(form.day),
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room,
      });
      setForm(emptySlot);
      setPeriodOpen(false);
      await loadAdminData();
    } catch (submitError) {
      setError(submitError.message || 'Unable to add timetable period.');
    } finally {
      setIsSaving(false);
    }
  };

  const createTimetable = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const response = await api.post('/timetable', timetableForm);
      setTimetableForm(emptyTimetable);
      setTimetableOpen(false);
      await loadAdminData();
      if (response.data?.id) setSelectedId(response.data.id);
    } catch (submitError) {
      setError(submitError.message || 'Unable to create timetable.');
    } finally {
      setIsSaving(false);
    }
  };

  const removePeriod = async (period) => {
    if (!window.confirm(`Remove ${period.subject} at ${period.time}?`)) return;
    setError('');
    try {
      await api.delete(`/timetable/${selectedTimetable.id}/slots/${period.id}`);
      await loadAdminData();
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove timetable period.');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Schedule planning"
        title={currentRole === 'TEACHER' ? 'My Timetable' : currentRole === 'PARENT' ? 'Child Timetable' : currentRole === 'STUDENT' ? 'My Class Timetable' : 'Smart Timetable'}
        description={canManage ? 'Create class timetables and add only valid teacher-subject assignments without schedule conflicts.' : 'Your authorized weekly schedule with teachers, subjects, rooms, and period timings.'}
        actionLabel={canManage && selectedTimetable ? 'Add Period' : undefined}
        actionIcon={Plus}
        onAction={canManage && selectedTimetable ? () => setPeriodOpen(true) : undefined}
      />

      {canManage ? <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="grid flex-1 gap-1.5 text-xs font-bold text-on-surface-variant">Active timetable<select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Select timetable</option>{timelines.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.class?.name} {item.class?.section} / {item.academicYear}</option>)}</select></label>
          <Button className="w-full sm:w-auto" variant="secondary" icon={Plus} onClick={() => setTimetableOpen(true)}>Create Timetable</Button>
        </div>
      </Card> : null}

      {error ? <div role="alert" className="rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">{error}</div> : null}
      {isLoading ? <Card><p className="text-sm font-semibold text-on-surface-variant">Loading timetable...</p></Card> : null}

      {!isLoading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(schedule || {}).map(([day, periods]) => (
          <Card key={day} hover className="p-4">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-on-surface">{day}</h3><CalendarDays className="h-5 w-5 text-oryx-500" /></div>
            <div className="space-y-3">
              {periods.map((period) => <div key={period.id || `${day}-${period.time}-${period.subject}`} className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
                <div className="flex items-start justify-between gap-2"><Badge tone="blue">{period.time}</Badge>{canManage ? <button className="grid min-h-10 min-w-10 place-items-center rounded-lg text-error hover:bg-error-container" onClick={() => removePeriod(period)} aria-label="Remove period"><Trash2 className="h-4 w-4" /></button> : null}</div>
                <p className="mt-3 font-semibold text-on-surface">{period.subject}</p><p className="text-xs font-semibold text-on-surface-variant">{period.teacher}</p><p className="mt-2 text-xs font-semibold text-on-surface-variant">{period.room}</p>
              </div>)}
            </div>
          </Card>
        ))}
      </div> : null}

      {!isLoading && !Object.keys(schedule || {}).length ? <Card><p className="text-sm font-semibold text-on-surface-variant">{canManage ? 'No periods exist for the selected timetable. Create a timetable or add its first period.' : 'No active timetable is available for this account.'}</p></Card> : null}

      <Modal open={periodOpen} title="Add Period" description="Choose an existing active teacher assignment for this class." onClose={() => setPeriodOpen(false)}>
        <form className="grid gap-4" onSubmit={submitPeriod}>
          <select className="focus-ring h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={form.day} onChange={(event) => setForm((value) => ({ ...value, day: event.target.value }))}>{days.map((day) => <option key={day}>{day}</option>)}</select>
          <div className="grid gap-3 sm:grid-cols-2"><Input type="time" value={form.startTime} onChange={(event) => setForm((value) => ({ ...value, startTime: event.target.value }))} required /><Input type="time" value={form.endTime} onChange={(event) => setForm((value) => ({ ...value, endTime: event.target.value }))} required /></div>
          <select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={form.assignmentId} onChange={(event) => setForm((value) => ({ ...value, assignmentId: event.target.value }))} required><option value="">Select subject and teacher</option>{assignmentOptions.map((item) => <option key={item.id} value={item.id}>{item.subject.name} / {item.teacher.user.firstName} {item.teacher.user.lastName}</option>)}</select>
          <Input placeholder="Room" value={form.room} onChange={(event) => setForm((value) => ({ ...value, room: event.target.value }))} />
          <Button type="submit" variant="aurora" disabled={isSaving || !assignmentOptions.length}>{isSaving ? 'Saving...' : 'Save Period'}</Button>
        </form>
      </Modal>

      <Modal open={timetableOpen} title="Create Timetable" description="Create one timetable per class and academic year." onClose={() => setTimetableOpen(false)}>
        <form className="grid gap-4" onSubmit={createTimetable}>
          <Input label="Timetable name" placeholder="Class 10 A weekly timetable" value={timetableForm.name} onChange={(event) => setTimetableForm((value) => ({ ...value, name: event.target.value }))} required />
          <label className="grid gap-1.5 text-xs font-bold text-on-surface-variant">Class<select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={timetableForm.classId} onChange={(event) => { const selectedClass = options.classes.find((item) => item.id === event.target.value); setTimetableForm((value) => ({ ...value, classId: event.target.value, academicYear: selectedClass?.academicYear || '' })); }} required><option value="">Select class</option>{options.classes.map((item) => <option key={item.id} value={item.id}>{item.name} {item.section} / {item.academicYear}</option>)}</select></label>
          <Input label="Academic year" value={timetableForm.academicYear} readOnly required />
          <Button type="submit" variant="aurora" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Timetable'}</Button>
        </form>
      </Modal>
    </div>
  );
}
