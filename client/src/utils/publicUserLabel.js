/** Last two digits of phone only, with a fixed mask (e.g. ••••••57). */
export function maskPhoneLast2(phone) {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (d.length >= 2) return `••••••${d.slice(-2)}`;
  if (d.length === 1) return `••••••${d}`;
  return '••••••';
}

/** How we show another member: nickname if set, otherwise masked phone tail. */
export function publicUserLabel(profile) {
  if (!profile || typeof profile !== 'object') {
    return 'User';
  }
  const nick = String(profile.nickname ?? '').trim();
  if (nick) return nick;
  if (profile.phone != null && String(profile.phone).trim()) {
    return maskPhoneLast2(profile.phone);
  }
  return 'User';
}
