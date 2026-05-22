export const HMS_HR_MODULE = {
  slug: 'hms_hr',
  name: 'HMS & HR',
  description: 'Avvikshåndtering, SJA/sjekklister, håndbøker, arbeidstid og AML-overvåking',
  icon: 'Shield',
  compatibleVerticals: ['varmepumpe', 'elektro', 'vvs'],
  isCore: false,
  defaultEnabled: false,
  permissions: ['hms.view', 'hms.manage'],
} as const
