/**
 * Utility function to translate system activity descriptions from English to Azerbaijani.
 * Handles dynamic survey titles, usernames, roles, and formats.
 */
export function translateActivityDescription(desc: string): string {
  if (!desc) return '—';

  // Pattern-based replacements for dynamic system logs
  const patterns: [RegExp, string | ((...args: string[]) => string)][] = [
    // Survey Responses
    [/^Submitted survey response for:\s*(.*)$/i, 'Sorğu cavabı göndərildi: $1'],
    [/^Saved survey response for:\s*(.*)$/i, 'Sorğu cavabı yadda saxlanıldı: $1'],
    [/^Started survey response for:\s*(.*)$/i, 'Sorğu cavabı doldurulmağa başlandı: $1'],
    [/^Viewed survey response for:\s*(.*)$/i, 'Sorğu cavabına baxıldı: $1'],
    [/^Approved survey response for:\s*(.*)$/i, 'Sorğu cavabı təsdiqləndi: $1'],
    [/^Rejected survey response for:\s*(.*)$/i, 'Sorğu cavabı rədd edildi: $1'],
    [/^Deleted survey response for:\s*(.*)$/i, 'Sorğu cavabı silindi: $1'],
    [/^Reopened survey response for:\s*(.*)$/i, 'Sorğu cavabı yenidən açıldı: $1'],

    // Surveys CRUD
    [/^Viewed survey:\s*(.*)$/i, 'Sorğuya baxıldı: $1'],
    [/^Created survey:\s*(.*)$/i, 'Sorğu yaradıldı: $1'],
    [/^Updated survey:\s*(.*)$/i, 'Sorğu yeniləndi: $1'],
    [/^Deleted survey:\s*(.*)$/i, 'Sorğu silindi: $1'],
    [/^Duplicated survey:\s*(.*) → (.*)$/i, 'Sorğu dublikat edildi: $1 → $2'],
    [/^Duplicated survey:\s*(.*)$/i, 'Sorğu dublikat edildi: $1'],
    [/^Published survey:\s*(.*)$/i, 'Sorğu dərc edildi: $1'],
    [/^Closed survey:\s*(.*)$/i, 'Sorğu bağlandı: $1'],
    [/^Archived survey:\s*(.*)$/i, 'Sorğu arxivləndi: $1'],
    [/^Reopened survey:\s*(.*)$/i, 'Sorğu yenidən açıldı: $1'],
    [/^Restored survey:\s*(.*) to (.*)$/i, 'Sorğu bərpa edildi: $1 ($2 statusuna)'],
    [/^Restored survey:\s*(.*)$/i, 'Sorğu bərpa edildi: $1'],
    [/^Paused survey:\s*(.*)$/i, 'Sorğu dayandırıldı: $1'],
    [/^Resumed survey:\s*(.*)$/i, 'Sorğu davam etdirildi: $1'],

    // Users & Authentication
    [/^Viewed user:\s*(.*)$/i, 'İstifadəçiyə baxıldı: $1'],
    [/^Created user:\s*(.*) with role:\s*(.*)$/i, 'İstifadəçi yaradıldı: $1 ($2 rolu ilə)'],
    [/^Created user:\s*(.*)$/i, 'İstifadəçi yaradıldı: $1'],
    [/^Updated user:\s*(.*)$/i, 'İstifadəçi məlumatları yeniləndi: $1'],
    [/^Permanently deleted user:\s*(.*)$/i, 'İstifadəçi birdəfəlik silindi: $1'],
    [/^Soft deleted user:\s*(.*)$/i, 'İstifadəçi müvəqqəti silindi: $1'],
    [/^Restored user:\s*(.*)$/i, 'İstifadəçi bərpa edildi: $1'],
    [/^Reset password for user:\s*(.*)$/i, 'İstifadəçi şifrəsi sıfırlandı: $1'],

    // Lists & General Pages Access
    [/^Accessed surveys list$/i, 'Sorğular siyahısına daxil olundu'],
    [/^Accessed users list$/i, 'İstifadəçilər siyahısına daxil olundu'],
    [/^Accessed user statistics$/i, 'İstifadəçi statistikasına baxıldı'],
    [/^Exported (\d+) users in (\w+) format$/i, '$1 istifadəçi $2 formatında eksport edildi'],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(desc)) {
      if (typeof replacement === 'function') {
        return desc.replace(pattern, replacement);
      }
      return desc.replace(pattern, replacement);
    }
  }

  return desc;
}
