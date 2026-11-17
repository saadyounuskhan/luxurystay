// Removes keys like "$gt" or "a.b" from request body, so nobody can inject MongoDB operators.
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else value[key] = clean(value[key]);
    }
  }
  return value;
}

export function sanitize(req, res, next) {
  if (req.body) clean(req.body);
  next();
}
