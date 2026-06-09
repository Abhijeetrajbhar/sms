import { Megaphone, Plus } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function AnnouncementsPage() {
  const { data, currentRole, addAnnouncement } = useApp();
  const canPublish = ['ADMIN', 'TEACHER'].includes(currentRole);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', content: '', target: currentRole === 'TEACHER' ? 'CLASS' : 'ALL', classId: '', expiresAt: '' });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      await addAnnouncement(form);
      setForm({ title: '', content: '', target: currentRole === 'TEACHER' ? 'CLASS' : 'ALL', classId: '', expiresAt: '' });
      setModalOpen(false);
    } catch (submitError) {
      setError(submitError.message || 'Unable to publish the notice.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Communication"
        title={currentRole === 'TEACHER' ? 'My Notices' : currentRole === 'PARENT' ? 'Parent & Class Notices' : currentRole === 'STUDENT' ? 'Student & Class Notices' : 'Announcements'}
        description={currentRole === 'TEACHER' ? 'View relevant notices and publish class notices only when you are the assigned class teacher.' : currentRole === 'PARENT' ? 'School, parent, and class notices relevant to the selected linked child.' : currentRole === 'STUDENT' ? 'School-wide, student, and class notices relevant to you.' : 'Publish targeted notices for students, parents, teachers, or the whole school.'}
        actionLabel={canPublish ? 'New Notice' : undefined}
        actionIcon={Plus}
        onAction={canPublish ? () => setModalOpen(true) : undefined}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.announcements.map((item) => (
          <Card key={item.id} hover>
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                <Megaphone className="h-5 w-5" />
              </div>
              <Badge tone="amber">{item.audience}</Badge>
            </div>
            <h3 className="mt-5 text-xl font-bold text-on-surface">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-500">{item.content}</p>
            <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-outline-variant/40 pt-4 text-xs font-bold uppercase tracking-normal text-on-surface-variant">
              <span>{item.author}</span>
              <span>{item.date}</span>
            </div>
          </Card>
        ))}
      </div>
      {!data.announcements.length ? <Card><p className="text-sm font-semibold text-on-surface-variant">No relevant notices are available.</p></Card> : null}
      <Modal open={modalOpen} title="Publish Notice" description="Choose the audience and publish a notice across the school portal." onClose={() => setModalOpen(false)}>
        <form className="grid gap-4" onSubmit={submit}>
          <Input placeholder="Notice title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required />
          <textarea
            className="focus-ring min-h-32 w-full resize-y rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface placeholder:text-outline dark:border-white/10 dark:bg-white/10 dark:text-white"
            placeholder="Notice details"
            value={form.content}
            onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))}
            required
          />
          <select
            className="focus-ring h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface dark:border-white/10 dark:bg-white/10 dark:text-white"
            value={form.target}
            onChange={(event) => setForm((value) => ({ ...value, target: event.target.value, classId: event.target.value === 'CLASS' ? value.classId : '' }))}
          >
            {currentRole === 'ADMIN' ? <option value="ALL">Whole school</option> : null}
            {currentRole === 'ADMIN' ? <option value="STUDENTS">Students</option> : null}
            {currentRole === 'ADMIN' ? <option value="TEACHERS">Teachers</option> : null}
            {currentRole === 'ADMIN' ? <option value="PARENTS">Parents</option> : null}
            <option value="CLASS">Specific class</option>
          </select>
          {form.target === 'CLASS' ? (
            <select
              className="focus-ring h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface dark:border-white/10 dark:bg-white/10 dark:text-white"
              value={form.classId}
              onChange={(event) => setForm((value) => ({ ...value, classId: event.target.value }))}
              required
            >
              <option value="">Select class</option>
              {data.classes.filter((item) => currentRole !== 'TEACHER' || item.isClassTeacher).map((item) => <option key={item.id} value={item.id}>Class {item.name}</option>)}
            </select>
          ) : null}
          <Input type="date" value={form.expiresAt} onChange={(event) => setForm((value) => ({ ...value, expiresAt: event.target.value }))} />
          {error ? <p className="rounded-lg bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container dark:bg-red-950/50 dark:text-red-200">{error}</p> : null}
          <Button type="submit" variant="aurora" disabled={isSaving}>{isSaving ? 'Publishing...' : 'Publish Notice'}</Button>
        </form>
      </Modal>
    </div>
  );
}
