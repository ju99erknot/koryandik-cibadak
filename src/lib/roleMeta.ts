export function getOfficialRoleMeta(role: string) {
  const map: Record<string, { label: string; color: string; icon: string }> = {
    admin: { label: 'Administrator', color: '#8b5cf6', icon: 'fa-solid fa-shield-halved' },
    pengawas: { label: 'Pengawas', color: '#3b82f6', icon: 'fa-solid fa-user-tie' },
    kkks: { label: 'KKKS', color: '#f59e0b', icon: 'fa-solid fa-building-columns' },
    pgri: { label: 'PGRI', color: '#10b981', icon: 'fa-solid fa-users' },
  };
  return map[role] || { label: role, color: '#64748b', icon: 'fa-solid fa-user' };
}
