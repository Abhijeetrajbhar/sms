export function getScopedStudent(data, currentUser, currentRole) {
  const students = data?.students || [];
  if (!students.length) return null;

  const userName = String(currentUser?.name || '').trim().toLowerCase();
  const userId = String(currentUser?.studentCode || currentUser?.studentId || currentUser?.id || '').trim().toLowerCase();

  if (currentRole === 'PARENT') {
    const selectedId = String(data?.parentDashboard?.selectedChild?.id || '').trim().toLowerCase();
    return students.find((student) => String(student.backendId || '').trim().toLowerCase() === selectedId) || null;
  }

  return students.find((student) =>
    String(student.name || '').trim().toLowerCase() === userName
    || String(student.id || '').trim().toLowerCase() === userId
  ) || students[0];
}

export function getStudentAttendanceRows(data, student) {
  if (!student) return [];
  return (data?.attendance?.today || []).filter((row) => row.student === student.name);
}

export function getStudentResults(data, student) {
  if (!student) return [];
  return (data?.results || []).filter((row) => row.student === student.name);
}

export function getStudentFees(data, student) {
  if (!student) return [];
  return (data?.fees || []).filter((row) => row.student === student.name);
}
