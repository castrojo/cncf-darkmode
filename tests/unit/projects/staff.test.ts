import { describe, expect, it } from 'vitest';
import { selectStaffList, type StaffSupportData } from '../../../src/lib/projects/staff';

describe('selectStaffList', () => {
  it('prefers tab entries when present', () => {
    const data: StaffSupportData = {
      tab: [{ name: 'Tab Person', imageUrl: 'https://example.com/tab.jpg' }],
      maintainers: [{ name: 'Maintainer Person', imageUrl: 'https://example.com/maintainer.jpg' }],
    };
    const list = selectStaffList(data);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Tab Person');
  });

  it('falls back to maintainers when tab is missing', () => {
    const data: StaffSupportData = {
      maintainers: [{ name: 'Maintainer Person', imageUrl: 'https://example.com/maintainer.jpg' }],
    };
    const list = selectStaffList(data);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Maintainer Person');
  });

  it('returns empty list when neither source is available', () => {
    expect(selectStaffList({})).toEqual([]);
  });
});
