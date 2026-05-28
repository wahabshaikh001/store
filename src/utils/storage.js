const SESSION_KEY = 'sm_session';
const mem = {};

export function getSession() {
  try {
    const val = sessionStorage.getItem(SESSION_KEY) || mem[SESSION_KEY];
    return val ? JSON.parse(val) : null;
  }
  catch {
    return null;
  }
}

export function setSession(session) {
  const val = session ? JSON.stringify(session) : null;
  if (val) mem[SESSION_KEY] = val;
  else delete mem[SESSION_KEY];

  try {
    if (val) sessionStorage.setItem(SESSION_KEY, val);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore if sessionStorage is disabled
  }
}
