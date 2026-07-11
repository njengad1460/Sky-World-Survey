export const getAllowedAdminGroups = () => {
  return (import.meta.env.VITE_ADMIN_GROUP_NAMES || 'admin,Admin,Admins')
    .split(',')
    .map(group => group.trim())
    .filter(Boolean);
};

export const getTokenGroups = (session) => {
  const accessGroups = session.tokens?.accessToken?.payload?.['cognito:groups'];
  const idGroups = session.tokens?.idToken?.payload?.['cognito:groups'];
  return accessGroups || idGroups || [];
};

export const isAdminSession = (session) => {
  const allowedGroups = getAllowedAdminGroups();
  const userGroups = getTokenGroups(session);
  return userGroups.some(group => allowedGroups.includes(group));
};
