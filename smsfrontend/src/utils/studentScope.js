export function getScopedStudent(data, currentUser, currentRole) {
  const students = data?.students || [];
  if (!students.length) return null;

  if (currentRole === 'PARENT') {
    const selectedId = String(data?.parentDashboard?.selectedChild?.id || '').trim().toLowerCase();
    return students.find((student) => String(student.backendId || '').trim().toLowerCase() === selectedId) || null;
  }

  if (currentRole === 'STUDENT') {
    const currentUserId = String(currentUser?.id || '').trim().toLowerCase();
    return students.find((student) =>
      String(student.backendId || '').trim().toLowerCase() === currentUserId
    ) || students[0];
  }

  return students[0];
}

export function getStudentAttendanceRows(data, student) {
  if (!student) return [];
  return (data?.attendance?.today || []).filter((row) => row.studentId === student.backendId);
}

export function getStudentResults(data, student) {
  if (!student) return [];
  return (data?.results || []).filter((row) => row.studentId === student.backendId);
}

export function getStudentFees(data, student) {
  if (!student) return [];
  return (data?.fees || []).filter((row) => row.studentId === student.backendId);
}
