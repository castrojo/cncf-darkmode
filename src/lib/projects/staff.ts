export interface StaffMember {
  handle?: string;
  name: string;
  imageUrl?: string;
  profileUrl?: string;
}

export interface StaffSupportData {
  tab?: StaffMember[];
  maintainers?: StaffMember[];
}

export function selectStaffList(data: StaffSupportData): StaffMember[] {
  if (Array.isArray(data.tab) && data.tab.length > 0) {
    return data.tab;
  }
  if (Array.isArray(data.maintainers)) {
    return data.maintainers;
  }
  return [];
}
