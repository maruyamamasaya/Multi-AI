export const shouldGrantWebPermission = (permission: string, isManagedPageView: boolean): boolean =>
  isManagedPageView && permission === 'clipboard-sanitized-write';
